from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from slugify import slugify
import io

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume, ResumeSection
from app.schemas.resume import (
    ResumeCreate, ResumeUpdate, ResumeResponse, ResumeSummary,
    ResumeSectionCreate, ResumeSectionUpdate, ResumeSectionResponse
)
from app.services.pdf_service import generate_pdf

router = APIRouter(prefix="/resumes", tags=["resumes"])


def get_resume_or_404(resume_id: int, user: User, db: Session) -> Resume:
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
    return resume


# ── Resume CRUD ────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ResumeSummary])
def list_resumes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all resumes for the current user."""
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).order_by(Resume.updated_at.desc()).all()
    result = []
    for r in resumes:
        summary = ResumeSummary(
            id=r.id,
            title=r.title,
            is_public=r.is_public,
            created_at=r.created_at,
            updated_at=r.updated_at,
            section_count=len(r.sections),
        )
        result.append(summary)
    return result


@router.post("/", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
def create_resume(
    resume_in: ResumeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new resume with default sections."""
    resume = Resume(
        user_id=current_user.id,
        title=resume_in.title,
        is_public=resume_in.is_public,
        personal_info=resume_in.personal_info or {},
        slug=slugify(resume_in.title),
    )
    db.add(resume)
    db.flush()  # Get ID before adding sections

    # Create default sections
    default_sections = [
        {"section_type": "experience", "title": "Work Experience", "order_index": 0, "content": []},
        {"section_type": "education", "title": "Education", "order_index": 1, "content": []},
        {"section_type": "skills", "title": "Skills", "order_index": 2, "content": []},
        {"section_type": "projects", "title": "Projects", "order_index": 3, "content": []},
    ]
    for s in default_sections:
        section = ResumeSection(resume_id=resume.id, **s)
        db.add(section)

    db.commit()
    db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific resume by ID."""
    return get_resume_or_404(resume_id, current_user, db)


@router.put("/{resume_id}", response_model=ResumeResponse)
def update_resume(
    resume_id: int,
    resume_in: ResumeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update resume metadata and personal info."""
    resume = get_resume_or_404(resume_id, current_user, db)
    if resume_in.title is not None:
        resume.title = resume_in.title
        resume.slug = slugify(resume_in.title)
    if resume_in.is_public is not None:
        resume.is_public = resume_in.is_public
    if resume_in.personal_info is not None:
        resume.personal_info = resume_in.personal_info
    db.commit()
    db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a resume."""
    resume = get_resume_or_404(resume_id, current_user, db)
    db.delete(resume)
    db.commit()


# ── Section CRUD ───────────────────────────────────────────────────────────────

@router.post("/{resume_id}/sections", response_model=ResumeSectionResponse, status_code=201)
def add_section(
    resume_id: int,
    section_in: ResumeSectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_resume_or_404(resume_id, current_user, db)
    section = ResumeSection(resume_id=resume_id, **section_in.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put("/{resume_id}/sections/{section_id}", response_model=ResumeSectionResponse)
def update_section(
    resume_id: int,
    section_id: int,
    section_in: ResumeSectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_resume_or_404(resume_id, current_user, db)
    section = db.query(ResumeSection).filter(
        ResumeSection.id == section_id, ResumeSection.resume_id == resume_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    for field, value in section_in.model_dump(exclude_unset=True).items():
        setattr(section, field, value)

    db.commit()
    db.refresh(section)
    return section


@router.delete("/{resume_id}/sections/{section_id}", status_code=204)
def delete_section(
    resume_id: int,
    section_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_resume_or_404(resume_id, current_user, db)
    section = db.query(ResumeSection).filter(
        ResumeSection.id == section_id, ResumeSection.resume_id == resume_id
    ).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()


# ── PDF Export ─────────────────────────────────────────────────────────────────

@router.get("/{resume_id}/export")
def export_resume_pdf(
    resume_id: int,
    template: str = "modern",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export a resume as PDF. Templates: classic, modern, minimal."""
    resume = get_resume_or_404(resume_id, current_user, db)
    valid_templates = ["classic", "modern", "minimal"]
    if template not in valid_templates:
        raise HTTPException(status_code=400, detail=f"Template must be one of: {valid_templates}")

    pdf_bytes = generate_pdf(resume, template)
    filename = f"{resume.slug or 'resume'}-{template}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
