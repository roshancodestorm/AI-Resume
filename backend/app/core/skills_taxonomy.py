import re
from typing import List, Set, Tuple

# Comprehensive canonical taxonomy of technical skills, frameworks, tools, and methodologies.
# ORDER MATTERS: Longer multi-word phrases (trigrams & bigrams) MUST come before single words
# to prevent breaking phrases (e.g. 'machine learning' matching before 'machine' or 'learning').
CANONICAL_SKILLS: List[Tuple[str, str]] = [
    # ── 3-Word & 4-Word Phrases ───────────────────────────────────────────────
    ("natural language processing", "Natural Language Processing"),
    ("large language models", "Large Language Models"),
    ("large language model", "Large Language Models"),
    ("retrieval augmented generation", "RAG"),
    ("retrieval-augmented generation", "RAG"),
    ("test driven development", "TDD"),
    ("test-driven development", "TDD"),
    ("object oriented programming", "OOP"),
    ("object-oriented programming", "OOP"),
    ("google cloud platform", "Google Cloud"),
    ("amazon web services", "AWS"),
    ("continuous integration continuous deployment", "CI/CD"),
    ("continuous integration and continuous deployment", "CI/CD"),
    ("continuous integration", "CI/CD"),
    ("continuous deployment", "CI/CD"),
    ("event driven architecture", "Event-Driven Architecture"),
    ("event-driven architecture", "Event-Driven Architecture"),
    ("infrastructure as code", "Infrastructure as Code"),
    ("full stack development", "Full-Stack Development"),
    ("full-stack development", "Full-Stack Development"),
    ("frontend development", "Frontend Development"),
    ("front end development", "Frontend Development"),
    ("backend development", "Backend Development"),
    ("back end development", "Backend Development"),
    ("database management system", "DBMS"),

    # ── 2-Word Phrases (Bigrams) ──────────────────────────────────────────────
    ("machine learning", "Machine Learning"),
    ("deep learning", "Deep Learning"),
    ("computer vision", "Computer Vision"),
    ("data science", "Data Science"),
    ("data engineering", "Data Engineering"),
    ("data analytics", "Data Analytics"),
    ("data structures", "Data Structures"),
    ("data warehousing", "Data Warehousing"),
    ("artificial intelligence", "Artificial Intelligence"),
    ("generative ai", "Generative AI"),
    ("gen ai", "Generative AI"),
    ("reinforcement learning", "Reinforcement Learning"),
    ("prompt engineering", "Prompt Engineering"),
    ("system design", "System Design"),
    ("distributed systems", "Distributed Systems"),
    ("microservices architecture", "Microservices"),
    ("cloud computing", "Cloud Computing"),
    ("unit testing", "Unit Testing"),
    ("integration testing", "Integration Testing"),
    ("end-to-end testing", "E2E Testing"),
    ("penetration testing", "Penetration Testing"),
    ("cyber security", "Cybersecurity"),
    ("cybersecurity", "Cybersecurity"),
    ("network security", "Network Security"),
    ("relational database", "Relational Databases"),
    ("relational databases", "Relational Databases"),
    ("vector database", "Vector Databases"),
    ("vector databases", "Vector Databases"),
    ("version control", "Version Control"),
    ("agile methodology", "Agile"),
    ("scrum master", "Scrum"),
    ("spring boot", "Spring Boot"),
    ("ruby on rails", "Ruby on Rails"),
    ("react native", "React Native"),
    ("vue.js", "Vue.js"),
    ("next.js", "Next.js"),
    ("nuxt.js", "Nuxt.js"),
    ("node.js", "Node.js"),
    ("express.js", "Express.js"),
    ("nest.js", "NestJS"),
    ("nestjs", "NestJS"),
    ("tailwind css", "Tailwind CSS"),
    ("github actions", "GitHub Actions"),
    ("rest api", "REST APIs"),
    ("restful api", "REST APIs"),
    ("rest apis", "REST APIs"),
    ("restful apis", "REST APIs"),
    ("graphql api", "GraphQL"),
    ("web sockets", "WebSockets"),
    ("websockets", "WebSockets"),
    ("apache kafka", "Apache Kafka"),
    ("apache spark", "Apache Spark"),
    ("apache airflow", "Apache Airflow"),
    ("apache flink", "Apache Flink"),
    ("power bi", "Power BI"),
    ("scikit-learn", "Scikit-Learn"),
    ("scikit learn", "Scikit-Learn"),
    ("hugging face", "Hugging Face"),
    ("huggingface", "Hugging Face"),
    ("google cloud", "Google Cloud"),
    ("microsoft azure", "Azure"),
    ("sql server", "SQL Server"),
    ("ci/cd", "CI/CD"),

    # ── Single-word Tech, Languages, Frameworks & Tools ───────────────────────
    ("python", "Python"),
    ("javascript", "JavaScript"),
    ("typescript", "TypeScript"),
    ("java", "Java"),
    ("golang", "Go"),
    ("rust", "Rust"),
    ("c\\+\\+", "C++"),
    ("c#", "C#"),
    ("php", "PHP"),
    ("ruby", "Ruby"),
    ("swift", "Swift"),
    ("kotlin", "Kotlin"),
    ("scala", "Scala"),
    ("dart", "Dart"),
    ("sql", "SQL"),
    ("nosql", "NoSQL"),
    ("html5", "HTML5"),
    ("html", "HTML"),
    ("css3", "CSS3"),
    ("css", "CSS"),
    ("sass", "Sass"),
    ("graphql", "GraphQL"),
    ("grpc", "gRPC"),
    ("fastapi", "FastAPI"),
    ("django", "Django"),
    ("flask", "Flask"),
    ("react", "React"),
    ("vue", "Vue"),
    ("angular", "Angular"),
    ("svelte", "Svelte"),
    ("redux", "Redux"),
    ("zustand", "Zustand"),
    ("prisma", "Prisma"),
    ("sqlalchemy", "SQLAlchemy"),
    ("hibernate", "Hibernate"),
    ("docker", "Docker"),
    ("kubernetes", "Kubernetes"),
    ("k8s", "Kubernetes"),
    ("terraform", "Terraform"),
    ("ansible", "Ansible"),
    ("jenkins", "Jenkins"),
    ("git", "Git"),
    ("github", "GitHub"),
    ("gitlab", "GitLab"),
    ("linux", "Linux"),
    ("bash", "Bash"),
    ("shell", "Shell Scripting"),
    ("powershell", "PowerShell"),
    ("aws", "AWS"),
    ("azure", "Azure"),
    ("gcp", "GCP"),
    ("postgresql", "PostgreSQL"),
    ("postgres", "PostgreSQL"),
    ("mysql", "MySQL"),
    ("mongodb", "MongoDB"),
    ("redis", "Redis"),
    ("sqlite", "SQLite"),
    ("cassandra", "Cassandra"),
    ("snowflake", "Snowflake"),
    ("bigquery", "BigQuery"),
    ("dynamodb", "DynamoDB"),
    ("elasticsearch", "Elasticsearch"),
    ("pytorch", "PyTorch"),
    ("tensorflow", "TensorFlow"),
    ("keras", "Keras"),
    ("pandas", "Pandas"),
    ("numpy", "NumPy"),
    ("scipy", "SciPy"),
    ("tableau", "Tableau"),
    ("kafka", "Kafka"),
    ("spark", "Spark"),
    ("hadoop", "Hadoop"),
    ("airflow", "Airflow"),
    ("langchain", "LangChain"),
    ("llamaindex", "LlamaIndex"),
    ("llama", "LLaMA"),
    ("rag", "RAG"),
    ("opencv", "OpenCV"),
    ("nginx", "Nginx"),
    ("agile", "Agile"),
    ("scrum", "Scrum"),
    ("jira", "Jira"),
    ("postman", "Postman"),
    ("celery", "Celery"),
    ("rabbitmq", "RabbitMQ"),
    ("socket.io", "Socket.IO"),
    ("devops", "DevOps"),
    ("microservices", "Microservices"),
    ("pinecone", "Pinecone"),
    ("chromadb", "ChromaDB"),
    ("weaviate", "Weaviate"),
    ("qdrant", "Qdrant"),
    ("milvus", "Milvus"),
    ("pytest", "Pytest"),
    ("jest", "Jest"),
    ("cypress", "Cypress"),
    ("playwright", "Playwright"),
    ("selenium", "Selenium"),
    ("solidity", "Solidity"),
    ("web3", "Web3"),
]


