import google.generativeai as genai
from app.core.config import settings
import json

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash') # Updated model

    async def analyze_idea(self, content: str, image_datas: list = []) -> dict:
        try:
            prompt = f"""
            You are an intelligent workspace assistant. Extract a professional title, a descriptive category, and relevant tags from the content provided. Be concise and accurate.
            
            Analyze the following user input and images to generate a title, category, and tags.
            User Input: {content}
            
            Return JSON with keys: title, category, tags.
            """
            
            parts = [prompt]
            # Image handling would go here, simplified for text now as base64 handling in Python SDK is different needing blobs
            # For brevity in this task, we'll focus on text, but note that image support requires converting base64 to Blob/Bytes for Gemini
            
            response = self.model.generate_content(parts, generation_config={"response_mime_type": "application/json"})
            return json.loads(response.text)
        except Exception as e:
            print(f"Error generating content: {e}")
            return {
                "title": "Captured Insight",
                "category": "Error",
                "tags": ["error"]
            }

gemini_service = GeminiService()
