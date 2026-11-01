import json
import re
import httpx
from typing import AsyncGenerator, Any, Dict, List
from openai import AsyncOpenAI
import openai
from app.core.config import settings
from app.models.resume import Resume
from app.core.skills_taxonomy import extract_skills_from_text, calculate_match_metrics

SECTION_PROMPTS = {
    "experience": (
        "You are an expert resume writer. Improve the following work experience bullets to be "
        "more impactful, quantified, and ATS-friendly. Use strong action verbs. Return the same "
        "JSON structure with improved content."
    ),
    "education": (
        "You are an expert resume writer. Improve the education section to highlight relevant "
        "achievements, GPA, coursework, and honors. Return the same JSON structure."
    ),
    "skills": (
        "You are an expert resume writer. Organize and improve the skills section. Group skills "
        "logically by category (e.g. Languages, Frameworks, Tools, Cloud). Return the same JSON structure."
    ),
    "summary": (
        "You are an expert resume writer. Rewrite this professional summary to be compelling, "
        "concise (3-4 sentences), and tailored to the candidate's background. Return plain text."
    ),
    "projects": (
        "You are an expert resume writer. Improve the project descriptions to highlight impact, "
        "technologies used, and outcomes. Return the same JSON structure."
    ),
    "certifications": (
        "You are an expert resume writer. Format the certifications section cleanly and add any "
        "relevant details. Return the same JSON structure."
    ),
    "custom": (
        "You are an expert resume writer. Improve this resume section to be more professional, "
        "clear, and impactful. Return the same JSON structure."
    ),
}


def is_openai_configured() -> bool:
    """Check if a valid AI API key is configured (OpenAI or Gemini)."""
    key = settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or ""
    # Keys starting with 'sk-your-' or 'AQ.' are placeholders
    return bool(
        key and 
        not key.startswith("sk-your-") and 
        not key.startswith("AQ.") and 
        len(key) > 20
    )


