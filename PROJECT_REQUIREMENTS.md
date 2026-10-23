# EventSphere Management — eProject Requirements Coverage

## Implemented Functional Areas

### User Authentication
- Registration and secure login with JWT.
- Roles: Organizer, Exhibitor, Attendee.
- Password hashing with bcrypt.
- Email verification and forgot/reset password flows.

### Organizer Dashboard
- Create, edit, publish/draft and delete expos.
- Manage title, theme/category, date, location, description, image and capacity.
- Exhibitor application review: approve/reject.
- Booth floor plan generation and booth assignment to approved exhibitors.
- Schedule/session management with speaker, topic, time and location.
- Analytics: attendee registrations, capacity usage, exhibitor applications, approvals, booths and popular sessions.
- Feedback and issue review.

### Exhibitor Portal
- Company/brand profile fields.
- Expo application with company details, products/services and document/logo references.
- Application status tracking.
- Assigned booth display.

### Attendee Interface
- Browse published events.
- Event registration and bookmarks.
- Schedule browsing and session registration.
- Exhibitor search/filter by company/products/keywords.
- Feedback and issue reporting.

### General Features
- Protected role-based API routes.
- Dashboard refresh polling for near-real-time event updates.
- Feedback/support mechanism.
- Responsive dark-purple interface.

## Requirements that need external infrastructure or final documentation
- True WebSocket/live chat: current messaging API is prepared, but the UI does not claim a full real-time chat client.
- Email/SMS/push notifications: email authentication is implemented; reminder delivery needs a production notification service.
- Automated MongoDB backups, uptime monitoring, penetration testing and 99% uptime depend on hosting/operations.
- Full unit/integration/E2E test suite should be added as a separate QA deliverable.
- Video requirement: record the completed application workflow for the submission documentation.
- GDPR/legal consent wording should be finalized with the project owner/institution.
