import { Link } from 'react-router-dom';
import './Dashboard.css';

const GUIDES = [
  ['Attendees', ['Register and verify your email, then sign in.', 'Events → Register (or Bookmark) for expos that interest you.', 'Schedule → pick an event, then Register or Bookmark sessions. You are reminded before they start.', 'Exhibitors → search by keyword, category or event; open the floor plan to find a booth; Message an exhibitor.', 'Feedback → send suggestions or report an issue.']],
  ['Exhibitors', ['Register as an exhibitor and verify your email.', 'My applications → apply to an expo with company details, logo and documents (upload PDFs or images).', 'When approved, open Floor plan, choose a free booth and reserve it; the organizer confirms.', 'Click your booth to add products, details and staff, and to see and message neighbouring exhibitors.', 'Use Edit profile to update your logo, description and contact details at any time.']],
  ['Organizers', ['Events → create an expo (draft or published) with theme, dates, location and capacity.', 'Exhibitors → review applications; approve or reject with an optional note.', 'Floor plan → generate booths, then confirm reservations or assign approved exhibitors.', 'Schedule → add sessions with speaker, topic and room; edits notify registered attendees.', 'Analytics → live registrations, engagement, booth traffic and session popularity; export a CSV report.']],
];
const FAQ = [
  ['I did not get the verification email.', 'Check spam. If you still cannot find it, ask the administrator to confirm the email settings, then register again.'],
  ['I forgot my password.', 'Use “Forgot password” on the sign-in page. The reset link expires after a short time.'],
  ['Why can’t I reserve a booth?', 'Only approved exhibitors can reserve, each exhibitor can hold one booth per event, and the booth must still be available.'],
  ['How do reminders work?', 'Sessions you registered for or bookmarked trigger an in-app notification about 30 minutes before they start, plus an email if you left reminder emails on.'],
  ['Can other people see my email?', 'Only if “Share my email and phone” is on in your profile. You can switch it off at any time.'],
  ['How do I delete my data?', 'Profile → Privacy & data. You can download your data or delete your account.'],
  ['Which browsers are supported?', 'Current Chrome, Firefox, Safari and Edge, on desktop and mobile.'],
  ['Where do I report a problem?', 'Dashboard → Feedback → “Report an issue”.'],
];

export default function Help() {
  return (
    <main className="doc-page" id="main">
      <Link to="/" className="brand"><span className="brand-icon">E</span><span>Event<span className="brand-accent">Sphere</span></span></Link>
      <h1>Help &amp; FAQ</h1>
      <h2>Quick start guides</h2>
      {GUIDES.map(([role, steps]) => <section key={role}><h3>{role}</h3><ol>{steps.map((s) => <li key={s}>{s}</li>)}</ol></section>)}
      <h2>Frequently asked questions</h2>
      {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      <p><Link to="/">← Back to home</Link> · <Link to="/privacy">Privacy Policy</Link></p>
    </main>
  );
}