def get_openai_client() -> AsyncOpenAI:
    # Use Gemini if GEMINI_API_KEY is present or if OPENAI_API_KEY looks like a Gemini key
    if settings.GEMINI_API_KEY or (settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-")):
        return AsyncOpenAI(
            api_key=settings.GEMINI_API_KEY or settings.OPENAI_API_KEY,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_elevenlabs_tts(text: str) -> bytes:
    """Generate high-quality speech using ElevenLabs API."""
    if not settings.ELEVENLABS_API_KEY or settings.ELEVENLABS_API_KEY.startswith("your_"):
        return b""

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": settings.ELEVENLABS_API_KEY
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, headers=headers, timeout=30.0)
        if response.status_code == 200:
            return response.content
        else:
            print(f"ElevenLabs Error: {response.status_code} - {response.text}")
            return b""


def extract_full_resume_text(resume: Resume) -> str:
    """Extract clean, comprehensive text from all resume sections for matching."""
    parts: List[str] = []
    if resume.title:
        parts.append(str(resume.title))
    personal = resume.personal_info or {}
    if isinstance(personal, dict):
        for val in personal.values():
            if isinstance(val, str) and val.strip():
                parts.append(val.strip())

    for section in resume.sections:
        if not section.is_visible:
            continue
        content = section.content
        if isinstance(content, list):
            for item in content:
                if isinstance(item, dict):
                    if "category" in item:
                        parts.append(str(item.get("category", "")))
                    skills = item.get("skills", [])
                    if isinstance(skills, list):
                        parts.extend(str(s) for s in skills if s)

                    for k in ("title", "role", "company", "position", "description", "technologies", "school", "degree", "field"):
                        if item.get(k):
                            val = item[k]
                            if isinstance(val, list):
                                parts.extend(str(v) for v in val if v)
                            else:
                                parts.append(str(val))

                    bullets = item.get("bullets", [])
                    if isinstance(bullets, list):
                        parts.extend(str(b) for b in bullets if b)
                elif isinstance(item, str):
                    parts.append(item)
        elif isinstance(content, str):
            parts.append(content)
        elif isinstance(content, dict):
            for v in content.values():
                if isinstance(v, str):
                    parts.append(v)
                elif isinstance(v, list):
                    parts.extend(str(x) for x in v if isinstance(x, str))

    return " ".join(parts)


def heuristic_analyze_resume(resume: Resume) -> dict:
    """Provide rule-based resume scoring and feedback when OpenAI is unavailable."""
    personal = resume.personal_info or {}
    sections = {s.section_type: s for s in resume.sections if s.is_visible}

    # 1. Personal info score (0-100)
    pi_score = 40
    if personal.get("full_name"):
        pi_score += 15
    if personal.get("email"):
        pi_score += 15
    if personal.get("phone"):
        pi_score += 10
    if personal.get("linkedin") or personal.get("github"):
        pi_score += 10
    if personal.get("summary") and len(str(personal.get("summary", "")).strip()) > 25:
        pi_score += 10
    pi_score = min(pi_score, 100)

    # 2. Experience score (0-100)
    exp_section = sections.get("experience")
    exp_items = exp_section.content if exp_section and isinstance(exp_section.content, list) else []
    exp_score = 45 if exp_items else 20
    bullets_count = 0
    has_metrics = False
    for item in exp_items:
        if isinstance(item, dict):
            bullets = item.get("bullets", [])
            bullets_count += len(bullets)
            for b in bullets:
                if any(char.isdigit() or char == "%" for char in str(b)):
                    has_metrics = True
    if bullets_count >= 3:
        exp_score += 20
    if bullets_count >= 6:
        exp_score += 15
    if has_metrics:
        exp_score += 20
    exp_score = min(exp_score, 100)

    # 3. Education score (0-100)
    edu_section = sections.get("education")
    edu_items = edu_section.content if edu_section and isinstance(edu_section.content, list) else []
    edu_score = 70 if edu_items else 25
    if any(isinstance(item, dict) and (item.get("degree") or item.get("school")) for item in edu_items):
        edu_score += 25
    edu_score = min(edu_score, 100)

    # 4. Skills score (0-100)
    skills_section = sections.get("skills")
    skills_items = skills_section.content if skills_section and isinstance(skills_section.content, list) else []
    total_skills = 0
    for s_cat in skills_items:
        if isinstance(s_cat, dict):
            total_skills += len(s_cat.get("skills", []))
    skills_score = 30
    if total_skills >= 4:
        skills_score += 25
    if total_skills >= 8:
        skills_score += 25
    if len(skills_items) > 1:
        skills_score += 20
    skills_score = min(skills_score, 100)

    # 5. Projects score (0-100)
    proj_section = sections.get("projects")
    proj_items = proj_section.content if proj_section and isinstance(proj_section.content, list) else []
    proj_score = 60 if proj_items else 35
    if len(proj_items) >= 2:
        proj_score += 25
    if any(isinstance(p, dict) and p.get("technologies") for p in proj_items):
        proj_score += 15
    proj_score = min(proj_score, 100)

    overall = round(
        (pi_score * 0.15)
        + (exp_score * 0.35)
        + (edu_score * 0.15)
        + (skills_score * 0.20)
        + (proj_score * 0.15)
    )

    strengths = []
    if personal.get("full_name") and personal.get("email"):
        strengths.append("Clear contact information provided in header.")
    if bullets_count >= 3:
        strengths.append(f"Work experience is supported with {bullets_count} bullet points.")
    if has_metrics:
        strengths.append("Experience section demonstrates quantifiable achievements and numbers.")
    if total_skills >= 6:
        strengths.append(f"Solid technical competencies listed with {total_skills} skills.")
    if proj_items:
        strengths.append("Practical projects included showing real-world technical execution.")
    if not strengths:
        strengths.append("Standard resume structure with clear section categorization.")

    improvements = []
    if not has_metrics:
        improvements.append({
            "section": "experience",
            "issue": "Experience bullets lack quantifiable business impact metrics.",
            "suggestion": "Include specific percentages, team sizes, or metrics (e.g. 'improved performance by 30%')."
        })
    if not personal.get("summary") or len(str(personal.get("summary", "")).strip()) < 25:
        improvements.append({
            "section": "personal_info",
            "issue": "Professional summary is missing or brief.",
            "suggestion": "Add a 3-4 sentence summary highlighting your core strengths, experience level, and career focus."
        })
    if total_skills < 8:
        improvements.append({
            "section": "skills",
            "issue": "Skill list could be expanded for higher ATS keyword coverage.",
            "suggestion": "Group your skills into categories like Languages, Frameworks, Developer Tools, and Cloud Platforms."
        })
    if not proj_items:
        improvements.append({
            "section": "projects",
            "issue": "No projects listed to demonstrate hands-on application.",
            "suggestion": "Add 2-3 notable projects detailing technologies used, architecture, and live links or GitHub repos."
        })

    summary_note = (
        f"Your resume achieves an overall quality score of {overall}/100. "
        + ("Strong foundations across core sections." if overall >= 75 else "Good start, with opportunities to boost ATS readiness and metrics.")
    )
    if not is_openai_configured():
        summary_note += " (Analysis powered by ATS rule engine. Configure OPENAI_API_KEY in backend/.env for deep GPT-4o analysis)."

    return {
        "overall_score": overall,
        "summary": summary_note,
        "section_scores": {
            "personal_info": pi_score,
            "experience": exp_score,
            "education": edu_score,
            "skills": skills_score,
            "projects": proj_score,
        },
        "strengths": strengths,
        "improvements": improvements,
    }


def heuristic_job_match(resume: Resume, job_description: str) -> dict:
    """
    Fair, taxonomy-driven job matching.
    Follows Section 11 & 12 specification:
    - Multi-word phrases preserved ('Machine Learning', 'REST APIs', 'Cloud Computing').
    - Non-skill words ('enthusiastic', 'developer', 'intelligent') eliminated.
    - Zero penalty for non-existent fluff words.
    - Strict list output, never joined into a blob.
    """
    resume_text = extract_full_resume_text(resume)
    score, matching, missing = calculate_match_metrics(resume_text, job_description)

    strengths = []
    if matching:
        strengths.append(f"Demonstrated proficiency in {len(matching)} required technologies: {', '.join(matching[:4])}.")
    if score >= 75:
        strengths.append("High qualification overlap with core technical requirements.")
    else:
        strengths.append("Candidate background provides transferable foundation for this role.")

    gaps = []
    if missing:
        gaps.append(f"Candidate profile currently does not explicitly list: {', '.join(missing[:4])}.")
    else:
        gaps.append("No critical technical skill gaps detected for this role.")

    suggestions = []
    if missing:
        suggestions.append({
            "section": "skills",
            "current": "Current skill list",
            "suggested": f"If you have hands-on experience with {', '.join(missing[:3])}, highlight them in your Skills or Projects section.",
            "reason": "Directly improves ATS ranking and matches recruiter keyword filters."
        })
    if matching:
        suggestions.append({
            "section": "experience",
            "current": "Generic achievement statements",
            "suggested": f"Position your achievements with {', '.join(matching[:3])} prominently in your top bullet points.",
            "reason": "Recruiters and hiring managers prioritize demonstrated experience in their target stack."
        })

    summary = (
        f"Your resume shows a strong {score}% match based on verified technical skills overlap. "
        f"You match {len(matching)} key skill{'s' if len(matching) != 1 else ''} required for this role."
        if score >= 70 else
        f"Your resume matches {score}% of the target role requirements. Adding experience in {len(missing)} missing area{'s' if len(missing) != 1 else ''} will boost your standing."
    )

    return {
        "match_score": score,
        "summary": summary,
        "matching_keywords": matching,
        "missing_keywords": missing,
        "strengths": strengths,
        "gaps": gaps,
        "suggestions": suggestions,
    }


async def improve_section_stream(
    section_type: str, content: Any, context: str = None
) -> AsyncGenerator[str, None]:
    """Stream improved resume section content from GPT-4 with heuristic fallback."""
    if is_openai_configured():
        try:
            client = get_openai_client()
            system_prompt = SECTION_PROMPTS.get(section_type, SECTION_PROMPTS["custom"])
            if context:
                system_prompt += f"\n\nAdditional context about the candidate: {context}"

            user_message = f"Current content:\n{json.dumps(content, indent=2)}"

            stream = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                stream=True,
                temperature=0.7,
                max_tokens=2000,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
            return
        except openai.OpenAIError:
            pass

    # Fallback heuristic enhancement
    if section_type == "summary":
        improved = (
            "Results-driven engineering professional with a proven track record of designing scalable systems. "
            "Skilled in modern full-stack development, distributed architecture, and continuous improvement. "
            "Dedicated to driving measurable business impact and technical excellence."
        )
        yield improved
    else:
        yield json.dumps(content, indent=2)


async def analyze_resume(resume: Resume) -> dict:
    """Analyze a full resume with GPT-4, falling back to heuristic engine if needed."""
    if is_openai_configured():
        try:
            client = get_openai_client()
            resume_data = {
                "personal_info": resume.personal_info,
                "sections": [
                    {
                        "type": s.section_type,
                        "title": s.title,
                        "content": s.content,
                    }
                    for s in resume.sections
                    if s.is_visible
                ],
            }

            system_prompt = """You are an expert resume reviewer and career coach. Analyze the provided resume 
and return a detailed JSON analysis with the following structure:
{
  "overall_score": <0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "section_scores": {
    "personal_info": <0-100>,
    "experience": <0-100>,
    "education": <0-100>,
    "skills": <0-100>,
    "projects": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": [
    {
      "section": "<section name>",
      "issue": "<what's wrong>",
      "suggestion": "<specific actionable fix>"
    }
  ]
}
Be specific, actionable, and constructive. Focus on ATS optimization, impact quantification, 
and professional presentation. Return only valid JSON."""

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Resume to analyze:\n{json.dumps(resume_data, indent=2)}"},
                ],
                temperature=0.3,
                max_tokens=2000,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except openai.OpenAIError:
            pass

    return heuristic_analyze_resume(resume)


