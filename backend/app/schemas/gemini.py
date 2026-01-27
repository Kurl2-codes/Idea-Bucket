from pydantic import BaseModel
from typing import List, Optional

class IdeaAnalysisRequest(BaseModel):
    content: str
    image_datas: Optional[List[str]] = []

class IdeaAnalysisResponse(BaseModel):
    title: str
    category: str
    tags: List[str]
