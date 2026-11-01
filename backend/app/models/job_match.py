from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base


class JobMatch(Base):
    __tablename__ = "job_matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)

    job_title = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    job_description = Column(Text, nullable=False)

    # AI-generated match results
    match_score = Column(Float, nullable=True)  # 0-100
    analysis = Column(JSON, nullable=True)
    # {
    #   "match_score": 75,
    #   "summary": "...",
    #   "matching_keywords": [],
    #   "missing_keywords": [],
    #   "strengths": [],
    #   "gaps": [],
    #   "suggestions": [{"section": "", "current": "", "suggested": "", "reason": ""}]
    # }

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="job_matches")
    resume = relationship("Resume", back_populates="job_matches")

    def __repr__(self):
        return f"<JobMatch id={self.id} score={self.match_score}>"
