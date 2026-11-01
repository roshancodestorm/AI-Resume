import json
import re
from typing import Dict, Any, List, Optional
from openai import AsyncOpenAI
import openai

from app.core.config import settings
from app.models.resume import Resume
from app.core.skills_taxonomy import extract_skills_from_text
from app.services.ai_service import is_openai_configured, get_openai_client, extract_full_resume_text


COACH_SYSTEM_PROMPT = """You are 'Aura', an elite conversational AI Career Coach and Resume Specialist for the AI Resume Platform.
You interact conversationally in the user's preferred language (English, Hindi, Hinglish, or Marathi).

YOUR ROLES:
1. Interactive Profile & Resume Building: Ask engaging questions to extract candidate skills, projects, work experience, and education.
2. Career & Role Guidance: Suggest targeted job roles based on the candidate's actual skills.
3. Structured Draft Generation: Format the resume draft content strictly in professional English.
4. STRICT CONFIRMATION MANDATE: Never silently save changes. Always present the draft and ask for confirmation in the user's language.
5. DYNAMIC LANGUAGE REPLY: Always reply in the same language the user is speaking (Marathi, Hindi, Hinglish, or English). If the user speaks Marathi, reply in Marathi. If Hindi, reply in Hindi.
6. STRICT TRUTHFULNESS: Only use the skills and experiences the candidate explicitly mentioned. NEVER invent projects, company names, or metrics.
7. NO FAKE DATA: Do not use example data (like 'AI Chatbot' or 'Python developer') unless the user specifically said they have that experience.

Return a valid JSON object with this exact structure:
{
  "reply": "<friendly conversational response in user's language>",
  "voice_reply": "<short, concise version suitable for Text-to-Speech audio in 1-2 sentences>",
  "suggested_roles": ["<Role 1>", "<Role 2>"], // optional, only when recommending roles
  "draft_section": { // optional, only when drafting a section
    "section_type": "skills" | "projects" | "experience" | "summary" | "education",
    "title": "Projects" | "Technical Skills" | "Work Experience" | "Education",
    "content": <structured content matching resume schema>
  },
  "action": "none" | "confirm_draft" | "suggest_roles"
}
"""


async def process_coach_message(
    message: str,
    resume: Optional[Resume] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    preferred_language: str = "auto",
) -> Dict[str, Any]:
    """
    Process incoming user voice/text message through the AI Career Coach.
    Returns conversational text, TTS voice reply, role suggestions, and draft sections with confirmation.
    """
    cleaned_msg = message.strip()
    history = conversation_history or []

    # 1. OpenAI GPT-4o Mode
    if is_openai_configured():
        try:
            client = get_openai_client()
            resume_context = ""
            if resume:
                resume_text = extract_full_resume_text(resume)
                resume_context = f"\n\nCurrent candidate resume context:\nTitle: {resume.title}\n{resume_text[:1500]}"

            messages = [{"role": "system", "content": COACH_SYSTEM_PROMPT + resume_context}]
            # Include recent chat history
            for h in history[-6:]:
                role = h.get("role", "user")
                content = h.get("content", "")
                if role in {"user", "assistant"}:
                    messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": cleaned_msg})

            resp = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages,
                temperature=0.4,
                max_tokens=1500,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content)
            return {
                "reply": data.get("reply", "Aapka message samajh aa gaya hai."),
                "voice_reply": data.get("voice_reply") or data.get("reply", "")[:120],
                "suggested_roles": data.get("suggested_roles") or [],
                "draft_section": data.get("draft_section"),
                "action": data.get("action", "none"),
            }
        except openai.OpenAIError:
            pass

    # 2. Minimal Heuristic Fallback (If AI not configured or call fails)
    lower = cleaned_msg.lower().replace("?", "").replace(".", "").replace("!", "").strip()
    
    # Simple greetings fallback (English, Hindi, Hinglish, Marathi)
    greetings_hindi = ["kya haal hai", "kaise ho", "kaise hain", "namaste", "namaskar"]
    greetings_marathi = ["kasa ahes", "kasa ahat", "namaskar", "shubh prabhat"]
    greetings_english = ["hello", "hi", "hey"]

    if any(k in lower for k in greetings_marathi):
        reply = "Namaskar! Mi Aura aahe, tumcha AI Career Coach. Mi tumchi kashi madat karu shakto?"
        voice = "Namaskar! Mi tumcha AI Coach aahe."
        return {"reply": reply, "voice_reply": voice, "action": "none"}
        
    if any(k in lower for k in greetings_hindi):
        reply = "Main theek hoon! Main aapka AI Career Coach hoon. Aaj aap apne career ya resume ke liye kya jaanna chahte hain?"
        voice = "Main theek hoon! Kaise madad kar sakta hoon?"
        return {"reply": reply, "voice_reply": voice, "action": "none"}

    if any(k in lower for k in greetings_english):
        reply = "Hello! I am Aura, your AI Career Coach. How can I help you today?"
        voice = "Hello! I am your AI Coach."
        return {"reply": reply, "voice_reply": voice, "action": "none"}

    # Enhanced fallback for common career-related keywords
    if any(k in lower for k in ["job", "career", "kaam", "naukri", "help", "madat"]):
        reply = "Main aapki job aur career goals mein madad kar sakta hoon. Kya aap apna resume update karna chahte hain?"
        voice = "Main aapki job mein madad kar sakta hoon."
        return {"reply": reply, "voice_reply": voice, "action": "none"}
    
    if any(k in lower for k in ["project", "projek", "kaam"]):
        reply = "Naya project add karne ke liye, aap mujhe project ka naam aur details batayein, main use aapke resume mein draft kar dunga."
        voice = "Aap naya project add kar sakte hain."
        return {"reply": reply, "voice_reply": voice, "action": "none"}

    return {
        "reply": "Maaf kijiye, main abhi samajh nahi paa rahi hoon. Aapka AI key sahi se configured nahi hai, isliye main basic responses hi de paa rahi hoon. Please backend .env file mein valid OPENAI_API_KEY add karein.",
        "voice_reply": "Maaf kijiye, main samajh nahi paayi. AI configuration check karein.",
        "action": "none",
    }
