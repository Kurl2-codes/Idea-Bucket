import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Get mongo URL from env or default
MONGO_URL = os.getenv("MONGODB_URL", "mongodb://127.0.0.1:27017")
DB_NAME = "mindcanvas_new_db"

async def main():
    print(f"Connecting to {MONGO_URL}, DB: {DB_NAME}")
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print("\n--- Users ---")
        async for user in db.users.find():
            print(f"ID: {user.get('_id')}, Email: {user.get('email')}, Name: {user.get('name')}")

        print("\n--- Ideas ---")
        count = 0
        async for idea in db.ideas.find():
            count += 1
            _id = idea.get('_id')
            user_id = idea.get('userId')
            print(f"ID: {_id} (Type: {type(_id)}), UserId: {user_id}, Title: {idea.get('title')}, Shared: {idea.get('isShared')}")
            comments = idea.get('comments', [])
            if comments:
                print(f"  - Comments: {len(comments)}")
                for c in comments:
                    print(f"    * {c.get('userName')}: {c.get('text')} (Replies: {len(c.get('replies', []))})")
        
        if count == 0:
            print("No ideas found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
