from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from slugify import slugify

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume, ResumeSection
from app.models.job_application import JobApplication
from app.schemas.jobs import (
    JobDiscoveryResponse,
    JobApplicationCreate,
    JobApplicationUpdate,
    JobApplicationResponse,
    TailorResumeRequest,
    TailorResumeResponse,
)
from app.services.job_service import discover_and_rank_jobs
from app.services.ai_service import tailor_resume_content

router = APIRouter(prefix="/jobs", tags=["jobs"])


# ── Job Discovery ─────────────────────────────────────────────────────────────

@router.get("/discover", response_model=JobDiscoveryResponse)
async def discover_jobs(
    resume_id: int = Query(..., description="ID of the resume to match against"),
    role: Optional[str] = Query(None, description="Optional custom target role override"),
    location: Optional[str] = Query(None, description="Optional location filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Discover best matching jobs for the candidate's resume.
    1. Detects target role.
    2. Fetches jobs from public aggregator API and live market pool.
    3. Computes taxonomy match scores, matching skills, and missing skills.
    4. Ranks jobs in descending order of compatibility.
    """
    resume = db.query(Resume).filter(
        Resume.id == resume_id, Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    result = await discover_and_rank_jobs(
        resume=resume,
        role_override=role,
        location_filter=location,
    )
    return result


# ── Auto Tailor Resume ────────────────────────────────────────────────────────

@router.post("/tailor-resume", response_model=TailorResumeResponse)
async def tailor_resume(
    request: TailorResumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new tailored resume version for a target job.
    STRICT TRUTHFULNESS GUARANTEE (Rule 4):
    - AI only rewords and highlights existing skills and experiences.
    - Strictly no hallucinated or unearned skills.
    - Clones base resume, creates tailored sections, and returns the new resume ID.
    """
    base_resume = db.query(Resume).filter(
        Resume.id == request.resume_id, Resume.user_id == current_user.id
    ).first()
    if not base_resume:
        raise HTTPException(status_code=404, detail="Base resume not found")

    tailored_data = await tailor_resume_content(
        resume=base_resume,
        job_description=request.job_description,
        job_title=request.job_title or "",
        company_name=request.company_name or "",
    )

    company_suffix = f" - {request.company_name}" if request.company_name else ""
    role_suffix = f" ({request.job_title})" if request.job_title else " (Tailored)"
    tailored_title = f"{base_resume.title}{company_suffix}{role_suffix}"

    new_resume = Resume(
        user_id=current_user.id,
        title=tailored_title,
        personal_info=tailored_data.get("personal_info", base_resume.personal_info),
        slug=slugify(tailored_title),
        is_public=False,
    )
    db.add(new_resume)
    db.flush()

    # Create tailored sections
    for sec in tailored_data.get("sections", []):
        new_section = ResumeSection(
            resume_id=new_resume.id,
            section_type=sec.get("section_type", "custom"),
            title=sec.get("title", "Section"),
            order_index=sec.get("order_index", 0),
            is_visible=sec.get("is_visible", True),
            content=sec.get("content", []),
        )
        db.add(new_section)

    db.commit()
    db.refresh(new_resume)

    return TailorResumeResponse(
        tailored_resume_id=new_resume.id,
        tailored_resume_title=new_resume.title,
        match_score=tailored_data.get("match_score", 85),
        matching_skills=tailored_data.get("matching_skills", []),
        missing_skills=tailored_data.get("missing_skills", []),
        message="Resume successfully tailored with truthful skill alignment and ATS optimization.",
    )


# ── Job Application Tracker CRUD ──────────────────────────────────────────────

@router.get("/applications", response_model=List[JobApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all tracked job applications for current user."""
    return (
        db.query(JobApplication)
        .filter(JobApplication.user_id == current_user.id)
        .order_by(JobApplication.updated_at.desc())
        .all()
    )


@router.post("/applications", response_model=JobApplicationResponse, status_code=status.HTTP_201_CREATED)
def track_job_application(
    app_in: JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a job to the user's application tracker."""
    applied_time = datetime.now(timezone.utc) if app_in.status == "applied" else None
    app_record = JobApplication(
        user_id=current_user.id,
        resume_id=app_in.resume_id,
        job_title=app_in.job_title,
        company_name=app_in.company_name,
        location=app_in.location,
        apply_url=app_in.apply_url,
        job_description=app_in.job_description,
        match_score=app_in.match_score,
        matching_skills=app_in.matching_skills or [],
        missing_skills=app_in.missing_skills or [],
        status=app_in.status or "saved",
        notes=app_in.notes,
        applied_at=applied_time,
    )
    db.add(app_record)
    db.commit()
    db.refresh(app_record)
    return app_record


@router.patch("/applications/{application_id}", response_model=JobApplicationResponse)
def update_application_status(
    application_id: int,
    app_update: JobApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update job status (saved, applied, interview, offer, rejected) or notes."""
    app_record = (
        db.query(JobApplication)
        .filter(JobApplication.id == application_id, JobApplication.user_id == current_user.id)
        .first()
    )
    if not app_record:
        raise HTTPException(status_code=404, detail="Job application not found")

    if app_update.status is not None:
        app_record.status = app_update.status
        if app_update.status == "applied" and not app_record.applied_at:
            app_record.applied_at = datetime.now(timezone.utc)

    if app_update.notes is not None:
        app_record.notes = app_update.notes

    if app_update.applied_at is not None:
        app_record.applied_at = app_update.applied_at

    db.commit()
    db.refresh(app_record)
    return app_record


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a tracked application."""
    app_record = (
        db.query(JobApplication)
        .filter(JobApplication.id == application_id, JobApplication.user_id == current_user.id)
        .first()
    )
    if not app_record:
        raise HTTPException(status_code=404, detail="Job application not found")

    db.delete(app_record)
    db.commit()
    return None
