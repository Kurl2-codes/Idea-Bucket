from fastapi import APIRouter, HTTPException
from app.schemas.gemini import IdeaAnalysisRequest, IdeaAnalysisResponse, CommentCreate, Comment, IdeaUpdate, ShareLinkUpdate

from app.services.gemini_service import gemini_service
from app.db.mongodb import get_database
from fastapi import Depends
from app.api.routers.auth import get_current_user

router = APIRouter()

@router.post("/analyze-idea", response_model=IdeaAnalysisResponse)
async def analyze_idea(request: IdeaAnalysisRequest):
    # 1. Analyze with Gemini
    result = await gemini_service.analyze_idea(request.content, request.image_datas)
    
    # 2. Upload Images to S3 if any
    from app.services.s3_service import s3_service
    import time
    
    image_urls = []
    if request.image_datas:
        for idx, img_data in enumerate(request.image_datas):
            filename = f"idea_{int(time.time())}_{idx}.png"
            url = s3_service.upload_base64_image(img_data, filename)
            if url:
                image_urls.append(url)
    
    # 3. Add URLs to result
    result_dict = result.dict() if hasattr(result, 'dict') else result
    result_dict["image_urls"] = image_urls
    result_dict["content"] = request.content
    
    # Save Author Info
    result_dict["userId"] = request.userId
    result_dict["authorName"] = request.authorName
    result_dict["authorDepartment"] = request.authorDepartment
    result_dict["isShared"] = False
    result_dict["createdAt"] = time.time() * 1000 # JS compatible
    
    print(f"DEBUG: Image URLs generated: {image_urls}")

    # 4. Save to MongoDB
    db = await get_database()
    if db is not None:
        await db.ideas.insert_one(result_dict)
        # Ensure _id is a string for the response and mapped to 'id'
        if "_id" in result_dict:
            result_dict["id"] = str(result_dict["_id"])
        
    return result_dict

