import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { makeApi, useFetch } from '../api';
import { useRealtime } from '../useRealtime';
import { PortalCard } from '../dashboard/ui';
import { BrowseEvents, OrganizerEvents } from '../dashboard/EventsTab';
import ExhibitorsAdminTab from '../dashboard/ExhibitorsAdminTab';
import FloorPlanTab from '../dashboard/FloorPlanTab';
import { BrowseSchedule, OrganizerSchedule, SavedSessions } from '../dashboard/ScheduleTab';
import AnalyticsTab from '../dashboard/AnalyticsTab';
import DirectoryTab from '../dashboard/DirectoryTab';
import ExhibitorPortalTab from '../dashboard/ExhibitorPortalTab';
import MessagesTab from '../dashboard/MessagesTab';
import { FeedbackForm, FeedbackInbox } from '../dashboard/FeedbackTab';
import NotificationsTab from '../dashboard/NotificationsTab';
import ProfileTab from '../dashboard/ProfileTab';
import './Dashboard.css';

const TABS = {
  organizer: ['overview', 'events', 'exhibitors', 'floorplan', 'schedule', 'analytics', 'messages', 'feedback', 'notifications', 'profile'],
  exhibitor: ['applications', 'events', 'floorplan', 'messages', 'notifications', 'feedback', 'profile'],
  attendee: ['events', 'exhibitors', 'floorplan', 'schedule', 'bookmarks', 'messages', 'notifications', 'feedback', 'profile'],
};
const LABELS = { floorplan: 'Floor plan', bookmarks: 'My schedule', applications: 'My applications' };
const HEADINGS = {
  organizer: ['Run your expo from one place.', 'Manage expos, exhibitors, booths, schedules and performance.'],
  exhibitor: ['Build your brand presence.', 'Apply for expos, reserve your booth, manage your profile and meet your neighbours.'],
  attendee: ['Plan your event experience.', 'Discover events, register for sessions, explore exhibitors and share feedback.'],
};

