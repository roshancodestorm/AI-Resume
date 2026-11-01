from typing import Optional, List, Any, Dict
from pydantic import BaseModel


class ImproveSectionRequest(BaseModel):
    section_type: str  # experience, education, skills, summary, projects
    content: Any
    context: Optional[str] = None  # Extra context like job title, industry


class ImproveSectionResponse(BaseModel):
    improved_content: Any
    explanation: Optional[str] = None


class AnalyzeResumeResponse(BaseModel):
    overall_score: int  # 0-100
    summary: str
    section_scores: dict  # {"experience": 80, "education": 70, ...}
    strengths: List[str]
    improvements: List[dict]  # [{"section": "", "issue": "", "suggestion": ""}]


class JobMatchRequest(BaseModel):
    resume_id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    job_description: str


class JobMatchResponse(BaseModel):
    id: int
    match_score: float
    summary: str
    matching_keywords: List[str]
    missing_keywords: List[str]
    strengths: List[str]
    gaps: List[str]
    suggestions: List[dict]


class CoachChatRequest(BaseModel):
    message: str
    resume_id: Optional[int] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    preferred_language: Optional[str] = "auto"


class CoachChatResponse(BaseModel):
    reply: str
    voice_reply: Optional[str] = None
    suggested_roles: Optional[List[str]] = None
    draft_section: Optional[Dict[str, Any]] = None
    action: Optional[str] = "none"


class CoachApplySectionRequest(BaseModel):
    resume_id: int
    section_type: str
    title: Optional[str] = None
    content: Any


class CoachTTSRequest(BaseModel):
    text: str
