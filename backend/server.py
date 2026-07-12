"""UG Campus App - FastAPI backend.

Endpoints are all prefixed with /api.
Auth: JWT (HS256) + bcrypt.
Storage: MongoDB via motor.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "ug-campus-dev-secret-change-me")
JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 24 * 30

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="UG Campus API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ug-campus")


# ---------- Utilities ----------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> Dict[str, Any]:
    if cred is None:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user=Depends(current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return user


# ---------- Schemas ----------

class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class OnboardingIn(BaseModel):
    name: str
    program: str
    level: str


class CourseSelectionIn(BaseModel):
    course_ids: List[str]


class TaskIn(BaseModel):
    title: str
    start_time: str  # HH:MM
    end_time: Optional[str] = None
    date: str  # YYYY-MM-DD
    notes: Optional[str] = None


class GradeIn(BaseModel):
    course_id: str
    credit: float
    grade: str  # A, A-, B+, ..., F


class GpaSemesterIn(BaseModel):
    semester: str
    grades: List[GradeIn]


class GpaCalcIn(BaseModel):
    semesters: List[GpaSemesterIn]


class ChatMessageIn(BaseModel):
    text: str


# ---------- Seed data ----------

PROGRAMS = [
    {"id": "cs", "name": "Computer Science"},
    {"id": "ba", "name": "Business Administration"},
    {"id": "nu", "name": "Nursing"},
    {"id": "eng", "name": "Engineering"},
]
LEVELS = ["100", "200", "300", "400"]

COURSE_CATALOG: List[Dict[str, Any]] = [
    # CS
    {"code": "CSCD 101", "title": "Intro to Computer Science", "program": "cs", "level": "100", "credit": 3},
    {"code": "MATH 121", "title": "Algebra & Trigonometry", "program": "cs", "level": "100", "credit": 3},
    {"code": "UGRC 110", "title": "Academic Writing I", "program": "cs", "level": "100", "credit": 2},
    {"code": "PHYS 141", "title": "Mechanics", "program": "cs", "level": "100", "credit": 3},
    {"code": "STAT 101", "title": "Intro to Statistics", "program": "cs", "level": "100", "credit": 3},
    {"code": "CSCD 205", "title": "Data Structures", "program": "cs", "level": "200", "credit": 3},
    {"code": "CSCD 207", "title": "Object Oriented Programming", "program": "cs", "level": "200", "credit": 3},
    {"code": "CSCD 213", "title": "Discrete Mathematics", "program": "cs", "level": "200", "credit": 3},
    {"code": "CSCD 219", "title": "Systems Analysis", "program": "cs", "level": "200", "credit": 3},
    {"code": "UGRC 210", "title": "Academic Writing II", "program": "cs", "level": "200", "credit": 2},
    {"code": "CSCD 311", "title": "Algorithms", "program": "cs", "level": "300", "credit": 3},
    {"code": "CSCD 313", "title": "Databases", "program": "cs", "level": "300", "credit": 3},
    {"code": "CSCD 315", "title": "Operating Systems", "program": "cs", "level": "300", "credit": 3},
    {"code": "CSCD 317", "title": "Software Engineering", "program": "cs", "level": "300", "credit": 3},
    {"code": "CSCD 319", "title": "Computer Networks", "program": "cs", "level": "300", "credit": 3},
    {"code": "CSCD 411", "title": "Machine Learning", "program": "cs", "level": "400", "credit": 3},
    {"code": "CSCD 413", "title": "Distributed Systems", "program": "cs", "level": "400", "credit": 3},
    {"code": "CSCD 415", "title": "Compilers", "program": "cs", "level": "400", "credit": 3},
    {"code": "CSCD 419", "title": "Capstone Project", "program": "cs", "level": "400", "credit": 6},
    # BA
    {"code": "UGBS 101", "title": "Principles of Management", "program": "ba", "level": "100", "credit": 3},
    {"code": "UGBS 103", "title": "Introduction to Marketing", "program": "ba", "level": "100", "credit": 3},
    {"code": "UGBS 105", "title": "Business Communication", "program": "ba", "level": "100", "credit": 3},
    {"code": "ECON 111", "title": "Microeconomics", "program": "ba", "level": "100", "credit": 3},
    {"code": "UGRC 110", "title": "Academic Writing I", "program": "ba", "level": "100", "credit": 2},
    {"code": "UGBS 201", "title": "Financial Accounting", "program": "ba", "level": "200", "credit": 3},
    {"code": "UGBS 203", "title": "Business Statistics", "program": "ba", "level": "200", "credit": 3},
    {"code": "UGBS 205", "title": "Organizational Behavior", "program": "ba", "level": "200", "credit": 3},
    {"code": "UGBS 207", "title": "Business Law", "program": "ba", "level": "200", "credit": 3},
    {"code": "UGBS 301", "title": "Corporate Finance", "program": "ba", "level": "300", "credit": 3},
    {"code": "UGBS 303", "title": "Operations Management", "program": "ba", "level": "300", "credit": 3},
    {"code": "UGBS 305", "title": "Strategic Marketing", "program": "ba", "level": "300", "credit": 3},
    {"code": "UGBS 401", "title": "Strategic Management", "program": "ba", "level": "400", "credit": 3},
    {"code": "UGBS 403", "title": "Entrepreneurship", "program": "ba", "level": "400", "credit": 3},
    # NU
    {"code": "NURS 101", "title": "Foundations of Nursing", "program": "nu", "level": "100", "credit": 3},
    {"code": "NURS 103", "title": "Human Anatomy", "program": "nu", "level": "100", "credit": 3},
    {"code": "NURS 105", "title": "Physiology I", "program": "nu", "level": "100", "credit": 3},
    {"code": "UGRC 110", "title": "Academic Writing I", "program": "nu", "level": "100", "credit": 2},
    {"code": "NURS 201", "title": "Pharmacology", "program": "nu", "level": "200", "credit": 3},
    {"code": "NURS 203", "title": "Pathophysiology", "program": "nu", "level": "200", "credit": 3},
    {"code": "NURS 205", "title": "Medical-Surgical Nursing", "program": "nu", "level": "200", "credit": 3},
    {"code": "NURS 301", "title": "Community Health", "program": "nu", "level": "300", "credit": 3},
    {"code": "NURS 303", "title": "Mental Health Nursing", "program": "nu", "level": "300", "credit": 3},
    {"code": "NURS 305", "title": "Pediatric Nursing", "program": "nu", "level": "300", "credit": 3},
    {"code": "NURS 401", "title": "Critical Care Nursing", "program": "nu", "level": "400", "credit": 3},
    {"code": "NURS 403", "title": "Nursing Research", "program": "nu", "level": "400", "credit": 3},
    # ENG
    {"code": "ENGR 101", "title": "Engineering Drawing", "program": "eng", "level": "100", "credit": 3},
    {"code": "MATH 121", "title": "Calculus I", "program": "eng", "level": "100", "credit": 3},
    {"code": "PHYS 141", "title": "Mechanics", "program": "eng", "level": "100", "credit": 3},
    {"code": "UGRC 110", "title": "Academic Writing I", "program": "eng", "level": "100", "credit": 2},
    {"code": "ENGR 201", "title": "Thermodynamics", "program": "eng", "level": "200", "credit": 3},
    {"code": "ENGR 203", "title": "Circuits", "program": "eng", "level": "200", "credit": 3},
    {"code": "ENGR 205", "title": "Materials Science", "program": "eng", "level": "200", "credit": 3},
    {"code": "ENGR 301", "title": "Fluid Mechanics", "program": "eng", "level": "300", "credit": 3},
    {"code": "ENGR 303", "title": "Control Systems", "program": "eng", "level": "300", "credit": 3},
    {"code": "ENGR 401", "title": "Engineering Design", "program": "eng", "level": "400", "credit": 3},
    {"code": "ENGR 403", "title": "Project Management", "program": "eng", "level": "400", "credit": 3},
]

# Weekly timetable slots for each course (day 0=Mon..4=Fri)
TIMETABLE_TEMPLATE = [
    {"day": 0, "start": "08:00", "end": "09:30", "room": "JQB-15"},
    {"day": 1, "start": "10:00", "end": "11:30", "room": "NNB-05"},
    {"day": 2, "start": "13:00", "end": "14:30", "room": "KAB-02"},
    {"day": 3, "start": "15:00", "end": "16:30", "room": "MB-10"},
    {"day": 4, "start": "09:00", "end": "10:30", "room": "GHB-07"},
]

SCRIPTURES = [
    {"ref": "Jeremiah 29:11", "text": "For I know the plans I have for you, plans to prosper you and not to harm you, plans to give you hope and a future."},
    {"ref": "Philippians 4:13", "text": "I can do all things through Christ who strengthens me."},
    {"ref": "Proverbs 3:5-6", "text": "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."},
    {"ref": "Joshua 1:9", "text": "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."},
    {"ref": "Isaiah 40:31", "text": "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."},
    {"ref": "Romans 8:28", "text": "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."},
    {"ref": "Psalm 23:1", "text": "The Lord is my shepherd, I lack nothing."},
    {"ref": "Matthew 6:33", "text": "But seek first his kingdom and his righteousness, and all these things will be given to you as well."},
    {"ref": "2 Timothy 1:7", "text": "For God has not given us a spirit of fear, but of power and of love and of a sound mind."},
    {"ref": "Psalm 46:10", "text": "Be still, and know that I am God."},
    {"ref": "Colossians 3:23", "text": "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."},
    {"ref": "Proverbs 16:3", "text": "Commit to the Lord whatever you do, and he will establish your plans."},
    {"ref": "James 1:5", "text": "If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you."},
    {"ref": "Psalm 119:105", "text": "Your word is a lamp for my feet, a light on my path."},
    {"ref": "1 Corinthians 15:58", "text": "Therefore, my dear brothers and sisters, stand firm. Let nothing move you. Always give yourselves fully to the work of the Lord."},
    {"ref": "Ecclesiastes 3:1", "text": "There is a time for everything, and a season for every activity under the heavens."},
    {"ref": "Isaiah 41:10", "text": "So do not fear, for I am with you; do not be dismayed, for I am your God."},
    {"ref": "Psalm 37:5", "text": "Commit your way to the Lord; trust in him and he will do this."},
    {"ref": "Matthew 11:28", "text": "Come to me, all you who are weary and burdened, and I will give you rest."},
    {"ref": "Proverbs 2:6", "text": "For the Lord gives wisdom; from his mouth come knowledge and understanding."},
    {"ref": "John 14:27", "text": "Peace I leave with you; my peace I give you."},
    {"ref": "Psalm 27:1", "text": "The Lord is my light and my salvation—whom shall I fear?"},
    {"ref": "Romans 12:12", "text": "Be joyful in hope, patient in affliction, faithful in prayer."},
    {"ref": "1 Thessalonians 5:16-18", "text": "Rejoice always, pray continually, give thanks in all circumstances."},
    {"ref": "Proverbs 4:7", "text": "The beginning of wisdom is this: Get wisdom. Though it cost all you have, get understanding."},
    {"ref": "Psalm 90:12", "text": "Teach us to number our days, that we may gain a heart of wisdom."},
    {"ref": "Hebrews 11:1", "text": "Now faith is confidence in what we hope for and assurance about what we do not see."},
    {"ref": "1 Peter 5:7", "text": "Cast all your anxiety on him because he cares for you."},
    {"ref": "Galatians 6:9", "text": "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up."},
    {"ref": "Micah 6:8", "text": "Act justly and love mercy and walk humbly with your God."},
]


async def seed_database() -> None:
    # Programs
    if await db.programs.count_documents({}) == 0:
        await db.programs.insert_many([{**p} for p in PROGRAMS])
    # Levels
    if await db.levels.count_documents({}) == 0:
        await db.levels.insert_many([{"name": lvl} for lvl in LEVELS])
    # Courses
    if await db.courses.count_documents({}) == 0:
        docs = []
        for c in COURSE_CATALOG:
            docs.append({**c, "id": str(uuid.uuid4())})
        await db.courses.insert_many(docs)
    # Timetable — one weekly slot per course
    if await db.timetable.count_documents({}) == 0:
        courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
        tt_docs = []
        for i, course in enumerate(courses):
            slot = TIMETABLE_TEMPLATE[i % len(TIMETABLE_TEMPLATE)]
            tt_docs.append({
                "id": str(uuid.uuid4()),
                "course_id": course["id"],
                "course_code": course["code"],
                "course_title": course["title"],
                "program": course["program"],
                "level": course["level"],
                "semester": "2025/26 Sem 1",
                "day_of_week": slot["day"],
                "start_time": slot["start"],
                "end_time": slot["end"],
                "room": slot["room"],
            })
        await db.timetable.insert_many(tt_docs)
    # Resources — 2 slides + 1 past paper per course
    if await db.resources.count_documents({}) == 0:
        courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
        res_docs = []
        for course in courses:
            res_docs.append({
                "id": str(uuid.uuid4()),
                "course_id": course["id"],
                "course_code": course["code"],
                "title": f"{course['code']} - Week 1 Slides",
                "type": "slides",
                "url": "https://example.edu/slides/w1.pdf",
                "uploaded_at": now_iso(),
            })
            res_docs.append({
                "id": str(uuid.uuid4()),
                "course_id": course["id"],
                "course_code": course["code"],
                "title": f"{course['code']} - Week 2 Slides",
                "type": "slides",
                "url": "https://example.edu/slides/w2.pdf",
                "uploaded_at": now_iso(),
            })
            res_docs.append({
                "id": str(uuid.uuid4()),
                "course_id": course["id"],
                "course_code": course["code"],
                "title": f"{course['code']} - 2023 Past Paper",
                "type": "past_paper",
                "url": "https://example.edu/exams/2023.pdf",
                "uploaded_at": now_iso(),
            })
        await db.resources.insert_many(res_docs)
    # Scriptures
    if await db.scriptures.count_documents({}) == 0:
        await db.scriptures.insert_many([{**s, "id": str(uuid.uuid4())} for s in SCRIPTURES])
    # Admin user
    if not await db.users.find_one({"email": "admin@ug.edu.gh"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "admin@ug.edu.gh",
            "password_hash": hash_pw("admin123"),
            "name": "Campus Admin",
            "role": "admin",
            "program": "cs",
            "level": "400",
            "onboarded": True,
            "created_at": now_iso(),
        })
    # Demo student
    if not await db.users.find_one({"email": "student@ug.edu.gh"}):
        student_id = str(uuid.uuid4())
        await db.users.insert_one({
            "id": student_id,
            "email": "student@ug.edu.gh",
            "password_hash": hash_pw("student123"),
            "name": "Ama Mensah",
            "role": "user",
            "program": "cs",
            "level": "300",
            "onboarded": True,
            "created_at": now_iso(),
        })
        # Pre-select courses
        cs300 = await db.courses.find({"program": "cs", "level": "300"}, {"_id": 0}).to_list(100)
        selected = [c["id"] for c in cs300[:4]]
        await db.selections.insert_one({
            "user_id": student_id,
            "course_ids": selected,
            "updated_at": now_iso(),
        })
    log.info("Seed complete")


@app.on_event("startup")
async def on_startup() -> None:
    await seed_database()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    client.close()


# ---------- Auth routes ----------

def user_public(u: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name"),
        "role": u.get("role", "user"),
        "program": u.get("program"),
        "level": u.get("level"),
        "onboarded": bool(u.get("onboarded")),
    }


@api.post("/auth/signup")
async def signup(body: SignupIn):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "password_hash": hash_pw(body.password),
        "name": body.name or "",
        "role": "user",
        "program": None,
        "level": None,
        "onboarded": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    token = make_token(doc["id"], "user")
    return {"token": token, "user": user_public(doc)}


@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email.lower()})
    if not u or not verify_pw(body.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(u["id"], u.get("role", "user"))
    return {"token": token, "user": user_public(u)}


@api.get("/me")
async def get_me(user=Depends(current_user)):
    return user_public(user)


@api.post("/me/onboarding")
async def onboarding(body: OnboardingIn, user=Depends(current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"name": body.name, "program": body.program, "level": body.level, "onboarded": True}},
    )
    u = await db.users.find_one({"id": user["id"]})
    return user_public(u)


# ---------- Reference data ----------

@api.get("/programs")
async def get_programs():
    docs = await db.programs.find({}, {"_id": 0}).to_list(100)
    return docs


@api.get("/levels")
async def get_levels():
    return LEVELS


@api.get("/courses")
async def get_courses(program: Optional[str] = None, level: Optional[str] = None):
    q: Dict[str, Any] = {}
    if program:
        q["program"] = program
    if level:
        q["level"] = level
    docs = await db.courses.find(q, {"_id": 0}).sort("code", 1).to_list(500)
    return docs


# ---------- Course selection ----------

@api.get("/me/courses")
async def my_courses(user=Depends(current_user)):
    sel = await db.selections.find_one({"user_id": user["id"]}, {"_id": 0})
    ids = sel["course_ids"] if sel else []
    if not ids:
        return []
    docs = await db.courses.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
    return docs


@api.post("/me/courses")
async def set_my_courses(body: CourseSelectionIn, user=Depends(current_user)):
    await db.selections.update_one(
        {"user_id": user["id"]},
        {"$set": {"course_ids": body.course_ids, "updated_at": now_iso()}},
        upsert=True,
    )
    # Auto-join chats for each selected course
    for cid in body.course_ids:
        await db.chat_members.update_one(
            {"course_id": cid, "user_id": user["id"]},
            {"$set": {"joined_at": now_iso()}},
            upsert=True,
        )
    return {"course_ids": body.course_ids}


# ---------- Timetable ----------

async def _selected_ids(user_id: str) -> List[str]:
    sel = await db.selections.find_one({"user_id": user_id}, {"_id": 0})
    return sel["course_ids"] if sel else []


@api.get("/timetable/mine")
async def my_timetable(user=Depends(current_user)):
    ids = await _selected_ids(user["id"])
    if not ids:
        return []
    docs = await db.timetable.find({"course_id": {"$in": ids}}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: (d["day_of_week"], d["start_time"]))
    return docs


@api.get("/timetable/today")
async def today_timetable(user=Depends(current_user)):
    ids = await _selected_ids(user["id"])
    if not ids:
        return []
    today = datetime.now(timezone.utc).weekday()
    docs = await db.timetable.find(
        {"course_id": {"$in": ids}, "day_of_week": today}, {"_id": 0}
    ).to_list(200)
    docs.sort(key=lambda d: d["start_time"])
    return docs


# ---------- Resources ----------

@api.get("/resources")
async def resources(course_id: Optional[str] = None, user=Depends(current_user)):
    q: Dict[str, Any] = {}
    if course_id:
        q["course_id"] = course_id
    else:
        ids = await _selected_ids(user["id"])
        if ids:
            q["course_id"] = {"$in": ids}
    docs = await db.resources.find(q, {"_id": 0}).to_list(500)
    return docs


# ---------- Scripture ----------

@api.get("/scripture/today")
async def scripture_today():
    docs = await db.scriptures.find({}, {"_id": 0}).to_list(500)
    if not docs:
        return {"ref": "", "text": ""}
    doy = date.today().timetuple().tm_yday
    return docs[doy % len(docs)]


# ---------- Day planner ----------

@api.get("/planner/tasks")
async def list_tasks(date_: Optional[str] = Query(None, alias="date"), user=Depends(current_user)):
    q: Dict[str, Any] = {"user_id": user["id"]}
    if date_:
        q["date"] = date_
    docs = await db.tasks.find(q, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d.get("start_time", ""))
    return docs


@api.post("/planner/tasks")
async def create_task(body: TaskIn, user=Depends(current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title,
        "start_time": body.start_time,
        "end_time": body.end_time or "",
        "date": body.date,
        "notes": body.notes or "",
        "created_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/planner/tasks/{task_id}")
async def delete_task(task_id: str, user=Depends(current_user)):
    await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    return {"ok": True}


@api.get("/planner/day")
async def planner_day(date_: Optional[str] = Query(None, alias="date"), user=Depends(current_user)):
    d = date_ or date.today().isoformat()
    # Compute day-of-week from date string
    try:
        target = datetime.strptime(d, "%Y-%m-%d").date()
    except Exception:
        target = date.today()
    dow = target.weekday()
    ids = await _selected_ids(user["id"])
    classes: List[Dict[str, Any]] = []
    if ids:
        classes = await db.timetable.find(
            {"course_id": {"$in": ids}, "day_of_week": dow}, {"_id": 0}
        ).to_list(200)
    tasks = await db.tasks.find({"user_id": user["id"], "date": d}, {"_id": 0}).to_list(500)
    # Build merged agenda blocks
    blocks: List[Dict[str, Any]] = []
    for c in classes:
        blocks.append({
            "kind": "class",
            "id": c["id"],
            "title": f"{c['course_code']} · {c['course_title']}",
            "start_time": c["start_time"],
            "end_time": c["end_time"],
            "room": c.get("room", ""),
            "locked": True,
        })
    for t in tasks:
        blocks.append({
            "kind": "task",
            "id": t["id"],
            "title": t["title"],
            "start_time": t["start_time"],
            "end_time": t.get("end_time", ""),
            "notes": t.get("notes", ""),
            "locked": False,
        })
    blocks.sort(key=lambda b: b["start_time"])
    return {"date": d, "blocks": blocks}


# ---------- GPA / CGPA ----------

GRADE_POINTS = {
    "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0,
    "E": 0.5, "F": 0.0,
}


@api.get("/gpa/scale")
async def gpa_scale():
    return GRADE_POINTS


@api.post("/gpa/calculate")
async def gpa_calc(body: GpaCalcIn, user=Depends(current_user)):
    semesters_out = []
    total_pts = 0.0
    total_cred = 0.0
    for sem in body.semesters:
        sem_pts = 0.0
        sem_cred = 0.0
        for g in sem.grades:
            pt = GRADE_POINTS.get(g.grade.upper(), 0.0)
            sem_pts += pt * g.credit
            sem_cred += g.credit
        gpa = round(sem_pts / sem_cred, 2) if sem_cred > 0 else 0.0
        semesters_out.append({
            "semester": sem.semester,
            "gpa": gpa,
            "credits": sem_cred,
        })
        total_pts += sem_pts
        total_cred += sem_cred
    cgpa = round(total_pts / total_cred, 2) if total_cred > 0 else 0.0
    return {"semesters": semesters_out, "cgpa": cgpa, "total_credits": total_cred}


# ---------- Study groups (polling chat) ----------

@api.get("/chats/course/{course_id}/messages")
async def get_messages(course_id: str, since: Optional[str] = None, user=Depends(current_user)):
    ids = await _selected_ids(user["id"])
    if course_id not in ids and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Join course to view chat")
    q: Dict[str, Any] = {"course_id": course_id}
    if since:
        q["created_at"] = {"$gt": since}
    docs = await db.chat_messages.find(q, {"_id": 0}).to_list(500)
    docs.sort(key=lambda m: m["created_at"])
    return docs


@api.post("/chats/course/{course_id}/messages")
async def post_message(course_id: str, body: ChatMessageIn, user=Depends(current_user)):
    ids = await _selected_ids(user["id"])
    if course_id not in ids and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Join course to post")
    doc = {
        "id": str(uuid.uuid4()),
        "course_id": course_id,
        "user_id": user["id"],
        "user_name": user.get("name") or user["email"],
        "text": body.text,
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Health ----------

@api.get("/")
async def root():
    return {"service": "ug-campus", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