function readUser() { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } }

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [user, setUser] = useState(readUser);
  const role = TABS[user.role] ? user.role : 'attendee';
  const api = useMemo(() => makeApi(token), [token]);

  const [tab, setTab] = useState(() => {
  const wanted = new URLSearchParams(window.location.search).get('tab');
  return TABS[role].includes(wanted) ? wanted : TABS[role][0];
});
  const [toast, setToast] = useState({ text: '', error: false });
  const [live, setLive] = useState(0);        // bumps on schedule / booth / analytics / event changes
  const [msgTick, setMsgTick] = useState(0);  // bumps on new messages
  const [compose, setCompose] = useState(null);
  const [focusEvent, setFocusEvent] = useState('');
  const toastTimer = useRef(null);

  const logout = useCallback(() => { ['token', 'user', 'username', 'role'].forEach((k) => localStorage.removeItem(k)); navigate('/login'); }, [navigate]);
  const flash = useCallback((text, error = false) => {
    setToast({ text, error });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast({ text: '', error: false }), 4000);
  }, []);

  // Runs an API action: shows the server's message on success, or the error on failure. Returns the result or null.
  const run = useCallback(async (fn) => {
    try {
      const result = await fn();
      if (result?.message) flash(result.message);
      return result || {};
    } catch (e) {
      if (e.status === 401) { logout(); return null; }
      flash(e.message, true);
      return null;
    }
  }, [flash, logout]);

  const eventsFetch = useFetch(api, role === 'organizer' ? '/events/mine' : '/events', live);
  const events = useMemo(() => eventsFetch.data?.events || [], [eventsFetch.data]);
  const notifFetch = useFetch(api, '/portal/notifications', live + msgTick);
  const notifications = { items: notifFetch.data?.notifications || [], unread: notifFetch.data?.unread || 0 };
  const eventIds = useMemo(() => events.map((e) => e._id), [events]);

  useEffect(() => { if (!token) navigate('/login'); }, [token, navigate]);
  useEffect(() => { if (eventsFetch.error && /sign in|expired/i.test(eventsFetch.error)) logout(); }, [eventsFetch.error, logout]);

  const bump = useCallback(() => setLive((n) => n + 1), []);
  useRealtime(token, {
    'event:changed': bump, 'schedule:changed': bump, 'booths:changed': bump, 'analytics:changed': bump,
    'message:new': () => setMsgTick((n) => n + 1),
    'notification:new': (n) => { flash(`🔔 ${n.title}`); notifFetch.reload(); },
  }, eventIds);

  const openMessage = useCallback((id, name) => { setCompose({ id, name }); setTab('messages'); }, []);
  const clearCompose = useCallback(() => setCompose(null), []);
  const saveUser = useCallback((u) => setUser((prev) => { const next = { ...prev, ...u, id: prev.id || u.id || u._id }; localStorage.setItem('user', JSON.stringify(next)); return next; }), []);

  const ctx = { api, run, user, role, events, reloadEvents: eventsFetch.reload, live, msgTick, compose, clearCompose, openMessage, notifications, reloadNotifications: notifFetch.reload, setTab, focusEvent, setFocusEvent, saveUser, logout };
  const [title, subtitle] = HEADINGS[role];

  const content = {
    overview: <section className="portal-grid">{[['Event Management', 'Create, edit, publish or draft expos.', 'events'], ['Exhibitor Management', 'Review applications and approve or reject exhibitors.', 'exhibitors'], ['Booth Floor Plan', 'Generate booths, confirm reservations and assign exhibitors.', 'floorplan'], ['Schedule', 'Create and update sessions, speakers, topics and locations.', 'schedule'], ['Analytics', 'Live registrations, engagement, booth traffic and session popularity.', 'analytics'], ['Feedback & Support', 'Review suggestions and reported issues.', 'feedback']].map(([t, d, to]) => <PortalCard key={to} title={t} text={d} onClick={() => setTab(to)} />)}</section>,
    events: role === 'organizer' ? <OrganizerEvents ctx={ctx} /> : <BrowseEvents ctx={ctx} />,
    exhibitors: role === 'organizer' ? <ExhibitorsAdminTab ctx={ctx} /> : <DirectoryTab ctx={ctx} />,
    applications: <ExhibitorPortalTab ctx={ctx} />,
    floorplan: <FloorPlanTab ctx={ctx} />,
    schedule: role === 'organizer' ? <OrganizerSchedule ctx={ctx} /> : <BrowseSchedule ctx={ctx} />,
    bookmarks: <SavedSessions ctx={ctx} />,
    analytics: <AnalyticsTab ctx={ctx} />,
    messages: <MessagesTab ctx={ctx} />,
    feedback: role === 'organizer' ? <FeedbackInbox ctx={ctx} /> : <FeedbackForm ctx={ctx} />,
    notifications: <NotificationsTab ctx={ctx} />,
    profile: <ProfileTab ctx={ctx} />,
  }[tab];

  return (
    <main className="dashboard-page" id="main">
      <a className="skip-link" href="#dashboard-content">Skip to content</a>
      <header className="dashboard-header">
        <Link to="/" className="brand"><span className="brand-icon">E</span><span>Event<span className="brand-accent">Sphere</span></span></Link>
        <nav aria-label="Account">
          <Link to="/">Explore</Link>
          <Link to="/help">Help</Link>
          <button className="bell" onClick={() => setTab('notifications')} aria-label={`Notifications, ${notifications.unread} unread`}>🔔{notifications.unread > 0 && <span className="badge">{notifications.unread}</span>}</button>
          <span className="dashboard-user">{user.name || 'Member'} · {role}</span>
          <button className="dashboard-logout" onClick={logout}>Sign out</button>
        </nav>
      </header>
      <div className="dashboard-container" id="dashboard-content">
        <motion.div className="dashboard-welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="section-kicker">EVENTSPHERE {role.toUpperCase()} WORKSPACE</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </motion.div>
        <div className="portal-tabs" role="tablist" aria-label="Workspace sections">
          {TABS[role].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {LABELS[t] || t.replace(/^./, (x) => x.toUpperCase())}{t === 'notifications' && notifications.unread > 0 ? ` (${notifications.unread})` : ''}
            </button>
          ))}
        </div>
        <div className="toast-area" role="status" aria-live="polite">{toast.text && <div className={`dashboard-message ${toast.error ? 'error' : 'success'}`}>{toast.text}</div>}</div>
        {eventsFetch.error && !events.length && <div className="dashboard-message error">{eventsFetch.error}</div>}
        {content}
        <p className="dashboard-footnote">EventSphere Management · <Link to="/privacy">Privacy</Link> · <Link to="/help">Help & FAQ</Link></p>
      </div>
    </main>
  );
}
