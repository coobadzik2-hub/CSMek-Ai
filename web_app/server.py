from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from pathlib import Path

import asyncio
import html
import re
import sys
import json
import os
import random
import secrets
import unicodedata
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.parse import urlencode

import qrcode

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import jarvis
from jarvis import zapytaj_umbot, _wczytaj_wszystkie_zrodla

app = FastAPI(title="Umbot Web")
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
KNOWLEDGE_DIR = ROOT_DIR / "knowledge"
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
PUBLIC_SITE_URL = os.getenv("CSMEK_PUBLIC_URL", "https://removed-national-minor-agriculture.trycloudflare.com/")
NEWS_CACHE = {"expires": 0, "items": []}
NEWS_FALLBACK = [
    {"kicker": "Ratownictwo", "title": "Systemy emergency care wymagają ciągłej gotowości", "text": "Zintegrowana opieka przedszpitalna, SOR i szybkie przekazanie pacjenta skracają czas do właściwego leczenia.", "source": "WHO · Emergency care systems"},
    {"kicker": "Medycyna kryzysowa", "title": "ABCDE porządkuje ocenę pacjenta w stanie nagłym", "text": "Uporządkowana ocena dróg oddechowych, oddechu, krążenia, neurologii i ekspozycji ogranicza ryzyko przeoczeń.", "source": "CSMek · materiały edukacyjne"}
]
NEWS_SOURCES = (
    ("WHO", "https://www.who.int/rss-feeds/news-english.xml"),
    ("ScienceDaily", "https://www.sciencedaily.com/rss/health_medicine.xml"),
    ("CDC", "https://tools.cdc.gov/podcasts/rss.asp?c=391")
)


class CommandRequest(BaseModel):
    text: str
    history: list[dict[str, str]] = []


class TechnicalReport(BaseModel):
    reporter: str
    contact: str
    category: str
    priority: str
    location: str
    description: str


class TechnicalReportStatusUpdate(BaseModel):
    password: str
    report_id: str
    completed: bool


class InboxAccessRequest(BaseModel):
    password: str


class SocialPostRequest(BaseModel):
    author: str = ""
    content: str


class SocialLikeRequest(BaseModel):
    client_id: str


class SocialPresenceRequest(BaseModel):
    client_id: str


class SocialCommentRequest(BaseModel):
    content: str


class KnowledgeTextRequest(BaseModel):
    content: str


REPORTS_FILE = BASE_DIR / "technical_reports.json"
INBOX_PASSWORD = "Technik CSM"
SOCIAL_POSTS_FILE = BASE_DIR / "social_posts.json"
KNOWLEDGE_SUBMISSIONS_FILE = KNOWLEDGE_DIR / "csmsocial_submissions.md"
SOCIAL_UPLOAD_DIR = BASE_DIR / "static" / "social-uploads"
SOCIAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
SOCIAL_ACTIVE_SESSIONS = {}
SOCIAL_SESSION_TTL_SECONDS = 75
SOCIAL_AGENT_TASK = None
SOCIAL_AGENT_REPLY_TASK = None
SOCIAL_AGENT_NAME = "CSMek World"
SOCIAL_AGENT_FACTS = [
    "Ośmiornice mają trzy serca, a ich krew zawiera hemocyjaninę, dlatego ma niebieskawy kolor.",
    "Na Ziemi znajduje się więcej drzew niż gwiazd w Drodze Mlecznej według najczęściej cytowanych szacunków naukowych.",
    "Miód może zachować trwałość przez bardzo długi czas, ponieważ ma mało wody i naturalnie kwaśne środowisko.",
    "Błyskawica może rozgrzać powietrze do temperatury wyższej niż powierzchnia Słońca, choć trwa zaledwie ułamek sekundy.",
    "Największym organizmem na Ziemi jest kolonia grzyba Armillaria w Oregonie, zajmująca kilka kilometrów kwadratowych.",
    "Wenus obraca się wokół własnej osi w kierunku przeciwnym do większości planet Układu Słonecznego.",
    "Serce płetwala błękitnego jest tak duże, że jego główna aorta ma średnicę porównywalną z talerzem.",
    "Woda może jednocześnie wrzeć i zamarzać w punkcie potrójnym, gdy ciśnienie i temperatura osiągną odpowiednie wartości."
]
SOCIAL_PROFANITY = {
    "cholera", "chuj", "cipa", "cipka", "dupa", "gowno", "kurwa",
    "kurew", "jebac", "jebany", "jebać", "pierdolic", "pierdolić",
    "pierdol", "pojeb", "skurwysyn", "sukinsyn", "wypierdal", "kurwo",
    "sperma", "fiut", "kutafon", "penis", "srać", "srac", "sranie",
    "idiota", "idiotka", "debil", "debilu", "kretyn", "kretynka",
    "matoł", "matol", "frajer", "szmata", "dziwka", "prostak", "głupek", "glupek"
}
INBOX_PASSWORD = "Technik CSM"


