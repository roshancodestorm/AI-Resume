from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String(255), nullable=False, default="My Resume")
    slug = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False)

    # Personal info stored as structured JSON
    personal_info = Column(JSON, nullable=True, default=dict)
    # {
    #   "full_name": "", "email": "", "phone": "", "location": "",
    #   "linkedin": "", "github": "", "website": "", "summary": ""
    # }

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    owner = relationship("User", back_populates="resumes")
    sections = relationship("ResumeSection", back_populates="resume",
                            cascade="all, delete-orphan", order_by="ResumeSection.order_index")
    job_matches = relationship("JobMatch", back_populates="resume", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Resume id={self.id} title={self.title}>"


class ResumeSection(Base):
    __tablename__ = "resume_sections"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)

    section_type = Column(String(50), nullable=False)
    # Types: "experience", "education", "skills", "projects", "certifications", "custom"

    title = Column(String(255), nullable=False)  # Display title e.g. "Work Experience"
    order_index = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)

    # Flexible JSON content for different section types
    content = Column(JSON, nullable=True, default=list)
    # For experience: [{"company": "", "role": "", "start_date": "", "end_date": "", "bullets": []}]
    # For education: [{"school": "", "degree": "", "field": "", "graduation_year": ""}]
    # For skills: [{"category": "", "skills": []}]
    # For projects: [{"name": "", "description": "", "url": "", "technologies": []}]

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationship
    resume = relationship("Resume", back_populates="sections")

    def __repr__(self):
        return f"<ResumeSection id={self.id} type={self.section_type}>"
