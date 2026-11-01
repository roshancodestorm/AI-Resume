from typing import Optional, Any, List
from pydantic import BaseModel
from datetime import datetime


class ResumeSectionBase(BaseModel):
    section_type: str
    title: str
    order_index: int = 0
    is_visible: bool = True
    content: Optional[Any] = None


class ResumeSectionCreate(ResumeSectionBase):
    pass


class ResumeSectionUpdate(BaseModel):
    title: Optional[str] = None
    order_index: Optional[int] = None
    is_visible: Optional[bool] = None
    content: Optional[Any] = None


class ResumeSectionResponse(ResumeSectionBase):
    id: int
    resume_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeBase(BaseModel):
    title: str = "My Resume"
    is_public: bool = False
    personal_info: Optional[dict] = None


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    is_public: Optional[bool] = None
    personal_info: Optional[dict] = None


class ResumeResponse(ResumeBase):
    id: int
    user_id: int
    slug: Optional[str] = None
    sections: List[ResumeSectionResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResumeSummary(BaseModel):
    id: int
    title: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    section_count: int = 0

    model_config = {"from_attributes": True}
