# Developer guide

## Layout
```
backend/
  app.js            Express app factory (security, limits, routes, errors)  — used by server.js and tests
  server.js         DB connect, HTTP + Socket.IO, background jobs, graceful shutdown
  models/           User, Event, ExhibitorApplication, Booth, ScheduleSession, Feedback, Message, Notification, Visit
  controllers/      auth, event, exhibitor, booth, schedule, analytics, communication, profile (+ privacy)
  routes/           auth, events, portal, uploads
  middleware/       auth (requireAuth/optionalAuth/requireRole), sanitize, upload, errorHandler
  utils/            realtime, notify, jobs (reminders, backups), logger, metrics, csv, booths, validators, sendEmail
  scripts/          backup, restore, seed
  tests/            unit, api (end-to-end journey), realtime
frontend/src/
  api.js            fetch helper, useFetch hook, upload/download
  useRealtime.js    Socket.IO client hook
  pages/            Home (App.jsx), Login, Register, Dashboard (shell), Privacy, Help …
  dashboard/        one component per workspace tab
```

## Key design decisions
* **Roles:** `organizer`, `exhibitor`, `attendee`. `requireRole` guards routes; controllers additionally check object ownership (an organizer can only touch their own events).
* **Booth lifecycle:** `available → reserved` (exhibitor, atomic `findOneAndUpdate`) `→ assigned` (organizer confirms) `→ available` (release / rejection / account deletion).
* **Floor plan:** booths `B01..Bnn` laid out on a grid (`columns` per row). Neighbours = touching cells incl. diagonals (`utils/booths.js`).
* **Real-time:** Socket.IO rooms `public`, `user:<id>`, `event:<id>`. Events carry only ids; clients refetch through the authenticated REST API, so no private data travels over the socket. Events: `event:changed`, `schedule:changed`, `booths:changed`, `analytics:changed`, `notification:new`, `message:new`.
* **Reminders:** `utils/jobs.js` runs every minute; sessions starting within `REMINDER_MINUTES` get one notification (claimed atomically via `remindedAt`, safe with multiple instances).
* **Privacy:** attendee/bookmark id lists never leave the API (counts + the caller's own flags are returned); contact details obey `shareContact`.

## API overview (all under `/api`, JSON; `Authorization: Bearer <token>`)
| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (needs `consent:true`), `GET /auth/verify-email/:token`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password/:token` |
| Events | `GET /events` `GET /events/:id` `GET /events/mine` `POST /events` `PUT/DELETE /events/:id` `POST/DELETE /events/:id/register` `POST /events/:id/bookmark` |
| Applications | `POST /portal/exhibitor/apply` `GET /portal/exhibitor/applications` `PATCH /portal/exhibitor/applications/:id` `GET /portal/organizer/events/:id/applications` `PATCH /portal/organizer/applications/:id` |
| Booths | `GET /portal/events/:id/booths` `POST /portal/organizer/events/:id/booths` `PATCH /portal/organizer/booths/:id/assign\|release` `POST/DELETE /portal/exhibitor/booths/:id/reserve` `PATCH /portal/exhibitor/booths/:id` `GET /portal/exhibitor/booths/:id/neighbors` |
| Directory | `GET /portal/exhibitors/search?search&category&eventId` `POST /portal/exhibitors/:applicationId/view` |
| Schedule | `GET /portal/events/:id/schedule` `POST /portal/organizer/events/:id/schedule/:id\|new` `DELETE /portal/organizer/schedule/:id` `POST/DELETE /portal/schedule/:id/register` `POST /portal/schedule/:id/bookmark` `GET /portal/schedule/bookmarks` |
| Analytics | `GET /portal/organizer/events/:id/analytics[/export]` `GET /portal/organizer/metrics` |
| Communication | `POST/GET /portal/messages` `GET /portal/messages/threads` `GET /portal/notifications` `PATCH /portal/notifications/read-all\|:id/read` `POST /portal/feedback` … |
| Account | `GET/PUT /portal/profile` `POST /portal/profile/password` `GET /portal/privacy/export` `DELETE /portal/privacy/account` |
| Files | `POST /uploads` (multipart `file`) → `{url}`; served from `/uploads/<hex>.<ext>` |
| Ops | `GET /health` (no auth) |

## Security checklist implemented
helmet headers · CORS allow-list (`FRONTEND_URL`) · rate limits (`API_RATE_LIMIT`, `AUTH_RATE_LIMIT`) · bcrypt(12) · JWT secret from env · body size limit · `$`/`.` key stripping · type checks on auth inputs · regex escaping in searches · field whitelists (no mass assignment) · upload allow-list + magic-number check + random names + `nosniff` · ObjectId validation (400 not 500) · CSV formula neutralisation · no stack traces to clients.

## Scaling notes
Run several API instances behind a load balancer (set `TRUST_PROXY`). For Socket.IO across instances use sticky sessions or `@socket.io/redis-adapter`. Move uploads to object storage (S3 etc.) when running more than one instance. Reminder and backup jobs are safe to run on several instances (reminders are claimed atomically; run backups on one).

## Testing
`npm test` in `backend/`. Helpers in `tests/helpers.js` sign users up through the real email flow (`EMAIL_MODE=console` outbox). Jest is deliberately not used: its sandbox breaks the MongoDB driver handshake; Mocha + `expect` are used with a Jest-style alias (`tests/setup.js`).