def load_library_items():
    items = []
    if not KNOWLEDGE_DIR.exists():
        return items

    for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
        try:
            text = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        if not text.strip():
            continue

        title = md_file.stem.replace("_", " ").strip()
        title = re.sub(r"\s+", " ", title).title()

        sections = []
        current = None
        summary_parts = []

        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            heading = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading:
                if current:
                    sections.append(current)
                current = {
                    "title": heading.group(2).strip(),
                    "text": [],
                    "points": []
                }
                continue

            bullet = re.match(r"^(?:[-*]|\d+[.)])\s+(.+)$", line)
            if bullet:
                if current is None:
                    current = {"title": "Najważniejsze informacje", "text": [], "points": []}
                current["points"].append(bullet.group(1).strip())
                continue

            clean = re.sub(r"\s+", " ", line)
            if current is None:
                summary_parts.append(clean)
            else:
                current["text"].append(clean)

        if current:
            sections.append(current)

        summary = " ".join(summary_parts).strip()
        if not summary and sections:
            for section in sections:
                section_summary = " ".join(section["text"]).strip()
                if section_summary:
                    summary = section_summary
                    break
                if section["points"]:
                    summary = " ".join(section["points"][:2]).strip()
                    break
        summary = summary[:420] if summary else "Brak podsumowania."

        items.append({
            "title": title,
            "summary": summary,
            "sections": sections
        })

    return items


def process_text(text: str, history: list[dict[str, str]] | None = None) -> str:
    text = (text or "").strip()
    if not text:
        return "Nie usłyszałem polecenia."

    try:
        return zapytaj_umbot(text, history=history or [])
    except Exception:
        return "Nie mogę teraz odpowiedzieć. Spróbuj ponownie."


def normalize_social_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]+", "", normalized)


def social_text_is_acceptable(author: str, content: str) -> bool:
    combined = f"{author} {content}"
    normalized = normalize_social_text(combined)
    return not any(word in normalized for word in SOCIAL_PROFANITY if len(word) >= 4)


def knowledge_text_is_acceptable(content: str) -> bool:
    normalized = normalize_social_text(content)
    return not any(word in normalized for word in SOCIAL_PROFANITY if len(word) >= 4)