async def match_job_description(resume: Resume, job_description: str) -> dict:
    """Match a resume against a job description with GPT-4 and heuristic fallback."""
    # Always compute verified taxonomy metrics as the benchmark
    resume_text = extract_full_resume_text(resume)
    tax_score, tax_matching, tax_missing = calculate_match_metrics(resume_text, job_description)

    if is_openai_configured():
        try:
            client = get_openai_client()
            resume_data = {
                "personal_info": resume.personal_info,
                "sections": [
                    {"type": s.section_type, "title": s.title, "content": s.content}
                    for s in resume.sections
                    if s.is_visible
                ],
            }

            system_prompt = """You are an expert ATS (Applicant Tracking System) specialist and career coach.
Analyze how well the provided resume matches the job description.
CRITICAL EXTRACTION RULES:
1. ONLY extract recognized technical skills, programming languages, frameworks, developer tools, and architectures.
2. DO NOT include generic soft adjectives or non-technical filler words like 'enthusiastic', 'developer', 'intelligent', 'applications', 'team', 'work'.
3. Multi-word technical skills must NOT be split (e.g. output 'Machine Learning', NOT 'Machine' and 'Learning').
4. 'matching_keywords' must be a JSON array of strings containing technical skills present in BOTH the resume and job description.
5. 'missing_keywords' must be a JSON array of strings containing technical skills required by the job that are missing from the resume.
6. Compute a fair match_score (0-100) based strictly on technical competence and qualifications overlap.

Return this exact JSON structure:
{
  "match_score": <0-100>,
  "summary": "<2-3 sentence assessment of the match>",
  "matching_keywords": ["<skill 1>", "<skill 2>", ...],
  "missing_keywords": ["<skill 1>", "<skill 2>", ...],
  "strengths": ["<strength related to this job>", ...],
  "gaps": ["<skill or experience gap>", ...],
  "suggestions": [
    {
      "section": "<section to update>",
      "current": "<current text or description>",
      "suggested": "<specific improved version>",
      "reason": "<why this change helps>"
    }
  ]
}
Return only valid JSON."""

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            f"Job Description:\n{job_description}\n\n"
                            f"Resume:\n{json.dumps(resume_data, indent=2)}"
                        ),
                    },
                ],
                temperature=0.3,
                max_tokens=2500,
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            # Ensure keywords are valid lists and combine with verified taxonomy skills
            mk = data.get("matching_keywords", [])
            if not isinstance(mk, list) or len(mk) == 0:
                data["matching_keywords"] = tax_matching
            else:
                # Merge unique without breaking
                seen = set(k.lower() for k in mk)
                for tm in tax_matching:
                    if tm.lower() not in seen:
                        mk.append(tm)
                data["matching_keywords"] = mk

            miss = data.get("missing_keywords", [])
            if not isinstance(miss, list) or len(miss) == 0:
                data["missing_keywords"] = tax_missing
            else:
                seen = set(k.lower() for k in miss)
                for tm in tax_missing:
                    if tm.lower() not in seen and tm.lower() not in set(k.lower() for k in data["matching_keywords"]):
                        miss.append(tm)
                data["missing_keywords"] = miss

            # Ensure fair score alignment
            if "match_score" not in data or data["match_score"] < 20:
                data["match_score"] = tax_score

            return data
        except openai.OpenAIError:
            pass

    return heuristic_job_match(resume, job_description)


