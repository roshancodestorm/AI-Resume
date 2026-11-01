import re
import html
from typing import List, Dict, Any, Optional
import httpx
from app.models.resume import Resume
from app.core.skills_taxonomy import calculate_match_metrics, extract_skills_from_text
from app.services.ai_service import extract_full_resume_text

# Rich curated benchmark jobs for fast matching & fallback
CURATED_TECH_JOBS: List[Dict[str, Any]] = [
    {
        "id": "curated-1",
        "job_title": "Full-Stack Software Engineer",
        "company_name": "Stripe",
        "location": "Remote / San Francisco, CA",
        "source": "Direct Career Board",
        "apply_url": "https://stripe.com/jobs",
        "job_description": """
        We are seeking a Full-Stack Engineer to build reliable financial infrastructure.
        Key Responsibilities:
        - Design and develop scalable full-stack web applications using React, TypeScript, and Node.js.
        - Architect resilient REST APIs and microservices.
        - Work with PostgreSQL, Redis, and message queues for real-time transactions.
        - Containerize services with Docker and deploy to AWS using CI/CD pipelines.
        Requirements:
        - Proficiency in JavaScript, TypeScript, React, Node.js, and SQL.
        - Experience with Git, Docker, System Design, and Unit Testing.
        - Knowledge of Cloud Computing (AWS or GCP) and Tailwind CSS is a plus.
        """
    },
    {
        "id": "curated-2",
        "job_title": "Machine Learning Engineer",
        "company_name": "Databricks",
        "location": "Remote / New York, NY",
        "source": "Direct Career Board",
        "apply_url": "https://databricks.com/company/careers",
        "job_description": """
        Databricks is hiring a Machine Learning Engineer to scale state-of-the-art AI systems.
        Key Responsibilities:
        - Develop and deploy Machine Learning and Deep Learning models for large-scale enterprise workflows.
        - Build pipelines with Python, PyTorch, Scikit-Learn, and Apache Spark.
        - Implement Retrieval-Augmented Generation (RAG) and integrate Large Language Models.
        - Optimize inference latency using Docker, Kubernetes, and FastAPI microservices.
        Requirements:
        - Strong background in Python, Machine Learning, Deep Learning, PyTorch, and SQL.
        - Hands-on experience with Pandas, NumPy, Git, and Docker.
        - Familiarity with LangChain, Vector Databases, and Cloud Computing.
        """
    },
    {
        "id": "curated-3",
        "job_title": "Backend Python / FastAPI Engineer",
        "company_name": "DoorDash",
        "location": "Remote / Seattle, WA",
        "source": "Direct Career Board",
        "apply_url": "https://careers.doordash.com",
        "job_description": """
        Join our core logistics team as a Senior Backend Python Engineer.
        Key Responsibilities:
        - Design high-throughput, low-latency microservices using Python and FastAPI.
        - Maintain relational databases (PostgreSQL) and caching layers (Redis).
        - Implement secure authentication, REST APIs, and event-driven architecture with Apache Kafka.
        - Write robust unit testing and follow Agile / Scrum engineering practices.
        Requirements:
        - Deep proficiency in Python, FastAPI or Django, SQL, PostgreSQL, and Redis.
        - Experience with Docker, Git, CI/CD, and Microservices.
        - Experience with AWS or GCP cloud environments.
        """
    },
    {
        "id": "curated-4",
        "job_title": "Frontend React Developer",
        "company_name": "Vercel",
        "location": "Remote",
        "source": "Direct Career Board",
        "apply_url": "https://vercel.com/careers",
        "job_description": """
        Vercel is looking for a Frontend React Developer passionate about user experience and web performance.
        Key Responsibilities:
        - Build accessible, responsive user interfaces with React, Next.js, and TypeScript.
        - Style modern web applications with Tailwind CSS and CSS3.
        - Integrate with GraphQL and REST APIs.
        - Implement client-side state management (Redux, Zustand) and unit testing (Jest, Cypress).
        Requirements:
        - Expert level in JavaScript, TypeScript, React, Next.js, and HTML5 / CSS3.
        - Strong experience with Tailwind CSS, Git, and WebSockets.
        """
    },
    {
        "id": "curated-5",
        "job_title": "DevOps & Cloud Infrastructure Engineer",
        "company_name": "Cloudflare",
        "location": "Remote / Austin, TX",
        "source": "Direct Career Board",
        "apply_url": "https://cloudflare.com/careers",
        "job_description": """
        We are seeking a DevOps Engineer to manage global cloud infrastructure and CI/CD pipelines.
        Key Responsibilities:
        - Maintain multi-region Kubernetes (K8s) clusters and containerized Docker environments.
        - Automate cloud provisioning via Terraform and Ansible (Infrastructure as Code).
        - Build automated CI/CD pipelines using GitHub Actions and Jenkins.
        - Implement observability, network security, and Linux system administration.
        Requirements:
        - Proficiency in Docker, Kubernetes, Linux, Bash, and Terraform.
        - Strong hands-on knowledge of AWS or GCP, Git, and CI/CD.
        - Scripting in Python or Go.
        """
    },
    {
        "id": "curated-6",
        "job_title": "Data Engineer",
        "company_name": "Snowflake",
        "location": "Remote / San Mateo, CA",
        "source": "Direct Career Board",
        "apply_url": "https://careers.snowflake.com",
        "job_description": """
        Snowflake is seeking a Data Engineer to develop scalable ETL data pipelines.
        Key Responsibilities:
        - Build and manage data ingestion pipelines using Python, SQL, Apache Spark, and Apache Kafka.
        - Design data warehousing schemas and data structures in Snowflake and PostgreSQL.
        - Orchestrate complex workflows with Apache Airflow.
        - Monitor data quality, governance, and business intelligence reporting.
        Requirements:
        - Expertise in SQL, Python, Apache Spark, Data Warehousing, and Data Structures.
        - Familiarity with Airflow, Docker, Git, and Cloud Computing.
        """
    }
]


