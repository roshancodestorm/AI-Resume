import io
import os
import re
from typing import Dict, Any, List

from jinja2 import Environment, FileSystemLoader

# ReportLab imports (100% pure Python / Windows native, zero GTK dependencies)
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from app.models.resume import Resume

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates", "pdf")

try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except (ImportError, OSError):
    HTML = None
    CSS = None
    WEASYPRINT_AVAILABLE = False


def clean_xml_text(text: Any) -> str:
    """Escape special characters for ReportLab Paragraph markup."""
    if text is None:
        return ""
    s = str(text)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return s


def generate_pdf_reportlab(resume: Resume, template: str = "modern") -> bytes:
    """
    Generate professional resume PDF using ReportLab.
    Works natively on Windows, Linux, and macOS without external C libraries.
    Supports 'modern', 'classic', and 'minimal' styling themes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    # Theme colors and typography
    if template == "classic":
        font_family = "Times-Roman"
        font_bold = "Times-Bold"
        font_italic = "Times-Italic"
        primary_color = colors.HexColor("#1e293b")
        secondary_color = colors.HexColor("#334155")
        accent_color = colors.HexColor("#475569")
        line_color = colors.HexColor("#0f172a")
    elif template == "minimal":
        font_family = "Helvetica"
        font_bold = "Helvetica-Bold"
        font_italic = "Helvetica-Oblique"
        primary_color = colors.HexColor("#111827")
        secondary_color = colors.HexColor("#4b5563")
        accent_color = colors.HexColor("#6b7280")
        line_color = colors.HexColor("#d1d5db")
    else:  # modern
        font_family = "Helvetica"
        font_bold = "Helvetica-Bold"
        font_italic = "Helvetica-Oblique"
        primary_color = colors.HexColor("#1e3a8a")  # Deep Navy / Blue
        secondary_color = colors.HexColor("#2563eb")  # Royal Blue
        accent_color = colors.HexColor("#475569")
        line_color = colors.HexColor("#2563eb")

    styles = getSampleStyleSheet()

    # Custom styles
    name_style = ParagraphStyle(
        "ResumeName",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=20,
        leading=24,
        textColor=primary_color,
        alignment=0,
    )

    contact_style = ParagraphStyle(
        "ResumeContact",
        parent=styles["Normal"],
        fontName=font_family,
        fontSize=8.5,
        leading=12,
        textColor=accent_color,
    )

    summary_style = ParagraphStyle(
        "ResumeSummary",
        parent=styles["Normal"],
        fontName=font_italic,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )

    section_heading_style = ParagraphStyle(
        "ResumeSectionHeading",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=11,
        leading=14,
        textColor=primary_color,
        spaceBefore=8,
        spaceAfter=2,
    )

    item_title_style = ParagraphStyle(
        "ResumeItemTitle",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )

    item_subtitle_style = ParagraphStyle(
        "ResumeItemSubtitle",
        parent=styles["Normal"],
        fontName=font_bold,
        fontSize=9,
        leading=12,
        textColor=secondary_color,
    )

    item_date_style = ParagraphStyle(
        "ResumeItemDate",
        parent=styles["Normal"],
        fontName=font_family,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#64748b"),
        alignment=2,  # Right-aligned
    )

    bullet_style = ParagraphStyle(
        "ResumeBullet",
        parent=styles["Normal"],
        fontName=font_family,
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1e293b"),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=2,
    )

    body_style = ParagraphStyle(
        "ResumeBody",
        parent=styles["Normal"],
        fontName=font_family,
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )

    story: List[Any] = []

    # 1. Header (Personal Info)
    personal = resume.personal_info or {}
    full_name = clean_xml_text(personal.get("full_name") or resume.title or "Professional Resume")
    story.append(Paragraph(full_name, name_style))
    story.append(Spacer(1, 3))

    # Contact line
    contacts: List[str] = []
    if personal.get("email"):
        contacts.append(clean_xml_text(personal["email"]))
    if personal.get("phone"):
        contacts.append(clean_xml_text(personal["phone"]))
    if personal.get("location"):
        contacts.append(clean_xml_text(personal["location"]))
    if personal.get("linkedin"):
        contacts.append(clean_xml_text(personal["linkedin"]))
    if personal.get("github"):
        contacts.append(clean_xml_text(personal["github"]))
    if personal.get("website"):
        contacts.append(clean_xml_text(personal["website"]))

    if contacts:
        contact_str = " &nbsp;•&nbsp; ".join(contacts)
        story.append(Paragraph(contact_str, contact_style))
        story.append(Spacer(1, 6))

    # Decorative line under header
    story.append(HRFlowable(width="100%", thickness=1.5, color=line_color, spaceBefore=2, spaceAfter=8))

    # 2. Professional Summary
    summary_text = personal.get("summary")
    if summary_text and str(summary_text).strip():
        story.append(Paragraph(clean_xml_text(summary_text).strip(), summary_style))
        story.append(Spacer(1, 8))

    # 3. Sections
    visible_sections = [s for s in sorted(resume.sections, key=lambda s: s.order_index) if s.is_visible]

    for section in visible_sections:
        sec_type = section.section_type
        sec_title = clean_xml_text(section.title or sec_type.title())
        content = section.content or []

        story.append(Paragraph(sec_title.upper(), section_heading_style))
        story.append(HRFlowable(width="100%", thickness=0.8, color=line_color, spaceBefore=1, spaceAfter=6))

        if sec_type == "experience" and isinstance(content, list):
            for exp in content:
                if not isinstance(exp, dict):
                    continue
                role = clean_xml_text(exp.get("role") or exp.get("title") or "")
                company = clean_xml_text(exp.get("company") or "")
                start = clean_xml_text(exp.get("start_date") or "")
                end = clean_xml_text(exp.get("end_date") or "Present")
                date_str = f"{start} - {end}" if start else end

                # Two-column row: Role & Company on Left, Date on Right
                left_cell = Paragraph(f"<b>{role}</b> &nbsp;|&nbsp; <font color='{secondary_color.hexval()}'>{company}</font>", item_title_style)
                right_cell = Paragraph(date_str, item_date_style)
                exp_table = Table([[left_cell, right_cell]], colWidths=[380, 160])
                exp_table.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ]))
                story.append(exp_table)

                # Bullets
                bullets = exp.get("bullets", [])
                if isinstance(bullets, list):
                    for b in bullets:
                        if b and str(b).strip():
                            story.append(Paragraph(f"• &nbsp;{clean_xml_text(b)}", bullet_style))
                story.append(Spacer(1, 5))

        elif sec_type == "education" and isinstance(content, list):
            for edu in content:
                if not isinstance(edu, dict):
                    continue
                school = clean_xml_text(edu.get("school") or edu.get("institution") or "")
                degree = clean_xml_text(edu.get("degree") or "")
                field = clean_xml_text(edu.get("field") or edu.get("field_of_study") or "")
                grad = clean_xml_text(edu.get("graduation_year") or "")
                gpa = clean_xml_text(edu.get("gpa") or "")

                left_text = f"<b>{school}</b>"
                if degree or field:
                    deg_field = f"{degree} in {field}" if degree and field else (degree or field)
                    left_text += f" &nbsp;—&nbsp; {deg_field}"
                if gpa:
                    left_text += f" &nbsp;(GPA: {gpa})"

                left_cell = Paragraph(left_text, body_style)
                right_cell = Paragraph(grad, item_date_style)
                edu_table = Table([[left_cell, right_cell]], colWidths=[420, 120])
                edu_table.setStyle(TableStyle([
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ]))
                story.append(edu_table)
                story.append(Spacer(1, 4))

        elif sec_type == "skills" and isinstance(content, list):
            for cat in content:
                if isinstance(cat, dict):
                    cat_name = clean_xml_text(cat.get("category") or "Technical Skills")
                    skills_list = cat.get("skills", [])
                    if isinstance(skills_list, list) and skills_list:
                        skills_str = ", ".join(clean_xml_text(s) for s in skills_list)
                        story.append(Paragraph(f"<b>{cat_name}:</b> &nbsp;{skills_str}", body_style))
                        story.append(Spacer(1, 2))
            story.append(Spacer(1, 4))

        elif sec_type == "projects" and isinstance(content, list):
            for proj in content:
                if not isinstance(proj, dict):
                    continue
                name = clean_xml_text(proj.get("name") or proj.get("title") or "")
                url = clean_xml_text(proj.get("url") or "")
                tech = proj.get("technologies", [])
                tech_str = ", ".join(clean_xml_text(t) for t in tech) if isinstance(tech, list) else clean_xml_text(tech)

                header_text = f"<b>{name}</b>"
                if tech_str:
                    header_text += f" &nbsp;|&nbsp; <font color='{secondary_color.hexval()}'>{tech_str}</font>"
                story.append(Paragraph(header_text, item_title_style))

                desc = clean_xml_text(proj.get("description") or "")
                if desc:
                    story.append(Paragraph(desc, body_style))

                bullets = proj.get("bullets", [])
                if isinstance(bullets, list):
                    for b in bullets:
                        if b and str(b).strip():
                            story.append(Paragraph(f"• &nbsp;{clean_xml_text(b)}", bullet_style))
                story.append(Spacer(1, 5))

        else:
            # Fallback for custom sections
            if isinstance(content, list):
                for item in content:
                    story.append(Paragraph(clean_xml_text(str(item)), body_style))
            elif isinstance(content, str):
                story.append(Paragraph(clean_xml_text(content), body_style))
            story.append(Spacer(1, 4))

    doc.build(story)
    return buffer.getvalue()


def generate_pdf(resume: Resume, template: str = "modern") -> bytes:
    """
    Render a resume to PDF.
    Attempts WeasyPrint if available; falls back to pure ReportLab seamlessly.
    Ensures 100% reliable PDF export on Windows.
    """
    if WEASYPRINT_AVAILABLE:
        try:
            env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))
            template_file = f"{template}.html"
            try:
                tmpl = env.get_template(template_file)
            except Exception:
                tmpl = env.get_template("modern.html")

            sections_by_type = {}
            for section in sorted(resume.sections, key=lambda s: s.order_index):
                if section.is_visible:
                    sections_by_type[section.section_type] = {
                        "title": section.title,
                        "content": section.content or [],
                    }

            context = {
                "personal_info": resume.personal_info or {},
                "sections": sections_by_type,
                "resume_title": resume.title,
            }

            html_content = tmpl.render(**context)
            pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
            return pdf_bytes
        except Exception:
            # If WeasyPrint has missing DLLs, gracefully fallback to ReportLab
            pass

    return generate_pdf_reportlab(resume, template)