def extract_skills_from_text(text: str) -> List[str]:
    """
    Extract technical skills and domain phrases using the taxonomy.
    Matches multi-word phrases first to prevent splitting ('machine learning' won't become 'machine' + 'learning').
    Completely eliminates stop words, generic verbs, and non-skill adjectives.
    """
    if not text:
        return []

    lower_text = " " + text.lower() + " "
    matched_canonical: List[str] = []
    seen: Set[str] = set()

    for pattern_str, canonical_name in CANONICAL_SKILLS:
        if canonical_name in seen:
            continue

        # Allow flexible whitespace or hyphen between words in multi-word patterns
        escaped_pattern = pattern_str if "\\" in pattern_str else re.escape(pattern_str)
        # Convert escaped space '\ ' into '[-\\s]+' so 'machine learning' matches 'machine-learning' or multiple spaces
        flexible_pattern = re.sub(r"\\\s+", r"[-\\s]+", escaped_pattern)

        pattern = rf"(?<![a-zA-Z0-9_]){flexible_pattern}(?![a-zA-Z0-9_])"
        if re.search(pattern, lower_text):
            matched_canonical.append(canonical_name)
            seen.add(canonical_name)

    return matched_canonical


def calculate_match_metrics(resume_text: str, jd_text: str) -> Tuple[int, List[str], List[str]]:
    """
    Computes fair, weighted match metrics based exclusively on skills taxonomy.
    Section 11 & 12 standard: Skills taxonomy + weighted overlap.
    Non-skill fluff words (e.g. 'enthusiastic', 'developer', 'passionate') carry ZERO penalty.
    Returns: (match_score, matching_skills, missing_skills)
    """
    jd_skills = extract_skills_from_text(jd_text)
    resume_skills = set(extract_skills_from_text(resume_text))

    if not jd_skills:
        # If JD has no recognized tech keywords, give a solid default baseline
        found = list(resume_skills)[:8]
        return (75, found, [])

    matching: List[str] = []
    missing: List[str] = []

    for skill in jd_skills:
        if skill in resume_skills:
            matching.append(skill)
        else:
            missing.append(skill)

    total_skills = len(jd_skills)
    matched_count = len(matching)
    ratio = matched_count / total_skills

    # Fair weighted scoring based on tech coverage
    if ratio >= 0.7:
        # 70% to 100% overlap -> 85 to 100 score
        score = int(85 + ((ratio - 0.7) / 0.3) * 15)
    elif ratio >= 0.4:
        # 40% to 70% overlap -> 65 to 84 score
        score = int(65 + ((ratio - 0.4) / 0.3) * 19)
    elif ratio > 0:
        # 1% to 40% overlap -> 40 to 64 score
        score = int(40 + (ratio / 0.4) * 24)
    else:
        # Zero skill overlap
        score = 25

    final_score = min(100, max(20, score))
    return final_score, matching, missing
