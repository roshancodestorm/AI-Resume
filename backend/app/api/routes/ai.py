from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.resume import Resume, ResumeSection
from app.models.job_match import JobMatch
from app.schemas.ai import (
    ImproveSectionRequest,
    JobMatchRequest,
    CoachChatRequest,
    CoachChatResponse,
    CoachApplySectionRequest,
    CoachTTSRequest,
)
from app.schemas.job_match import JobMatchResponse
from app.services.ai_service import (
    improve_section_stream,
    analyze_resume,
    match_job_description,
    generate_elevenlabs_tts,
)
from app.services.coach_service import process_coach_message

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/improve-section")
async def improve_section(
    request: ImproveSectionRequest,
    current_user: User = Depends(get_current_user),
):
    """Stream AI-improved content for a resume section."""

    async def generate():
        async for chunk in improve_section_stream(request.section_type, request.content, request.context):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/analyze/{resume_id}")
async def analyze_resume_endpoint(
    resume_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze a resume with GPT-4 and return scored feedback."""
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    result = await analyze_resume(resume)
    return result


@router.post("/job-match", response_model=JobMatchResponse)
async def job_match(
    request: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Match a resume against a job description and return analysis."""
    resume = db.query(Resume).filter(
        Resume.id == request.resume_id, Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    analysis = await match_job_description(resume, request.job_description)

    job_match_record = JobMatch(
        user_id=current_user.id,
        resume_id=resume.id,
        job_title=request.job_title,
        company_name=request.company_name,
        job_description=request.job_description,
        match_score=analysis.get("match_score"),
        analysis=analysis,
    )
    db.add(job_match_record)
    db.commit()
    db.refresh(job_match_record)

    return JobMatchResponse(
        id=job_match_record.id,
        resume_id=job_match_record.resume_id,
        job_title=job_match_record.job_title,
        company_name=job_match_record.company_name,
        match_score=job_match_record.match_score,
        analysis=job_match_record.analysis,
        created_at=job_match_record.created_at,
    )


@router.get("/job-matches", response_model=list[JobMatchResponse])
def list_job_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all job match results for the current user."""
    matches = (
        db.query(JobMatch)
        .filter(JobMatch.user_id == current_user.id)
        .order_by(JobMatch.created_at.desc())
        .all()
    )
    return matches


@router.post("/coach/chat", response_model=CoachChatResponse)
async def coach_chat(
    request: CoachChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Interact with the AI Career Coach."""
    resume = None
    if request.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == request.resume_id, Resume.user_id == current_user.id
        ).first()

    result = await process_coach_message(
        message=request.message,
        resume=resume,
        conversation_history=request.conversation_history,
        preferred_language=request.preferred_language,
    )
    return result


@router.post("/coach/apply-section")
async def coach_apply_section(
    request: CoachApplySectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Apply a coach-suggested draft section to the resume."""
    resume = db.query(Resume).filter(
        Resume.id == request.resume_id, Resume.user_id == current_user.id
    ).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Check if section already exists
    section = db.query(ResumeSection).filter(
        ResumeSection.resume_id == resume.id,
        ResumeSection.section_type == request.section_type
    ).first()

    if section:
        # Update existing section content
        # If content is a list, we might want to append or merge
        if isinstance(section.content, list) and isinstance(request.content, list):
            section.content = section.content + request.content
        else:
            section.content = request.content
        if request.title:
            section.title = request.title
    else:
        # Create new section
        new_section = ResumeSection(
            resume_id=resume.id,
            section_type=request.section_type,
            title=request.title or request.section_type.capitalize(),
            content=request.content,
            order_index=len(resume.sections)
        )
        db.add(new_section)

    db.commit()
    return {"status": "success", "message": f"Section {request.section_type} updated"}


@router.post("/coach/tts")
async def coach_tts(
    request: CoachTTSRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate high-quality voice for coach replies using ElevenLabs."""
    audio_content = await generate_elevenlabs_tts(request.text)
    if not audio_content:
        raise HTTPException(status_code=500, detail="Failed to generate voice")
    
    return Response(content=audio_content, media_type="audio/mpeg")
