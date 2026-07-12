"""UG Campus backend regression tests."""
import os
import uuid
import pytest
import requests
from datetime import date

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://academic-companion-14.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

STUDENT = {"email": "student@ug.edu.gh", "password": "student123"}
ADMIN = {"email": "admin@ug.edu.gh", "password": "admin123"}


@pytest.fixture(scope="module")
def student_token():
    r = requests.post(f"{API}/auth/login", json=STUDENT, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ---------- Auth ----------
class TestAuth:
    def test_login_student(self):
        r = requests.post(f"{API}/auth/login", json=STUDENT, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        u = data["user"]
        assert u["email"] == STUDENT["email"]
        assert u["role"] == "user"
        assert u["onboarded"] is True
        assert "_id" not in u and "password_hash" not in u

    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "admin"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": STUDENT["email"], "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_signup_and_duplicate(self):
        email = f"test_{uuid.uuid4().hex[:8]}@ug.edu.gh"
        payload = {"email": email, "password": "abc123", "name": "TEST User"}
        r = requests.post(f"{API}/auth/signup", json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "token" in d
        assert d["user"]["onboarded"] is False
        # duplicate
        r2 = requests.post(f"{API}/auth/signup", json=payload, timeout=15)
        assert r2.status_code == 400

    def test_me_requires_token(self):
        assert requests.get(f"{API}/me", timeout=15).status_code == 401

    def test_me_with_token(self, student_token):
        r = requests.get(f"{API}/me", headers=h(student_token), timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == STUDENT["email"]
        assert "password_hash" not in u and "_id" not in u


# ---------- Reference data ----------
class TestReference:
    def test_programs(self):
        r = requests.get(f"{API}/programs", timeout=15)
        assert r.status_code == 200
        progs = r.json()
        assert len(progs) == 4
        ids = {p["id"] for p in progs}
        assert ids == {"cs", "ba", "nu", "eng"}

    def test_levels(self):
        r = requests.get(f"{API}/levels", timeout=15)
        assert r.status_code == 200
        assert r.json() == ["100", "200", "300", "400"]

    def test_courses_filter(self):
        r = requests.get(f"{API}/courses", params={"program": "cs", "level": "300"}, timeout=15)
        assert r.status_code == 200
        courses = r.json()
        assert len(courses) >= 1
        for c in courses:
            assert c["program"] == "cs" and c["level"] == "300"
            assert "_id" not in c


# ---------- Onboarding ----------
class TestOnboarding:
    def test_onboarding_new_user(self):
        email = f"onb_{uuid.uuid4().hex[:8]}@ug.edu.gh"
        r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "abc123"}, timeout=15)
        tok = r.json()["token"]
        assert r.json()["user"]["onboarded"] is False
        r2 = requests.post(f"{API}/me/onboarding",
                           headers=h(tok),
                           json={"name": "TEST Onb", "program": "ba", "level": "200"}, timeout=15)
        assert r2.status_code == 200
        u = r2.json()
        assert u["onboarded"] is True
        assert u["program"] == "ba" and u["level"] == "200"


# ---------- Courses / Timetable / Resources ----------
class TestStudentData:
    def test_my_courses(self, student_token):
        r = requests.get(f"{API}/me/courses", headers=h(student_token), timeout=15)
        assert r.status_code == 200
        courses = r.json()
        assert isinstance(courses, list) and len(courses) == 4
        for c in courses:
            assert c["program"] == "cs" and c["level"] == "300"

    def test_set_my_courses_persists(self, student_token):
        # Get available cs/300 courses, pick first 3
        r = requests.get(f"{API}/courses", params={"program": "cs", "level": "300"}, timeout=15)
        ids = [c["id"] for c in r.json()[:3]]
        r2 = requests.post(f"{API}/me/courses", headers=h(student_token), json={"course_ids": ids}, timeout=15)
        assert r2.status_code == 200
        # verify GET
        r3 = requests.get(f"{API}/me/courses", headers=h(student_token), timeout=15)
        assert {c["id"] for c in r3.json()} == set(ids)
        # restore 4
        all_ids = [c["id"] for c in r.json()[:4]]
        requests.post(f"{API}/me/courses", headers=h(student_token), json={"course_ids": all_ids}, timeout=15)

    def test_timetable_mine(self, student_token):
        r = requests.get(f"{API}/timetable/mine", headers=h(student_token), timeout=15)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        # sorted by day/start
        for i in range(1, len(docs)):
            a, b = docs[i - 1], docs[i]
            assert (a["day_of_week"], a["start_time"]) <= (b["day_of_week"], b["start_time"])

    def test_timetable_today(self, student_token):
        r = requests.get(f"{API}/timetable/today", headers=h(student_token), timeout=15)
        assert r.status_code == 200
        # weekend may return []
        assert isinstance(r.json(), list)

    def test_resources_default(self, student_token):
        r = requests.get(f"{API}/resources", headers=h(student_token), timeout=15)
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        for d in docs:
            assert "_id" not in d

    def test_resources_by_course(self, student_token):
        courses = requests.get(f"{API}/me/courses", headers=h(student_token), timeout=15).json()
        cid = courses[0]["id"]
        r = requests.get(f"{API}/resources", params={"course_id": cid}, headers=h(student_token), timeout=15)
        assert r.status_code == 200
        for d in r.json():
            assert d["course_id"] == cid


# ---------- Scripture ----------
class TestScripture:
    def test_scripture_today_deterministic(self):
        r1 = requests.get(f"{API}/scripture/today", timeout=15).json()
        r2 = requests.get(f"{API}/scripture/today", timeout=15).json()
        assert r1 == r2
        assert r1["ref"] and r1["text"]


# ---------- Planner ----------
class TestPlanner:
    def test_task_crud_and_day(self, student_token):
        today = date.today().isoformat()
        payload = {"title": "TEST Study block", "start_time": "18:00", "end_time": "19:00",
                   "date": today, "notes": "TEST"}
        r = requests.post(f"{API}/planner/tasks", headers=h(student_token), json=payload, timeout=15)
        assert r.status_code == 200
        task = r.json()
        assert task["title"] == payload["title"]
        tid = task["id"]

        # list
        r2 = requests.get(f"{API}/planner/tasks", params={"date": today}, headers=h(student_token), timeout=15)
        assert r2.status_code == 200
        assert any(t["id"] == tid for t in r2.json())

        # day merged
        r3 = requests.get(f"{API}/planner/day", params={"date": today}, headers=h(student_token), timeout=15)
        assert r3.status_code == 200
        day = r3.json()
        assert day["date"] == today
        blocks = day["blocks"]
        # our task must be present
        assert any(b["kind"] == "task" and b["id"] == tid for b in blocks)
        # classes marked locked=True
        for b in blocks:
            if b["kind"] == "class":
                assert b["locked"] is True
        # sorted by start_time
        starts = [b["start_time"] for b in blocks]
        assert starts == sorted(starts)

        # delete
        r4 = requests.delete(f"{API}/planner/tasks/{tid}", headers=h(student_token), timeout=15)
        assert r4.status_code == 200
        r5 = requests.get(f"{API}/planner/tasks", params={"date": today}, headers=h(student_token), timeout=15)
        assert not any(t["id"] == tid for t in r5.json())


# ---------- GPA ----------
class TestGpa:
    def test_gpa_calc(self, student_token):
        payload = {
            "semesters": [
                {"semester": "S1", "grades": [
                    {"course_id": "c1", "credit": 3, "grade": "A"},   # 4.0*3=12
                    {"course_id": "c2", "credit": 3, "grade": "B"},   # 3.0*3=9
                ]},
                {"semester": "S2", "grades": [
                    {"course_id": "c3", "credit": 3, "grade": "A-"},  # 3.7*3=11.1
                    {"course_id": "c4", "credit": 3, "grade": "C"},   # 2.0*3=6.0
                ]},
            ]
        }
        r = requests.post(f"{API}/gpa/calculate", headers=h(student_token), json=payload, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total_credits"] == 12
        # S1 GPA = 21/6 = 3.5, S2 GPA = 17.1/6 = 2.85, CGPA = 38.1/12 = 3.175 -> 3.18 (round half even) or 3.17
        assert d["semesters"][0]["gpa"] == 3.5
        assert d["semesters"][1]["gpa"] == 2.85
        assert d["cgpa"] in (3.17, 3.18)


# ---------- Chat ----------
class TestChat:
    def test_chat_flow_and_403(self, student_token):
        my = requests.get(f"{API}/me/courses", headers=h(student_token), timeout=15).json()
        assert my, "student should have selected courses"
        cid = my[0]["id"]

        # send
        r = requests.post(f"{API}/chats/course/{cid}/messages", headers=h(student_token),
                          json={"text": "TEST hello group"}, timeout=15)
        assert r.status_code == 200
        msg = r.json()
        assert msg["text"] == "TEST hello group"
        assert "_id" not in msg

        # get
        r2 = requests.get(f"{API}/chats/course/{cid}/messages", headers=h(student_token), timeout=15)
        assert r2.status_code == 200
        assert any(m["id"] == msg["id"] for m in r2.json())

        # 403 for non-member: create a new user (no courses)
        email = f"nomem_{uuid.uuid4().hex[:8]}@ug.edu.gh"
        s = requests.post(f"{API}/auth/signup", json={"email": email, "password": "abc123"}, timeout=15)
        tok2 = s.json()["token"]
        r3 = requests.get(f"{API}/chats/course/{cid}/messages", headers=h(tok2), timeout=15)
        assert r3.status_code == 403
        r4 = requests.post(f"{API}/chats/course/{cid}/messages", headers=h(tok2),
                           json={"text": "should fail"}, timeout=15)
        assert r4.status_code == 403
