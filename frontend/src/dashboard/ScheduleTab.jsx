import { useState } from 'react';
import { fmt, toLocalInput, useFetch } from '../api';
import { Empty, EventPicker, Field, SectionTitle } from './ui';

const emptySession = { title: '', topic: '', speaker: '', location: '', startTime: '', endTime: '' };
const timeOnly = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function SessionRow({ s, children }) {
  return (
    <article className="portal-item">
      <div>
        <strong>{s.title}</strong>
        <p>{s.topic || 'Session'} · Speaker: {s.speaker || 'TBA'} · {s.location || 'Main hall'}</p>
        <small>{s.event?.title ? `${s.event.title} · ` : ''}{fmt(s.startTime)} — {timeOnly(s.endTime)} · {s.registeredCount} registered · {s.bookmarkCount} saved</small>
      </div>
      <div className="portal-actions">{children}</div>
    </article>
  );
}

export function OrganizerSchedule({ ctx }) {
  const { api, run, events, live } = ctx;
  const [eventId, setEventId] = useState('');
  const [form, setForm] = useState(emptySession);
  const [editingId, setEditingId] = useState('');
  const { data, reload } = useFetch(api, eventId ? `/portal/events/${eventId}/schedule` : null, live);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime).toISOString() };
    if (await run(() => api(`/portal/organizer/events/${eventId}/schedule/${editingId || 'new'}`, { method: 'POST', body }))) { setForm(emptySession); setEditingId(''); reload(); }
  };
  const edit = (s) => { setEditingId(s._id); setForm({ title: s.title, topic: s.topic || '', speaker: s.speaker || '', location: s.location || '', startTime: toLocalInput(s.startTime), endTime: toLocalInput(s.endTime) }); };
  const remove = async (s) => { if (window.confirm(`Delete "${s.title}"? Registered attendees will be notified.`) && await run(() => api(`/portal/organizer/schedule/${s._id}`, { method: 'DELETE' }))) reload(); };

  return (
    <>
      <SectionTitle kicker="SCHEDULE MANAGEMENT" title="Sessions & workshops" />
      <EventPicker events={events} value={eventId} onChange={(v) => { setEventId(v); setEditingId(''); setForm(emptySession); }} />
      {eventId && (
        <>
          <form className="dashboard-event-form compact" onSubmit={submit}>
            <Field label="Session title *"><input value={form.title} onChange={set('title')} required /></Field>
            <Field label="Topic"><input value={form.topic} onChange={set('topic')} /></Field>
            <Field label="Speaker"><input value={form.speaker} onChange={set('speaker')} /></Field>
            <Field label="Location / room"><input value={form.location} onChange={set('location')} /></Field>
            <Field label="Start *"><input type="datetime-local" value={form.startTime} onChange={set('startTime')} required /></Field>
            <Field label="End *"><input type="datetime-local" value={form.endTime} onChange={set('endTime')} min={form.startTime} required /></Field>
            <div className="dashboard-form-actions">
              <button className="nav-cta">{editingId ? 'Save changes' : 'Add session'}</button>
              {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(''); setForm(emptySession); }}>Cancel</button>}
            </div>
          </form>
          <div className="portal-list">
            {data && data.sessions.length === 0 && <Empty>No sessions yet.</Empty>}
            {data?.sessions.map((s) => <SessionRow key={s._id} s={s}><button className="secondary-button" onClick={() => edit(s)}>Edit</button><button className="dashboard-delete" onClick={() => remove(s)}>Delete</button></SessionRow>)}
          </div>
        </>
      )}
    </>
  );
}

function SessionActions({ s, ctx, reload }) {
  const { api, run } = ctx;
  const toggleRegister = async () => { if (await run(() => api(`/portal/schedule/${s._id}/register`, { method: s.registered ? 'DELETE' : 'POST' }))) reload(); };
  const bookmark = async () => { if (await run(() => api(`/portal/schedule/${s._id}/bookmark`, { method: 'POST' }))) reload(); };
  return (
    <>
      <button className={s.registered ? 'secondary-button' : 'nav-cta'} onClick={toggleRegister}>{s.registered ? 'Cancel registration' : 'Register'}</button>
      <button className="secondary-button" onClick={bookmark}>{s.bookmarked ? '★ Saved' : '☆ Bookmark'}</button>
    </>
  );
}

export function BrowseSchedule({ ctx }) {
  const { api, events, live } = ctx;
  const [eventId, setEventId] = useState('');
  const { data, reload } = useFetch(api, eventId ? `/portal/events/${eventId}/schedule` : null, live);
  return (
    <>
      <SectionTitle kicker="EVENT SCHEDULE" title="Sessions & workshops" />
      <EventPicker events={events} value={eventId} onChange={setEventId} />
      <div className="portal-list">
        {data && data.sessions.length === 0 && <Empty>No sessions have been scheduled yet.</Empty>}
        {data?.sessions.map((s) => <SessionRow key={s._id} s={s}><SessionActions s={s} ctx={ctx} reload={reload} /></SessionRow>)}
      </div>
    </>
  );
}

export function SavedSessions({ ctx }) {
  const { api, live } = ctx;
  const { data, reload } = useFetch(api, '/portal/schedule/bookmarks', live);
  return (
    <>
      <SectionTitle kicker="MY SCHEDULE" title="Registered & bookmarked sessions" />
      <p className="profile-note">You get an in-app notification (and an email, if enabled in your profile) shortly before each of these sessions starts.</p>
      <div className="portal-list">
        {data && data.sessions.length === 0 && <Empty>Nothing saved yet. Open Schedule to register for or bookmark sessions.</Empty>}
        {data?.sessions.map((s) => <SessionRow key={s._id} s={s}><SessionActions s={s} ctx={ctx} reload={reload} /></SessionRow>)}
      </div>
    </>
  );
}