def clean_html(text: str) -> str:
    """Strip HTML tags and unescape entities for clean text analysis."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = html.unescape(clean)
    return " ".join(clean.split())


def detect_target_role(resume: Resume) -> str:
    """
    Detect the most appropriate target role from the candidate's resume.
    1. Checks resume title.
    2. Checks experience section for recent job title.
    3. Infers from extracted technical skills.
    """
    title = (resume.title or "").strip()
    if title and title.lower() not in {"my resume", "untitled", "resume", "cv", "default"}:
        return title

    # Check experience titles
    for s in resume.sections:
        if s.section_type == "experience" and isinstance(s.content, list):
            for item in s.content:
                if isinstance(item, dict):
                    pos = item.get("title") or item.get("role") or item.get("position")
                    if pos and len(str(pos).strip()) > 3:
                        return str(pos).strip()

    # Infer from skills
    resume_text = extract_full_resume_text(resume)
    skills = set(extract_skills_from_text(resume_text))

    if {"PyTorch", "TensorFlow", "Machine Learning", "Deep Learning"} & skills:
        return "Machine Learning Engineer"
    if {"React", "Next.js", "TypeScript", "Tailwind CSS"} & skills and not ({"FastAPI", "Django", "PostgreSQL"} & skills):
        return "Frontend React Developer"
    if {"FastAPI", "Django", "Flask", "Python", "PostgreSQL"} & skills and not ({"React", "Vue"} & skills):
        return "Backend Python Engineer"
    if {"Kubernetes", "Docker", "Terraform", "CI/CD"} & skills:
        return "DevOps Engineer"
    if {"Apache Spark", "Apache Kafka", "Airflow", "Snowflake"} & skills:
        return "Data Engineer"
    if {"React", "Node.js", "JavaScript", "TypeScript", "SQL"} & skills:
        return "Full-Stack Software Engineer"

    return "Software Engineer"


async def fetch_muse_jobs(role_query: str = "") -> List[Dict[str, Any]]:
    """
    Fetch live public jobs from The Muse API.
    100% legal, open public job board without scraping or bot ban risk.
    """
    jobs: List[Dict[str, Any]] = []
    try:
        url = "https://www.themuse.com/api/public/jobs"
        params = {"category": "Software Engineering", "page": 1}
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                for item in results:
                    job_name = item.get("name", "Software Engineer")
                    company = item.get("company", {}).get("name", "Tech Company")
                    landing_page = item.get("refs", {}).get("landing_page") or "https://www.themuse.com"
                    locs = [loc.get("name") for loc in item.get("locations", []) if loc.get("name")]
                    location_str = ", ".join(locs) if locs else "Remote / Flexible"
                    raw_desc = item.get("contents", "")
                    clean_desc = clean_html(raw_desc) or f"Open position for {job_name} at {company}."

                    jobs.append({
                        "id": f"muse-{item.get('id', '')}",
                        "job_title": job_name,
                        "company_name": company,
                        "location": location_str,
                        "source": "The Muse (Public API)",
                        "apply_url": landing_page,
                        "job_description": clean_desc,
                    })
    except Exception:
        # Fallback cleanly on network timeout or failure
        pass
    return jobs


async def discover_and_rank_jobs(
    resume: Resume,
    role_override: Optional[str] = None,
    location_filter: Optional[str] = None,
    limit: int = 15,
) -> Dict[str, Any]:
    """
    Core Job Discovery Flow:
    1. Detect target role from resume.
    2. Fetch jobs from public aggregators + curated live market opportunities.
    3. Analyze each job description against resume using taxonomy matching.
    4. Compute match score, matching skills, missing skills.
    5. Rank descending by match score.
    """
    target_role = (role_override or "").strip() or detect_target_role(resume)
    resume_text = extract_full_resume_text(resume)

    # 1. Fetch live jobs from The Muse public API
    live_jobs = await fetch_muse_jobs(target_role)

    # 2. Combine with curated opportunities
    pool: List[Dict[str, Any]] = []
    # Add curated jobs first so key roles (ML, Full Stack, Backend, Frontend) are represented
    pool.extend(CURATED_TECH_JOBS)
    pool.extend(live_jobs)

    # Filter by search query if specified
    if target_role and target_role.lower() not in {"software engineer", "developer", "engineer"}:
        role_words = [w.lower() for w in target_role.split() if len(w) > 2]
        filtered_pool = []
        for j in pool:
            title_lower = j["job_title"].lower()
            desc_lower = j["job_description"].lower()
            if any(rw in title_lower or rw in desc_lower for rw in role_words):
                filtered_pool.append(j)
        if filtered_pool:
            pool = filtered_pool

    # 3. Analyze each job with taxonomy metrics
    ranked_jobs: List[Dict[str, Any]] = []
    seen_keys = set()

    for job in pool:
        dedup_key = f"{job['company_name'].lower()}--{job['job_title'].lower()}"
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        score, matching, missing = calculate_match_metrics(resume_text, job["job_description"])

        ranked_jobs.append({
            "id": job["id"],
            "job_title": job["job_title"],
            "company_name": job["company_name"],
            "location": job.get("location", "Flexible / Remote"),
            "source": job.get("source", "Job Board"),
            "apply_url": job["apply_url"],
            "job_description": job["job_description"],
            "match_score": score,
            "matching_skills": matching,
            "missing_skills": missing,
        })

    # 4. Sort descending by match_score
    ranked_jobs.sort(key=lambda j: j["match_score"], reverse=True)

    return {
        "detected_role": target_role,
        "total_found": len(ranked_jobs),
        "jobs": ranked_jobs[:limit],
    }
