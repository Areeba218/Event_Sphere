import { useState } from 'react';
import { assetUrl, useFetch } from '../api';
import { Empty, EventPicker, SectionTitle, StatusPill } from './ui';

export default function ExhibitorsAdminTab({ ctx }) {
  const { api, run, events, live, openMessage } = ctx;
  const [eventId, setEventId] = useState('');
  const [notes, setNotes] = useState({});
  const { data, reload } = useFetch(api, eventId ? `/portal/organizer/events/${eventId}/applications` : null, live);
  const review = async (a, status) => { if (await run(() => api(`/portal/organizer/applications/${a._id}`, { method: 'PATCH', body: { status, organizerNote: notes[a._id] || '' } }))) reload(); };

  return (
    <>
      <SectionTitle kicker="EXHIBITOR MANAGEMENT" title="Applications & approvals" />
      <EventPicker events={events} value={eventId} onChange={setEventId} />
      <div className="portal-list">
        {data && data.applications.length === 0 && <Empty>No exhibitor applications for this event yet.</Empty>}
        {data?.applications.map((a) => (
          <article className="portal-item" key={a._id}>
            <div>
              <strong>{a.companyName}</strong> <small>({a.category})</small>
              <p>{a.productsServices}</p>
              <small>{a.exhibitor?.name} · {a.exhibitor?.email}{a.contactPhone ? ` · ${a.contactPhone}` : ''}</small>
              {a.documentFiles?.length > 0 && <p>{a.documentFiles.map((f) => <a key={f.url} className="doc-link" href={assetUrl(f.url)} target="_blank" rel="noreferrer">📄 {f.name || 'Document'}</a>)}</p>}
              {a.documents && <small>Reference: {a.documents}</small>}
              <input className="note-input" placeholder="Note to exhibitor (optional)" value={notes[a._id] ?? a.organizerNote ?? ''} onChange={(e) => setNotes({ ...notes, [a._id]: e.target.value })} maxLength={1000} aria-label={`Note for ${a.companyName}`} />
            </div>
            <StatusPill status={a.status} />
            <div className="portal-actions">
              {a.status !== 'approved' && <button className="nav-cta" onClick={() => review(a, 'approved')}>Approve</button>}
              {a.status !== 'rejected' && <button className="secondary-button" onClick={() => review(a, 'rejected')}>Reject</button>}
              <button className="secondary-button" onClick={() => openMessage(a.exhibitor._id, a.exhibitor.name)}>Message</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
