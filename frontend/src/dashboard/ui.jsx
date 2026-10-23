import { useState } from 'react';
import { assetUrl, fmt } from '../api';

export const SectionTitle = ({ kicker, title }) => <div className="portal-section-title"><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>;
export const Field = ({ label, children, full }) => <label className={full ? 'dashboard-full-field' : ''}>{label}{children}</label>;
export const Stat = ({ label, value }) => <div className="analytics-stat"><span>{label}</span><strong>{value}</strong></div>;
export const Empty = ({ children }) => <p className="dashboard-empty">{children}</p>;
export const StatusPill = ({ status }) => <span className={`status-pill ${status}`}>{status}</span>;
export const PortalCard = ({ title, text, onClick }) => <button className="portal-card" onClick={onClick}><span className="section-kicker">EVENTSPHERE</span><h3>{title}</h3><p>{text}</p><span>Open workspace ↗</span></button>;

export function EventPicker({ events, value, onChange, label = 'Select event' }) {
  return (
    <div className="event-picker">
      <label>{label}
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose an event</option>
          {events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
        </select>
      </label>
    </div>
  );
}

export function Thumb({ src, fallback = 'ES' }) {
  const [broken, setBroken] = useState(false);
  return <div className="portal-event-thumb">{src && !broken ? <img src={assetUrl(src)} alt="" onError={() => setBroken(true)} /> : <span>{fallback}</span>}</div>;
}

// Upload button: sends the file to the API and returns { url, name } to the parent.
export function FileInput({ api, label, accept, onUploaded, run }) {
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    const result = await run(() => api.upload(file));
    setBusy(false);
    if (result?.url) onUploaded(result);
  };
  return <Field label={label}><input type="file" accept={accept} onChange={pick} disabled={busy} />{busy && <small>Uploading…</small>}</Field>;
}

export function EventDetail({ event, onClose }) {
  if (!event) return null;
  return (
    <section className="portal-card wide event-detail-panel" aria-label="Event details">
      <div className="portal-section-title"><h2>Event details</h2><button className="secondary-button" onClick={onClose}>Close details</button></div>
      {event.image && <img className="event-detail-image" src={assetUrl(event.image)} alt={event.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
      <span className="event-date">{fmt(event.date)}</span>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <p><strong>Category:</strong> {event.category}{event.theme ? ` · ${event.theme}` : ''} · <strong>Location:</strong> {event.location}</p>
      <p><strong>Registration:</strong> {event.registrationCount ?? 0} / {event.capacity}</p>
      {event.endDate && <p><strong>Ends:</strong> {fmt(event.endDate)}</p>}
    </section>
  );
}
