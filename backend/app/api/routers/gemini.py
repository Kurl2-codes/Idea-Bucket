from fastapi import APIRouter, HTTPException
from app.schemas.gemini import IdeaAnalysisRequest, IdeaAnalysisResponse
from app.services.gemini_service import gemini_service
from app.db.mongodb import get_database

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
    
    # 3. Add URLs to result (need to update Schema or just ensure it's in DB doc)
    result_dict = result.dict() if hasattr(result, 'dict') else result
    result_dict["image_urls"] = image_urls
    
    # 4. Save to MongoDB
    db = await get_database()
    if db is not None:
        await db.ideas.insert_one(result_dict)
        
    return result
