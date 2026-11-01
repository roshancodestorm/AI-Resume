from typing import Optional, Any
from pydantic import BaseModel
from datetime import datetime


class JobMatchResponse(BaseModel):
    id: int
    resume_id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    match_score: Optional[float] = None
    analysis: Optional[Any] = None
    created_at: datetime

    model_config = {"from_attributes": True}
