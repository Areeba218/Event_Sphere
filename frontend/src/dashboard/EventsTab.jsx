import { useState } from 'react';
import { fmt, toLocalInput } from '../api';
import { Empty, EventDetail, Field, SectionTitle, Thumb } from './ui';

const empty = { title: '', category: 'Technology', theme: '', description: '', location: '', date: '', endDate: '', capacity: 100, image: '', status: 'published' };
const THEMES = ['Technology', 'Business', 'Healthcare', 'Education', 'Arts & Culture'];

function EventRow({ event, children, onDetails }) {
  return (
    <article className="portal-item">
      <Thumb src={event.image} />
      <div>
        <span className="event-date">{fmt(event.date)}</span>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <small>{event.category}{event.theme ? ` · ${event.theme}` : ''} · {event.location} · {event.registrationCount}/{event.capacity} registered · {event.status}</small>
      </div>
      <div className="portal-actions"><button className="secondary-button" onClick={() => onDetails(event)}>Details</button>{children}</div>
    </article>
  );
}

export function OrganizerEvents({ ctx }) {
  const { api, run, events, reloadEvents } = ctx;
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState('');
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = { ...form, capacity: Number(form.capacity), date: new Date(form.date).toISOString(), endDate: form.endDate ? new Date(form.endDate).toISOString() : null };
    const r = await run(() => api(editingId ? `/events/${editingId}` : '/events', { method: editingId ? 'PUT' : 'POST', body }));
    setSaving(false);
    if (r) { setForm(empty); setEditingId(''); reloadEvents(); }
  };
  const edit = (ev) => {
    setEditingId(ev._id);
    setForm({ title: ev.title, category: ev.category, theme: ev.theme || '', description: ev.description, location: ev.location, date: toLocalInput(ev.date), endDate: toLocalInput(ev.endDate), capacity: ev.capacity, image: ev.image || '', status: ev.status });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const remove = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}" permanently? Its applications, booths and sessions will also be deleted.`)) return;
    if (await run(() => api(`/events/${ev._id}`, { method: 'DELETE' }))) reloadEvents();
  };

  return (
    <>
      <section className="dashboard-form-card">
        <SectionTitle kicker="EXPO MANAGEMENT" title={editingId ? 'Edit expo' : 'Create expo'} />
        <form className="dashboard-event-form" onSubmit={submit}>
          <Field label="Expo title *"><input name="title" value={form.title} onChange={set} required maxLength={120} /></Field>
          <Field label="Category *"><select name="category" value={form.category} onChange={set}>{THEMES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Theme"><input name="theme" value={form.theme} onChange={set} placeholder="e.g. AI & Robotics" maxLength={120} /></Field>
          <Field label="Location *"><input name="location" value={form.location} onChange={set} required /></Field>
          <Field label="Start *"><input type="datetime-local" name="date" value={form.date} onChange={set} required /></Field>
          <Field label="End"><input type="datetime-local" name="endDate" value={form.endDate} onChange={set} min={form.date} /></Field>
          <Field label="Capacity"><input type="number" min="1" name="capacity" value={form.capacity} onChange={set} /></Field>
          <Field label="Status"><select name="status" value={form.status} onChange={set}><option value="published">Published</option><option value="draft">Draft</option></select></Field>
          <Field label="Image URL" full><input name="image" value={form.image} onChange={set} placeholder="Optional image URL" /></Field>
          <Field label="Description *" full><textarea name="description" rows="4" value={form.description} onChange={set} required maxLength={2000} /></Field>
          <div className="dashboard-form-actions">
            <button className="nav-cta" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Expo'}</button>
            {editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(''); setForm(empty); }}>Cancel</button>}
          </div>
        </form>
      </section>
      <div className="portal-list">
        {events.length === 0 && <Empty>No expos yet. Create your first one above.</Empty>}
        {events.map((ev) => <EventRow key={ev._id} event={ev} onDetails={setDetail}><button className="secondary-button" onClick={() => edit(ev)}>Edit</button><button className="dashboard-delete" onClick={() => remove(ev)}>Delete</button></EventRow>)}
      </div>
      <EventDetail event={detail} onClose={() => setDetail(null)} />
    </>
  );
}

export function BrowseEvents({ ctx }) {
  const { api, run, events, reloadEvents, openMessage, role } = ctx;
  const [detail, setDetail] = useState(null);
  const toggleRegister = async (ev) => { if (await run(() => api(`/events/${ev._id}/register`, { method: ev.registered ? 'DELETE' : 'POST' }))) reloadEvents(); };
  const bookmark = async (ev) => { if (await run(() => api(`/events/${ev._id}/bookmark`, { method: 'POST' }))) reloadEvents(); };
  return (
    <>
      <SectionTitle kicker="EVENT INFORMATION" title="Discover expos and trade shows" />
      <div className="portal-list">
        {events.length === 0 && <Empty>No published events right now. Check back soon.</Empty>}
        {events.map((ev) => (
          <EventRow key={ev._id} event={ev} onDetails={setDetail}>
            {role === 'attendee' && <button className={ev.registered ? 'secondary-button' : 'nav-cta'} onClick={() => toggleRegister(ev)}>{ev.registered ? 'Cancel registration' : 'Register'}</button>}
            <button className="secondary-button" onClick={() => bookmark(ev)}>{ev.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
            {ev.createdBy?._id && <button className="secondary-button" onClick={() => openMessage(ev.createdBy._id, ev.createdBy.name)}>Contact organizer</button>}
          </EventRow>
        ))}
      </div>
      <EventDetail event={detail} onClose={() => setDetail(null)} />
    </>
  );
}
