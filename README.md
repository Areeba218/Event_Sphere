<<<<<<< HEAD
# EventSphere Management

Web platform for expos and trade shows: organizers manage events, exhibitors and booths; exhibitors apply and pick booths; attendees discover events, sessions and exhibitors. **Stack:** MongoDB · Express · React (Vite) · Node.js · Socket.IO.

| Document | Purpose |
|---|---|
| `REQUIREMENTS_COVERAGE.md` | Every requirement from the brief and where it is implemented / tested |
| `docs/USER_GUIDE.md` | Step-by-step guide per role (also in-app at `/help`) |
| `docs/DEVELOPER_GUIDE.md` | Architecture, API reference, security, operations |
| `docs/FAQ.md` | Frequently asked questions |
| `docs/VIDEO_SCRIPT.md` | Script for the required demo video |

## Run it (Windows / macOS / Linux)

Requirements: Node.js 20+, a MongoDB database (Atlas or local).

```bash
# 1. Backend
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env   then edit the values
npm run dev                   # http://localhost:5000  (health check: /health)

# 2. Frontend (new terminal)
cd frontend
npm install
copy .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                   # http://localhost:5173
```

No SMTP account yet? Set `EMAIL_MODE=console` in `backend/.env`: verification and reset links are printed in the backend terminal.

**Demo data** (for testing or the video): `cd backend && npm run seed` creates verified accounts (password `Demo1234`): `organizer@`, `attendee@`, `exhibitor1@`, `exhibitor2@`, `exhibitor3@` + `demo.eventsphere.test`, one expo, 18 booths and two sessions.

## Tests

```bash
cd backend
npm test        # unit + API + end-to-end journey + real-time (Socket.IO)
```
Tests use a throw-away database. By default `mongodb-memory-server` downloads a MongoDB binary on first run; or point `MONGO_URI_TEST` at a local MongoDB (the database is wiped, never use your real one). Frontend: `cd frontend && npm run lint && npm run build`.

## Operations
`npm run test-email -- you@example.com` checks your SMTP settings. `npm run backup` writes a JSON backup to `backend/backups/` (keeps the last 14); set `BACKUP_EVERY_HOURS=24` for automatic backups; `npm run restore -- backups/<folder>` restores. Logs: `backend/logs/` (`app.log`, `access.log`). Health: `GET /health`. Organizer metrics panel: Analytics tab.

## Before you publish
* **Never commit `backend/.env`.** If real credentials were ever shared or committed, rotate the MongoDB password, `JWT_SECRET` and SMTP app password.
* Serve both apps over HTTPS, set `FRONTEND_URL`, `TRUST_PROXY` (behind a proxy) and restrict organizer sign-up with `ORGANIZER_INVITE_CODE` or `ALLOW_ORGANIZER_SIGNUP=false`.
=======
# Event_Sphere
>>>>>>> 7dfd595669d08038e2d29931f4f6ff8f031632be