def load_social_posts():
    if not SOCIAL_POSTS_FILE.exists():
        return []
    try:
        posts = json.loads(SOCIAL_POSTS_FILE.read_text(encoding="utf-8"))
        return posts if isinstance(posts, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def save_social_posts(posts):
    SOCIAL_POSTS_FILE.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")


def active_social_members():
    now = datetime.now().timestamp()
    expired = [client_id for client_id, seen_at in SOCIAL_ACTIVE_SESSIONS.items() if now - seen_at > SOCIAL_SESSION_TTL_SECONDS]
    for client_id in expired:
        SOCIAL_ACTIVE_SESSIONS.pop(client_id, None)
    return len(SOCIAL_ACTIVE_SESSIONS)


def create_agent_post():
    posts = load_social_posts()
    fact_index = sum(1 for post in posts if post.get("is_agent", False)) % len(SOCIAL_AGENT_FACTS)
    entry = {
        "id": secrets.token_urlsafe(10),
        "author": SOCIAL_AGENT_NAME,
        "content": SOCIAL_AGENT_FACTS[fact_index],
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "likes": [],
        "comments": [],
        "published": True,
        "is_agent": True,
        "category": "Ciekawostka ze świata"
    }
    posts.append(entry)
    save_social_posts(posts)


def agent_reply_for_context(post, comment):
    text = comment.get("content", "").casefold()
    if any(word in text for word in ("dlaczego", "jak to", "czy to", "czy można", "co to")):
        return "To dobre pytanie. Warto potraktować tę ciekawostkę jako punkt wyjścia i sprawdzić szczegóły w wiarygodnym źródle naukowym."
    if any(word in text for word in ("dzięki", "dzieki", "super", "ciekawe", "wow")):
        return "Miło mi, że ciekawostka Cię zainteresowała. Wkrótce pojawi się kolejna."
    if any(word in text for word in ("medyc", "zdrow", "ciał", "organ", "serce")):
        return "To interesujący wątek ze świata nauki. Pamiętaj, że ciekawostka nie zastępuje porady medycznej ani sprawdzonej publikacji."
    if any(word in text for word in ("źródło", "zrodlo", "prawda", "wiarygod")):
        return "Dobre pytanie o źródło. Przy takich faktach najlepiej sięgać do publikacji naukowych lub materiałów instytucji badawczych."
    return "Dzięki za odpowiedź. Jeśli chcesz, rozwiń swój komentarz albo napisz, jaki temat mam sprawdzić w kolejnej ciekawostce."


def create_agent_reply(posts):
    candidates = []
    for post in posts:
        if not post.get("is_agent", False):
            continue
        comments = post.get("comments", [])
        for comment in comments:
            if comment.get("is_agent", False):
                continue
            if any(reply.get("reply_to") == comment.get("id") for reply in comments):
                continue
            if social_text_is_acceptable("Anonimowy student", comment.get("content", "")):
                candidates.append((post, comment))
    if not candidates:
        return False

    post, comment = random.choice(candidates)
    reply_content = agent_reply_for_context(post, comment)
    if not social_text_is_acceptable(SOCIAL_AGENT_NAME, reply_content):
        return False
    comment_entry = {
        "id": secrets.token_urlsafe(10),
        "author": SOCIAL_AGENT_NAME,
        "content": reply_content,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "is_agent": True,
        "reply_to": comment.get("id")
    }
    post.setdefault("comments", []).append(comment_entry)
    save_social_posts(posts)
    return True


async def social_agent_loop():
    posts = load_social_posts()
    if not any(post.get("is_agent", False) for post in posts):
        create_agent_post()
    while True:
        await asyncio.sleep(3600)
        create_agent_post()


async def social_agent_reply_loop():
    while True:
        await asyncio.sleep(random.randint(45, 150))
        posts = load_social_posts()
        create_agent_reply(posts)


@app.on_event("startup")
async def start_social_agent():
    global SOCIAL_AGENT_TASK, SOCIAL_AGENT_REPLY_TASK
    SOCIAL_AGENT_TASK = asyncio.create_task(social_agent_loop())
    SOCIAL_AGENT_REPLY_TASK = asyncio.create_task(social_agent_reply_loop())


@app.on_event("shutdown")
async def stop_social_agent():
    if SOCIAL_AGENT_TASK:
        SOCIAL_AGENT_TASK.cancel()
    if SOCIAL_AGENT_REPLY_TASK:
        SOCIAL_AGENT_REPLY_TASK.cancel()


@app.get("/", response_class=HTMLResponse)
async def index():
    return templates.TemplateResponse("index.html", {"request": {}})


def fetch_news_items():
    items_by_source = {}
    for source_name, source_url in NEWS_SOURCES:
        try:
            request = Request(source_url, headers={"User-Agent": "CSMek-Clinical-Console/1.0"})
            with urlopen(request, timeout=5) as response:
                root = ET.fromstring(response.read())
            entries = root.findall(".//item") or root.findall(".//{*}entry")
            source_items = []
            for entry in entries[:6]:
                title = (entry.findtext("title") or entry.findtext("{*}title") or "").strip()
                description = entry.findtext("description") or entry.findtext("summary") or entry.findtext("{*}summary") or ""
                description = html.unescape(re.sub(r"<[^>]+>", "", description).strip())
                if title and title.casefold() not in {item["title"].casefold() for item in source_items}:
                    source_items.append({
                        "kicker": "Świat nauki · " + source_name,
                        "title": title[:140],
                        "text": description[:260] or "Najnowsza informacja z wiarygodnego źródła naukowego.",
                        "source": source_name
                    })
            items_by_source[source_name] = source_items
        except (OSError, ET.ParseError, ValueError):
            continue

    # Interleave sources so one feed cannot fill the whole rotation.
    items = []
    for index in range(8):
        for source_name, _ in NEWS_SOURCES:
            source_items = items_by_source.get(source_name, [])
            if index < len(source_items):
                items.append(source_items[index])
    return items or NEWS_FALLBACK


@app.get("/api/news")
async def news():
    now = datetime.now().timestamp()
    if NEWS_CACHE["expires"] <= now:
        NEWS_CACHE["items"] = fetch_news_items()
        NEWS_CACHE["expires"] = now + 120
    return {"items": NEWS_CACHE["items"], "updated_at": datetime.now().isoformat(timespec="seconds")}


@app.get("/api/qr")
async def qr_code():
    image = qrcode.make(PUBLIC_SITE_URL)
    buffer = __import__("io").BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="image/png", headers={"Cache-Control": "no-store"})