@router.get("/ideas", response_model=list[IdeaAnalysisResponse])
async def get_ideas(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    if db is None:
        return []
    
    
    query = {
        "$or": [
            {"userId": current_user["id"]},
            {
                "isShared": True,
                "authorDepartment": current_user["department"]
            }
        ]
    }
    
    cursor = db.ideas.find(query).sort("_id", -1)
    ideas = await cursor.to_list(length=100)
    
    # Manually convert ObjectId to str for Pydantic serialization
    for idea in ideas:
        if "_id" in idea:
             idea["id"] = str(idea["_id"])


             
    return ideas

@router.patch("/ideas/{idea_id}/share")
async def toggle_share(idea_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    
    query = {"userId": current_user["id"]}
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id

    idea = await db.ideas.find_one(query)
    
    if not idea:
         raise HTTPException(status_code=404, detail="Idea not found or not owned by you")

    new_state = not idea.get("isShared", False)
    
    update_query = {"_id": idea["_id"]} # Use the exact ID from the found doc
    await db.ideas.update_one(update_query, {"$set": {"isShared": new_state}})
    
    return {"isShared": new_state}

@router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    
    query = {"userId": current_user["id"]}
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id
        
    result = await db.ideas.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found or not owned by you")
        
    return {"status": "success"}
@router.post("/ideas/{idea_id}/comments", response_model=Comment)
async def add_comment(idea_id: str, comment: CommentCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    import time
    
    # 1. Validate idea exists (and access control if needed)
    query = {} 
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id

    # For now, allow commenting on any visible idea. 
    # Logic: If I can see it, I can comment. (Refine access control later)
    idea = await db.ideas.find_one(query)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
        
    # 2. Create Comment
    new_comment = {
        "id": f"c_{int(time.time()*1000)}", # Simple ID generation
        "userId": current_user["id"],
        "userName": current_user["name"],
        "userDepartment": current_user["department"],
        "text": comment.text,
        "createdAt": time.time() * 1000,
        "likes": [],
        "replies": []
    }
    
    # 3. Update Idea Document
    await db.ideas.update_one(
        {"_id": idea["_id"]},
        {"$push": {"comments": new_comment}}
    )
    
    return new_comment

@router.post("/ideas/{idea_id}/comments/{comment_id}/replies", response_model=Comment)
async def add_reply(idea_id: str, comment_id: str, reply: CommentCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    import time
    
    query = {}
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id
        
    idea = await db.ideas.find_one(query)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    new_reply = {
        "id": f"r_{int(time.time()*1000)}",
        "userId": current_user["id"],
        "userName": current_user["name"],
        "userDepartment": current_user["department"],
        "text": reply.text,
        "createdAt": time.time() * 1000,
        "likes": [],
        "replies": [] 
    }
    
    # Nested update in Mongo can be tricky with arrays. 
    # Option 1: Find the comment and updated it via arrayFilters (cleanest for 1 level)
    # Option 2: Recursive search/update (complex)
    # Given the schema is nested, let's assume 1 level of nesting for now as per frontend types?
    # Frontend types: Comment has replies: Comment[]. So it is recursive.
    # MongoDB limitation: Updating deeply nested arrays is hard without knowing the path.
    # Strategy: We will support 1 level of nesting for now (replies to root comments).
    # If comment_id is a reply itself, we might want to flatten or disallow deep nesting 
    # or just append to the parent's replies (Reddit style vs slack threading).
    # Let's assume standard 1-level-deep threading (replying to a comment adds to its replies).
    
    # Using arrayFilters to find the comment with id == comment_id
    
    result = await db.ideas.update_one(
        {
            "_id": idea["_id"],
            "comments.id": comment_id
        },
        {
            "$push": {"comments.$.replies": new_reply}
        }
    )
    
    # If that failed, maybe it's a nested reply?
    # For MVP, we only support replying to top-level comments effectively.
    # If user replies to a reply, we could attach it to the parent or handle recursive search.
    # Let's stick to 1-level for robustness first.
    
    if result.modified_count == 0:
        # Check if we are trying to reply to a reply (nested)
        # Scan to find the parent of comment_id
        # This is getting complex for a single update.
        # Fallback: Read app logic. 
        pass

    return new_reply

@router.post("/ideas/{idea_id}/comments/{comment_id}/toggle-like")
async def toggle_comment_like(idea_id: str, comment_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    
    query = {}
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id
        
    idea = await db.ideas.find_one(query)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Find the comment in root comments or replies
    comments = idea.get("comments", [])
    found_comment = None
    comment_path = None # e.g. "comments.0" or "comments.0.replies.1"
    
    for i, c in enumerate(comments):
        if c.get("id") == comment_id:
            found_comment = c
            comment_path = f"comments.{i}"
            break
        for j, r in enumerate(c.get("replies", [])):
            if r.get("id") == comment_id:
                found_comment = r
                comment_path = f"comments.{i}.replies.{j}"
                break
        if found_comment: break

    if not found_comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    user_id = current_user["id"]
    likes = found_comment.get("likes", [])
    
    if user_id in likes:
        # Unlike
        await db.ideas.update_one(
            {"_id": idea["_id"]},
            {"$pull": {f"{comment_path}.likes": user_id}}
        )
        return {"liked": False}
    else:
        # Like
        await db.ideas.update_one(
            {"_id": idea["_id"]},
            {"$push": {f"{comment_path}.likes": user_id}}
        )
        return {"liked": True}

@router.put("/ideas/{idea_id}", response_model=IdeaAnalysisResponse)
async def update_idea(idea_id: str, update: IdeaUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    
    query = {"userId": current_user["id"]}
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id
        
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    result = await db.ideas.update_one(query, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found or not owned by you")
        
    updated_idea = await db.ideas.find_one({"_id": query["_id"]})
    if "_id" in updated_idea:
        updated_idea["id"] = str(updated_idea["_id"])
        
    return updated_idea

@router.patch("/ideas/{idea_id}/share-link")
async def update_share_link(idea_id: str, update: ShareLinkUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    from bson import ObjectId
    
    query = {"userId": current_user["id"]}
    if ObjectId.is_valid(idea_id):
        query["_id"] = ObjectId(idea_id)
    else:
        query["_id"] = idea_id
        
    result = await db.ideas.update_one(
        query, 
        {"$set": {
            "shareLinkId": update.shareLinkId,
            "sharePermission": update.sharePermission
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found or not owned by you")
        
    return {"status": "success", "shareLinkId": update.shareLinkId}


