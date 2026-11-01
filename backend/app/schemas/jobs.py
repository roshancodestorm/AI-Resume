from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class DiscoveredJob(BaseModel):
    id: str
    job_title: str
    company_name: str
    location: str
    source: str
    apply_url: str
    job_description: str
    match_score: int
    matching_skills: List[str]
    missing_skills: List[str]


class JobDiscoveryResponse(BaseModel):
    detected_role: str
    total_found: int
    jobs: List[DiscoveredJob]


class JobApplicationCreate(BaseModel):
    resume_id: Optional[int] = None
    job_title: str
    company_name: str
    location: Optional[str] = None
    apply_url: Optional[str] = None
    job_description: Optional[str] = None
    match_score: Optional[float] = None
    matching_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    status: Optional[str] = "saved"  # saved, applied, interview, offer, rejected
    notes: Optional[str] = None


class JobApplicationUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None


class JobApplicationResponse(BaseModel):
    id: int
    user_id: int
    resume_id: Optional[int] = None
    job_title: str
    company_name: str
    location: Optional[str] = None
    apply_url: Optional[str] = None
    job_description: Optional[str] = None
    match_score: Optional[float] = None
    matching_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    status: str
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TailorResumeRequest(BaseModel):
    resume_id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    job_description: str


class TailorResumeResponse(BaseModel):
    tailored_resume_id: int
    tailored_resume_title: str
    match_score: int
    matching_skills: List[str]
    missing_skills: List[str]
    message: str