@app.get("/technical", response_class=HTMLResponse)
async def technical_page():
    return templates.TemplateResponse("technical.html", {"request": {}})


@app.get("/student-feedback", response_class=HTMLResponse)
async def student_feedback_page():
    return templates.TemplateResponse("student_feedback.html", {"request": {}})


@app.get("/csmsocial", response_class=HTMLResponse)
async def social_page():
    return templates.TemplateResponse("csmsocial.html", {"request": {}})


@app.get("/knowledge", response_class=HTMLResponse)
async def knowledge_page():
    return templates.TemplateResponse("knowledge.html", {"request": {}})


def append_knowledge_submission(text: str, source: str):
    KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().isoformat(timespec="seconds")
    with KNOWLEDGE_SUBMISSIONS_FILE.open("a", encoding="utf-8") as file:
        file.write(f"\n## Dodano {timestamp} · {source}\n\n{text.strip()}\n")
    _wczytaj_wszystkie_zrodla.cache_clear()


@app.post("/api/knowledge/text")
async def add_knowledge_text(request: KnowledgeTextRequest):
    content = request.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Wpisz treść, którą agent ma zapamiętać.")
    if len(content) > 10000:
        raise HTTPException(status_code=413, detail="Treść może mieć maksymalnie 10 000 znaków.")
    if not knowledge_text_is_acceptable(content):
        raise HTTPException(status_code=422, detail="Treść nie została zapisana, ponieważ zawiera wulgaryzmy lub obraźliwe określenia.")
    append_knowledge_submission(content, "wpis użytkownika")
    return {"saved": True}


@app.post("/api/knowledge/file")
async def add_knowledge_file(file: UploadFile = File(...)):
    allowed_extensions = {".txt", ".md", ".csv", ".json"}
    extension = Path(file.filename or "").suffix.casefold()
    if extension not in allowed_extensions:
        raise HTTPException(status_code=422, detail="Dozwolone są pliki TXT, MD, CSV i JSON.")
    content = await file.read(1024 * 1024 + 1)
    if len(content) > 1024 * 1024:
        raise HTTPException(status_code=413, detail="Plik może mieć maksymalnie 1 MB.")
    try:
        text = content.decode("utf-8").strip()
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="Plik musi być zapisany jako tekst UTF-8.")
    if not text:
        raise HTTPException(status_code=422, detail="Plik jest pusty.")
    if not knowledge_text_is_acceptable(text):
        raise HTTPException(status_code=422, detail="Plik nie został zapisany, ponieważ zawiera wulgaryzmy lub obraźliwe określenia.")
    append_knowledge_submission(text, f"plik {Path(file.filename or 'material').name}")
    return {"saved": True, "filename": Path(file.filename or "material").name}


@app.get("/api/social/posts")
async def social_posts():
    posts = [post for post in load_social_posts() if post.get("published", False)]
    for post in posts:
        post.setdefault("comments", [])
    return {
        "posts": sorted(posts, key=lambda post: post.get("created_at", ""), reverse=True),
        "active_members": active_social_members()
    }


@app.post("/api/social/presence")
async def social_presence(request: SocialPresenceRequest):
    client_id = request.client_id.strip()
    if not client_id or len(client_id) > 100:
        raise HTTPException(status_code=422, detail="Nieprawidłowy identyfikator użytkownika.")
    SOCIAL_ACTIVE_SESSIONS[client_id] = datetime.now().timestamp()
    return {"active_members": active_social_members()}


