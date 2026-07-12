# UG Campus App — PRD

## Overview
Mobile app for University of Ghana students combining timetable, planner, resources, GPA calculator, study-group chat, and a daily scripture gate. Christian, academically-serious, warm — deliberately not a corporate SaaS look.

## Stack (as executed in Emergent environment)
- Frontend: Expo (React Native, SDK 54) with Expo Router — mobile-first, also runs on web preview.
- Backend: FastAPI (Python) + MongoDB (motor).
- Auth: JWT (HS256) + bcrypt. No email verification (demo).

Note: The user's original brief requested Next.js + PostgreSQL. Emergent environment is Expo + FastAPI + MongoDB; user chose "1a" (adapt to platform) in the initial ask_human.

## Design system
- Palette: navy `#0B132B` primary, gold `#D4AF37` accent, sage `#4A5D23` secondary, cream paper `#F3EEE0`, off-white bg `#FAFAF6`.
- Type: serif (Georgia / system serif) for headings, system sans for body, monospace (Menlo / monospace) for course codes, times, GPAs.
- Signature layout element: **Today Strip** — a horizontal continuous timeline on the Dashboard showing verse of the day → today's classes → free slots, connected by a gold line with dot markers on each card.

## Features implemented
1. Auth — signup, login, JWT-secured routes; token stored via `@/src/utils/storage` secureSet.
2. Onboarding — collect full name, program (CS/BA/NU/ENG), level (100/200/300/400).
3. Course selection — filtered by program+level; checkbox list; saved per user; auto-joins course chats.
4. Personalized timetable — `/timetable/mine` matches selected courses against master weekly template; grouped by day with "TODAY" pill.
5. Daily scripture — hard-gate screen before dashboard, once per day (persisted flag). 30 seeded verses cycled by day-of-year.
6. Day planner — merges read-only class blocks with editable tasks into one date-scoped agenda; modal add; delete tasks.
7. GPA / CGPA — 4.0 scale, multi-semester entry, per-semester GPA + overall CGPA.
8. Study group chat — one per course, polling every 4s; auto-membership on course selection; server enforces membership.
9. Learning resources — slides + past papers filterable by course and by type.
10. Admin seed — admin user `admin@ug.edu.gh / admin123`; seeded courses / timetable / resources / scriptures at startup.

## API endpoints (all `/api` prefixed)
- POST `/auth/signup`, POST `/auth/login`
- GET `/me`, POST `/me/onboarding`
- GET `/programs`, GET `/levels`, GET `/courses?program=&level=`
- GET `/me/courses`, POST `/me/courses`
- GET `/timetable/mine`, GET `/timetable/today`
- GET `/resources?course_id=`
- GET `/scripture/today`
- GET/POST/DELETE `/planner/tasks`; GET `/planner/day?date=`
- GET `/gpa/scale`, POST `/gpa/calculate`
- GET/POST `/chats/course/{course_id}/messages`

## Seed data
- 4 programs × 4 levels ≈ 55 courses (with realistic UG course codes: CSCD, UGBS, NURS, ENGR, UGRC).
- Weekly timetable slot per course (Mon–Fri).
- 3 resources per course (2 slides, 1 past paper).
- 30 scripture verses.
- Admin + demo student pre-registered.

## Known limitations
- Chat is polling (not WebSocket) — user chose 3b.
- Admin UI omitted per user choice (4b: seed + minimal admin login).
- Fonts use system serif/sans/mono to guarantee reliability on Expo Go (Georgia on iOS, "serif" on Android).