async def tailor_resume_content(
    resume: Resume,
    job_description: str,
    job_title: str = "",
    company_name: str = ""
) -> Dict[str, Any]:
    """
    Tailor resume content to match target role and job description.
    STRICT TRUTHFULNESS GUARANTEE (Rule 4):
    - ONLY reword, emphasize, and re-order existing experiences and skills.
    - NEVER invent skills, tools, frameworks, metrics, or work history the user does not have.
    - Move verified matching skills to prominent position.
    - Reframe summary and bullet points to highlight authentic alignment with the job.
    """
    resume_text = extract_full_resume_text(resume)
    match_score, matching_skills, missing_skills = calculate_match_metrics(resume_text, job_description)

    # Base personal info
    personal = dict(resume.personal_info or {})
    target_role_display = job_title or "Target Role"
    company_display = f" at {company_name}" if company_name else ""

    # Clone sections structure
    tailored_sections: List[Dict[str, Any]] = []

    # Check if OpenAI is available for deep truthful rewording
    if is_openai_configured():
        try:
            client = get_openai_client()
            resume_data = {
                "personal_info": personal,
                "sections": [
                    {
                        "section_type": s.section_type,
                        "title": s.title,
                        "content": s.content,
                        "order_index": s.order_index,
                        "is_visible": s.is_visible,
                    }
                    for s in resume.sections
                ],
            }

            system_prompt = f"""You are an elite executive resume writer. Your mission is to tailor this resume for the role of '{target_role_display}'{company_display}.

STRICT TRUTHFULNESS & ACCURACY MANDATE:
1. ONLY reword, emphasize, and highlight the candidate's ACTUAL existing experiences, skills, and projects.
2. ABSOLUTELY DO NOT invent, hallucinate, or add any new skills, tools, programming languages, degrees, companies, or fake metrics that the candidate did not mention.
3. The candidate DOES NOT possess these missing skills: {json.dumps(missing_skills)}. DO NOT add them to the resume.
4. Highlight the candidate's verified matching skills: {json.dumps(matching_skills)}.
5. Refactor the professional summary to articulate how the candidate's actual background directly solves the needs outlined in the job description.
6. Rephrase existing work experience bullets with strong action verbs to show measurable impact and relevancy to the target responsibilities.
7. Return the exact JSON structure of the resume (personal_info, sections) with updated tailored content."""

            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            f"Target Job Description:\n{job_description}\n\n"
                            f"Original Resume:\n{json.dumps(resume_data, indent=2)}"
                        ),
                    },
                ],
                temperature=0.3,
                max_tokens=3500,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            if "personal_info" in result and "sections" in result:
                return {
                    "personal_info": result["personal_info"],
                    "sections": result["sections"],
                    "match_score": match_score,
                    "matching_skills": matching_skills,
                    "missing_skills": missing_skills,
                }
        except openai.OpenAIError:
            pass

    # Heuristic / deterministic truthful tailoring
    # 1. Tailor Summary: Highlight candidate's actual matching skills
    matching_str = ", ".join(matching_skills[:5]) if matching_skills else "modern software engineering"
    current_summary = personal.get("summary", "")
    if current_summary:
        tailored_summary = (
            f"Versatile professional with demonstrated track record in {matching_str}. "
            f"{current_summary.strip()} Focused on applying proven expertise to deliver scalable "
            f"and high-impact solutions for {target_role_display}{company_display}."
        )
    else:
        tailored_summary = (
            f"Results-oriented engineering specialist experienced in {matching_str}. "
            f"Demonstrated ability in building robust systems, cross-functional collaboration, "
            f"and technical execution. Seeking to contribute core technical strengths as "
            f"{target_role_display}{company_display}."
        )
    personal["summary"] = tailored_summary

    # 2. Tailor Sections (reorder skills so matching ones are prioritized, polish bullets)
    for s in resume.sections:
        section_data = {
            "section_type": s.section_type,
            "title": s.title,
            "order_index": s.order_index,
            "is_visible": s.is_visible,
            "content": s.content,
        }

        if s.section_type == "skills" and isinstance(s.content, list):
            # Prioritize matching skills within each category
            tailored_content = []
            for cat in s.content:
                if isinstance(cat, dict):
                    skills_list = list(cat.get("skills", []))
                    matching_in_cat = [sk for sk in skills_list if sk in matching_skills or any(ms.lower() in sk.lower() for ms in matching_skills)]
                    other_in_cat = [sk for sk in skills_list if sk not in matching_in_cat]
                    tailored_content.append({
                        "id": cat.get("id"),
                        "category": cat.get("category"),
                        "skills": matching_in_cat + other_in_cat,
                    })
                else:
                    tailored_content.append(cat)
            section_data["content"] = tailored_content

        tailored_sections.append(section_data)

    return {
        "personal_info": personal,
        "sections": tailored_sections,
        "match_score": match_score,
        "matching_skills": matching_skills,
        "missing_skills": missing_skills,
    }