@app.post("/api/social/posts")
async def create_social_post(post: SocialPostRequest):
    author = re.sub(r"\s+", " ", post.author.strip())[:40] or "Anonimowy student"
    content = re.sub(r"\s+", " ", post.content.strip())
    if not content:
        raise HTTPException(status_code=422, detail="Wpis nie może być pusty.")
    if len(content) > 1200:
        raise HTTPException(status_code=422, detail="Wpis może mieć maksymalnie 1200 znaków.")
    if not social_text_is_acceptable(author, content):
        raise HTTPException(status_code=422, detail="Wpis nie został opublikowany, ponieważ zawiera przekleństwo lub zwrot obraźliwy.")

    posts = load_social_posts()
    entry = {
        "id": secrets.token_urlsafe(10),
        "author": author,
        "content": content,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "likes": [],
        "comments": [],
        "published": True
    }
    posts.append(entry)
    save_social_posts(posts)
    return {"post": entry}


@app.post("/api/social/photos")
async def create_social_photo(photo: UploadFile = File(...), caption: str = Form("")):
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif"
    }
    extension = allowed_types.get(photo.content_type or "")
    if not extension:
        raise HTTPException(status_code=422, detail="Dozwolone są tylko zdjęcia JPG, PNG, WebP lub GIF.")

    image_data = await photo.read(8 * 1024 * 1024 + 1)
    if len(image_data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Zdjęcie może mieć maksymalnie 8 MB.")

    clean_caption = re.sub(r"\s+", " ", caption.strip())[:300]
    if clean_caption and not social_text_is_acceptable("Anonimowy student", clean_caption):
        raise HTTPException(status_code=422, detail="Opis zdjęcia zawiera przekleństwo lub zwrot obraźliwy.")

    filename = f"{secrets.token_urlsafe(12)}{extension}"
    (SOCIAL_UPLOAD_DIR / filename).write_bytes(image_data)
    posts = load_social_posts()
    entry = {
        "id": secrets.token_urlsafe(10),
        "author": "Anonimowy student",
        "content": clean_caption,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "likes": [],
        "comments": [],
        "published": True,
        "post_type": "photo",
        "image_url": f"/static/social-uploads/{filename}"
    }
    posts.append(entry)
    save_social_posts(posts)
    return {"post": entry}


@app.post("/api/social/posts/{post_id}/like")
async def like_social_post(post_id: str, request: SocialLikeRequest):
    client_id = request.client_id.strip()
    if not client_id or len(client_id) > 100:
        raise HTTPException(status_code=422, detail="Nieprawidłowy identyfikator użytkownika.")
    posts = load_social_posts()
    for post in posts:
        if post.get("id") == post_id and post.get("published", False):
            likes = post.setdefault("likes", [])
            if client_id in likes:
                likes.remove(client_id)
                liked = False
            else:
                likes.append(client_id)
                liked = True
            save_social_posts(posts)
            return {"likes": len(likes), "liked": liked}
    raise HTTPException(status_code=404, detail="Nie znaleziono wpisu.")


@app.post("/api/social/posts/{post_id}/comments")
async def create_social_comment(post_id: str, comment: SocialCommentRequest):
    content = re.sub(r"\s+", " ", comment.content.strip())
    if not content:
        raise HTTPException(status_code=422, detail="Odpowiedź nie może być pusta.")
    if len(content) > 600:
        raise HTTPException(status_code=422, detail="Odpowiedź może mieć maksymalnie 600 znaków.")
    if not social_text_is_acceptable("Anonimowy student", content):
        raise HTTPException(status_code=422, detail="Odpowiedź nie została opublikowana, ponieważ zawiera przekleństwo lub zwrot obraźliwy.")

    posts = load_social_posts()
    for post in posts:
        if post.get("id") == post_id and post.get("published", False):
            comments = post.setdefault("comments", [])
            entry = {
                "id": secrets.token_urlsafe(10),
                "author": "Anonimowy student",
                "content": content,
                "created_at": datetime.now().isoformat(timespec="seconds")
            }
            comments.append(entry)
            save_social_posts(posts)
            return {"comment": entry}
    raise HTTPException(status_code=404, detail="Nie znaleziono wpisu.")


@app.post("/api/assistant")
async def assistant(req: CommandRequest):
    answer = process_text(req.text, req.history)
    return {"answer": answer}


@app.get("/api/assistant/status")
async def assistant_status():
    return {
        "openai_configured": bool(os.getenv("OPENAI_API_KEY", "").strip()),
        "openai_model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "ollama_url": "http://localhost:11434/api/chat",
        "last_provider": jarvis.AI_PROVIDER_STATUS["provider"],
        "last_provider_error": jarvis.AI_PROVIDER_STATUS["error"]
    }


@app.post("/api/technical-reports")
async def create_technical_report(report: TechnicalReport):
    category_key = unicodedata.normalize("NFKD", report.category).encode("ascii", "ignore").decode().casefold()
    if category_key == "uwagi dotyczace centrum symulacji" and (not report.reporter.strip() or not report.contact.strip()):
        raise HTTPException(status_code=422, detail="Dla uwag dotyczących Centrum Symulacji wymagane są dane kontaktowe.")

    reports = []
    if REPORTS_FILE.exists():
        try:
            reports = json.loads(REPORTS_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            reports = []

    report_id = f"TECH-{datetime.now().strftime('%Y%m%d')}-{len(reports) + 1:03d}"
    entry = {
        "id": report_id,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "completed": False,
        **report.model_dump()
    }
    reports.append(entry)
    REPORTS_FILE.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"report_id": report_id}


@app.post("/api/technical-reports/inbox")
async def technical_reports_inbox(access: InboxAccessRequest):
    if not secrets.compare_digest(access.password, INBOX_PASSWORD):
        raise HTTPException(status_code=401, detail="Nieprawidłowe hasło.")

    reports = []
    if REPORTS_FILE.exists():
        try:
            reports = json.loads(REPORTS_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            reports = []
    return {"reports": list(reversed(reports))}


@app.patch("/api/technical-reports/status")
async def update_technical_report_status(update: TechnicalReportStatusUpdate):
    if not secrets.compare_digest(update.password, INBOX_PASSWORD):
        raise HTTPException(status_code=401, detail="Nieprawidłowe hasło.")

    reports = []
    if REPORTS_FILE.exists():
        try:
            reports = json.loads(REPORTS_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            reports = []

    for report in reports:
        if report.get("id") == update.report_id:
            report["completed"] = update.completed
            REPORTS_FILE.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
            return {"report_id": update.report_id, "completed": update.completed}

    raise HTTPException(status_code=404, detail="Nie znaleziono zgłoszenia.")


@app.get("/api/weather")
async def weather():
    params = urlencode({
        "latitude": "51.2465",
        "longitude": "22.5684",
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
        "timezone": "Europe/Warsaw"
    })
    request = Request(
        f"https://api.open-meteo.com/v1/forecast?{params}",
        headers={"User-Agent": "CSMek-Clinical-Console/1.0"}
    )

    try:
        with urlopen(request, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
        current = payload.get("current", {})
        return {
            "city": "Lublin",
            "temperature": current.get("temperature_2m"),
            "apparent_temperature": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "wind": current.get("wind_speed_10m"),
            "weather_code": current.get("weather_code"),
            "time": current.get("time")
        }
    except Exception:
        return {"city": "Lublin", "error": "weather_unavailable"}


@app.get("/api/library")
async def library():
    return {"items": load_library_items()}


@app.get("/api/suggestions")
async def suggestions():
    candidates = []
    for item in load_library_items():
        title = item["title"]
        for section in item.get("sections", []):
            section_title = section.get("title", "").strip()
            if not section_title:
                continue
            candidates.append({
                "label": section_title[:28],
                "question": f"Jakie są najważniejsze zasady dotyczące {section_title.lower()} w temacie {title.lower()}?"
            })

    fallback = [
        {"label": "ABCDE", "question": "Jak przeprowadzić ocenę pacjenta według schematu ABCDE?"},
        {"label": "Udar", "question": "Jakie są najważniejsze objawy udaru i co zrobić natychmiast?"},
        {"label": "Triage", "question": "Na czym polega triage w medycynie kryzysowej?"},
        {"label": "Krwotok", "question": "Jak postępować przy masywnym krwotoku?"}
    ]
    pool = candidates or fallback
    amount = min(4, len(pool))
    return {"items": random.SystemRandom().sample(pool, amount)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("web_app.server:app", host="0.0.0.0", port=8001, reload=False)
