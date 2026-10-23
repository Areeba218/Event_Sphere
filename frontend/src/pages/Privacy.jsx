import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Privacy() {
  return (
    <main className="doc-page" id="main">
      <Link to="/" className="brand"><span className="brand-icon">E</span><span>Event<span className="brand-accent">Sphere</span></span></Link>
      <h1>Privacy Policy</h1>
      <p className="doc-meta">Version 2026-10 · applies to the EventSphere Management platform</p>

      <h2>What we collect</h2>
      <p>Your name, email address, role and password (stored only as a salted bcrypt hash); for exhibitors, company details, logo, documents and contact information you choose to provide; and your activity inside the platform: event registrations, bookmarks, session registrations, exhibitor-profile views, messages, feedback and notifications.</p>

      <h2>Why we use it</h2>
      <p>To run your account, let organizers manage events, let exhibitors and attendees find and contact each other, send reminders and notifications, and give organizers aggregated reports (registrations, engagement, booth traffic). We do not sell your data and do not use it for advertising.</p>

      <h2>Who can see what</h2>
      <p>Organizers see registrations and applications for their own events only. Other users see an exhibitor's public company profile. Your email and phone are shown to other users only while <em>“Share my email and phone”</em> is enabled in your profile. Analytics shown to organizers are aggregated.</p>

      <h2>Your rights (GDPR)</h2>
      <ul>
        <li><strong>Consent:</strong> you accept this policy when registering; the date is stored on your account.</li>
        <li><strong>Access &amp; portability:</strong> Profile → Privacy &amp; data → <em>Download my data</em> gives you a JSON file of your data.</li>
        <li><strong>Rectification:</strong> edit your details at any time in Profile.</li>
        <li><strong>Erasure:</strong> Profile → <em>Delete my account</em> removes your account, registrations, applications, messages, feedback and notifications.</li>
        <li><strong>Control:</strong> choose whether contact details are shared and whether reminder emails are sent.</li>
      </ul>

      <h2>Security &amp; retention</h2>
      <p>Passwords are hashed; sessions use signed tokens; traffic must be served over HTTPS in production; uploaded files are type-checked. Data is kept while your account exists. Operational backups are rotated automatically and deleted after their retention period.</p>

      <h2>Contact</h2>
      <p>Questions or requests: use <Link to="/dashboard">Feedback &amp; Support</Link> in your workspace or contact the organizer of your event.</p>
      <p><Link to="/">← Back to home</Link></p>
    </main>
  );
}
