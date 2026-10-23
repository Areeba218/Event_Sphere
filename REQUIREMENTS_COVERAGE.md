# Requirements coverage

Legend: ✅ implemented and covered by automated tests · 🟢 implemented, verified manually/by build · 🟡 implemented, needs deployment-side setup · 📄 documentation/deliverable

## Functional requirements
| Requirement | Status | Where |
|---|---|---|
| Registration & login for organizers, exhibitors, attendees with roles | ✅ | `authController`, `Register.jsx`, `Login.jsx`; `api.test.js` (auth) |
| Email verification | ✅ | verify-email flow; test helper signs users up via the emailed link |
| Forgot / reset password | ✅ | `authController`; test "forgot / reset password works" |
| Password encryption | ✅ | bcrypt hashes; test asserts the stored hash is not the password |
| Password policy (8+, letter + number), change password | ✅ | `utils/validators.js`, `profileController.changePassword` |
| Create / edit / delete expos (title, date, location, description, theme…) | ✅ | `eventController`, `EventsTab.jsx` (theme, end date, capacity, draft/published) |
| Allocate booths on a floor plan | ✅ | `boothController`, `FloorPlanTab.jsx` (grid generator, assign, confirm, release) |
| View / approve / reject exhibitor applications | ✅ | `exhibitorController.reviewApplication`, `ExhibitorsAdminTab.jsx` (with note to exhibitor) |
| Assign booths, manage booth details | ✅ | assign/release endpoints + organizer panel |
| Schedules: slots, sessions, speakers, topics, locations; changes & updates | ✅ | `scheduleController` (validation, room clash detection, edit/delete, attendees notified) |
| Analytics: attendee engagement, booth traffic, session popularity | ✅ | `analyticsController`, `AnalyticsTab.jsx` |
| Real-time analytics | ✅ | Socket.IO `analytics:changed` → panel refreshes live (`realtime.test.js`) |
| Reports | ✅ | CSV export (formula-injection safe) |
| Exhibitor: register for expos with company details, products, documents | ✅ | apply form, **file uploads** (PDF/images, signature-checked) |
| Exhibitor: update profile (logo, description, contacts) | ✅ | `PATCH /exhibitor/applications/:id` + profile page, logo upload |
| Exhibitor: view available booths, select & reserve | ✅ | reserve → organizer confirms; atomic, one booth per exhibitor |
| Exhibitor: manage booth products/services & staff | ✅ | `PATCH /exhibitor/booths/:id` |
| Exhibitor ↔ organizer communication | ✅ | messaging, "Contact organizer", "Message" buttons |
| Exhibitor ↔ neighbouring exhibitors (messaging / contact exchange) | ✅ | grid-adjacency neighbours endpoint (+ unit tests), respects privacy flag |
| Attendee: event details, schedule, exhibitor list, floor plans | ✅ | Events, Schedule, Exhibitors, Floor plan tabs |
| Attendee: register for events, sessions, workshops | ✅ | register/unregister, capacity enforced atomically (race tested) |
| Search / filter exhibitors by category, products, keywords | ✅ | `exhibitors/search` (keyword + category + event, regex-safe) |
| Exhibitor profile & booth location on floor plan | ✅ | "View on floor plan", booth number in results |
| Contact exhibitors (chat / email) | ✅ | threads UI with unread counts |
| Bookmark / register for sessions; notifications & reminders | ✅ | bookmarks, "My schedule", reminder job (once per session; in-app + optional email) |
| Real-time updates (schedules, booth allocations, event details) | ✅ | Socket.IO rooms per event; UI refetches instantly |
| Feedback mechanism / report issues | ✅ | feedback form with rating, organizer inbox with status workflow |

## Non-functional requirements
| Requirement | Status | Notes |
|---|---|---|
| Response time 1–2 s | 🟢 | indexed queries, lean payloads; average latency visible in the metrics panel |
| Scalability / hundreds of concurrent users | 🟡 | stateless JWT API, atomic DB operations, pagination limits. For multiple instances add the Socket.IO Redis adapter (see developer guide) |
| Encryption of sensitive data | 🟡 | passwords hashed; transport encryption requires HTTPS at deployment (HSTS header already sent) |
| Authentication / authorization | ✅ | JWT, role middleware, per-object ownership checks; tests cover forbidden cross-organizer access and role escalation |
| Security hardening | ✅ | helmet, CORS allow-list, rate limits, NoSQL-operator sanitizer, upload type + signature checks, regex escaping, mass-assignment whitelists, ObjectId validation |
| GDPR: consent, control, portability, erasure | ✅ | consent checkbox + timestamp, privacy settings, data export, account deletion, `/privacy` page |
| Uptime 99% / maintenance | 🟡 | `/health` endpoint for monitors, graceful shutdown; hosting SLA is a deployment matter |
| Automated backups | ✅ | `npm run backup`, `BACKUP_EVERY_HOURS`, restore script (round-trip verified) |
| Usability, responsive design | 🟢 | responsive CSS; code-split pages |
| Accessibility (WCAG) | 🟢 | skip link, labelled controls, tab roles, live regions, visible focus; a formal audit (axe/Lighthouse) is recommended before launch |
| Cross-browser / mobile | 🟢 | standard web APIs only; verify on your target devices |
| Logging & monitoring | ✅ | JSON app log, access log (rotated), `/health`, organizer metrics panel |
| Test coverage: unit, integration, end-to-end | ✅ | 39 backend tests: `npm test`. Browser-level UI tests are not included |
| Security testing / penetration tests | 🟡 | automated security regression tests included; an independent penetration test must be commissioned separately |
| User documentation, FAQs, tutorials | 📄 | `docs/USER_GUIDE.md`, `docs/FAQ.md`, in-app `/help` |
| Developer documentation | 📄 | `docs/DEVELOPER_GUIDE.md` |
| **Video of the complete application** | 📄 | **Not producible here.** `docs/VIDEO_SCRIPT.md` + `npm run seed` make recording it a 10-minute job |
