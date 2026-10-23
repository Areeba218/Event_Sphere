import { useState } from 'react';
import { assetUrl, useFetch } from '../api';
import { Empty, EventPicker, Field, SectionTitle } from './ui';

const LABEL = { available: 'Available', reserved: 'Reserved', assigned: 'Assigned' };

function Grid({ booths, selectedId, onSelect }) {
  const columns = booths[0]?.columns || 6;
  return (
    <div className="booth-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} role="list" aria-label="Floor plan">
      {booths.map((b) => (
        <button key={b._id} role="listitem" className={`booth ${b.status}${b.mine ? ' mine' : ''}${selectedId === b._id ? ' selected' : ''}`} onClick={() => onSelect(b)} aria-label={`Booth ${b.boothNumber}, ${LABEL[b.status]}${b.company ? `, ${b.company.name}` : ''}`}>
          <strong>{b.boothNumber}</strong>
          <span>{b.company?.name || LABEL[b.status]}</span>
        </button>
      ))}
    </div>
  );
}

/* ----- side panels ----- */
function OrganizerPanel({ booth, approved, ctx, refresh }) {
  const { api, run } = ctx;
  const [appId, setAppId] = useState('');
  const assign = async () => { if (await run(() => api(`/portal/organizer/booths/${booth._id}/assign`, { method: 'PATCH', body: { applicationId: appId || booth.company?.applicationId } }))) refresh(); };
  const release = async () => { if (window.confirm(`Release booth ${booth.boothNumber}?`) && await run(() => api(`/portal/organizer/booths/${booth._id}/release`, { method: 'PATCH' }))) refresh(); };
  return (
    <div className="booth-panel">
      <h3>Booth {booth.boothNumber} · {booth.size}</h3>
      <p>Status: <strong>{LABEL[booth.status]}</strong></p>
      {booth.company && <p>{booth.company.name} · {booth.exhibitor?.name} ({booth.exhibitor?.email})</p>}
      {booth.staff && <p>Staff: {booth.staff}</p>}
      {booth.status === 'reserved' && <button className="nav-cta" onClick={assign}>Confirm reservation</button>}
      {booth.status === 'available' && (
        <>
          <Field label="Assign an approved exhibitor"><select value={appId} onChange={(e) => setAppId(e.target.value)}><option value="">Choose exhibitor</option>{approved.map((a) => <option key={a._id} value={a._id}>{a.companyName}</option>)}</select></Field>
          <button className="nav-cta" disabled={!appId} onClick={assign}>Assign booth</button>
        </>
      )}
      {booth.status !== 'available' && <button className="dashboard-delete" onClick={release}>Release booth</button>}
    </div>
  );
}

function ExhibitorPanel({ booth, myApp, myBooth, ctx, refresh }) {
  const { api, run, openMessage } = ctx;
  const [form, setForm] = useState({ details: booth.details || '', products: booth.products || '', staff: booth.staff || '' });
  const [saved, setSaved] = useState(false);
  const { data: nb } = useFetch(api, booth.mine ? `/portal/exhibitor/booths/${booth._id}/neighbors` : null, ctx.live);
  const reserve = async () => { if (await run(() => api(`/portal/exhibitor/booths/${booth._id}/reserve`, { method: 'POST', body: { applicationId: myApp._id } }))) refresh(); };
  const cancel = async () => { if (await run(() => api(`/portal/exhibitor/booths/${booth._id}/reserve`, { method: 'DELETE' }))) refresh(); };
  const save = async (e) => { e.preventDefault(); if (await run(() => api(`/portal/exhibitor/booths/${booth._id}`, { method: 'PATCH', body: form }))) { setSaved(true); refresh(); } };
  const set = (k) => (e) => { setSaved(false); setForm({ ...form, [k]: e.target.value }); };

  return (
    <div className="booth-panel">
      <h3>Booth {booth.boothNumber} · {booth.size}</h3>
      <p>Status: <strong>{LABEL[booth.status]}</strong>{booth.company && !booth.mine ? ` · ${booth.company.name}` : ''}</p>
      {booth.status === 'available' && !myBooth && <button className="nav-cta" onClick={reserve}>Reserve this booth</button>}
      {booth.status === 'available' && myBooth && <p className="profile-note">You already hold booth {myBooth.boothNumber}.</p>}
      {booth.mine && (
        <>
          {booth.status === 'reserved' && <><p className="profile-note">Waiting for the organizer to confirm your reservation.</p><button className="secondary-button" onClick={cancel}>Cancel reservation</button></>}
          {(booth.products || booth.details || booth.staff) && (
  <div className="booth-summary">
    <strong>Currently saved</strong>
    {booth.products && <p><b>Products:</b> {booth.products}</p>}
    {booth.details && <p><b>Details:</b> {booth.details}</p>}
    {booth.staff && <p><b>Staff (visible only to you and the organizer):</b> {booth.staff}</p>}
  </div>
)}
          <form className="dashboard-event-form" onSubmit={save}>
            <Field label="Products / services showcased" full><textarea rows="2" value={form.products} onChange={set('products')} /></Field>
            <Field label="Booth details" full><textarea rows="2" value={form.details} onChange={set('details')} /></Field>
            <Field label="Staff on this booth" full><input value={form.staff} onChange={set('staff')} placeholder="Names and roles" /></Field>
            <div className="dashboard-form-actions"><button className="nav-cta">Save booth details</button>{saved && <span className="saved-note">✓ Saved</span>}</div>
          </form>
          <h4>Neighbouring exhibitors</h4>
          {nb && nb.neighbors.length === 0 && <p className="profile-note">No neighbours yet.</p>}
          {nb?.neighbors.map((n) => (
            <div className="neighbor" key={n.exhibitorId}>
              <div><strong>{n.company || n.name}</strong> · booth {n.boothNumber}<br /><small>{[n.email, n.phone].filter(Boolean).join(' · ') || 'Contact details are private'}</small></div>
              <button className="secondary-button" onClick={() => openMessage(n.exhibitorId, n.name)}>Message</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ViewerPanel({ booth, ctx }) {
  const { api, openMessage } = ctx;
  const view = () => api(`/portal/exhibitors/${booth.company.applicationId}/view`, { method: 'POST' }).catch(() => {});
  return (
    <div className="booth-panel">
      <h3>Booth {booth.boothNumber} · {booth.size}</h3>
      <p>Status: <strong>{LABEL[booth.status]}</strong></p>
      {booth.company && (
        <>
          <div className="neighbor"><div><strong>{booth.company.name}</strong><br /><small>{booth.company.category}</small></div>{booth.company.logo && <img className="mini-logo" src={assetUrl(booth.company.logo)} alt="" />}</div>
          {booth.products && <p>{booth.products}</p>}
          {booth.details && <p>{booth.details}</p>}
          <button className="nav-cta" onClick={() => { view(); openMessage(booth.exhibitor._id, booth.exhibitor.name); }}>Message exhibitor</button>
        </>
      )}
    </div>
  );
}

export default function FloorPlanTab({ ctx }) {
  const { api, role, events, live } = ctx;
  const [eventId, setEventId] = useState(ctx.focusEvent || '');
  const [selectedId, setSelectedId] = useState('');
  const [count, setCount] = useState(24);
  const [columns, setColumns] = useState(6);
  const { data, reload } = useFetch(api, eventId ? `/portal/events/${eventId}/booths` : null, live);
  const apps = useFetch(api, role === 'exhibitor' ? '/portal/exhibitor/applications' : role === 'organizer' && eventId ? `/portal/organizer/events/${eventId}/applications` : null, live);
  const booths = data?.booths || [];
  const selected = booths.find((b) => b._id === selectedId);

  // Exhibitors can only use events where they have an approved application.
  const approvedApps = apps.data?.applications?.filter((a) => a.status === 'approved') || [];
  const pickerEvents = role === 'exhibitor' ? events.filter((e) => approvedApps.some((a) => (a.event?._id || a.event) === e._id)) : events;
  const myApp = approvedApps.find((a) => (a.event?._id || a.event) === eventId);
  const myBooth = booths.find((b) => b.mine);

  const generate = async () => { if (await ctx.run(() => api(`/portal/organizer/events/${eventId}/booths`, { method: 'POST', body: { count: Number(count), columns: Number(columns) } }))) reload(); };

  return (
    <>
      <SectionTitle kicker="BOOTH ALLOCATION" title="Interactive booth floor plan" />
      {role === 'exhibitor' && pickerEvents.length === 0 && <Empty>Your application must be approved before you can choose a booth.</Empty>}
      <EventPicker events={pickerEvents} value={eventId} onChange={(v) => { setEventId(v); setSelectedId(''); }} />
      {eventId && (
        <>
          <div className="toolbar">
            {role === 'organizer' && <>
              <label className="inline-field">Booths <input type="number" min="1" max="200" value={count} onChange={(e) => setCount(e.target.value)} /></label>
              <label className="inline-field">Per row <input type="number" min="1" max="20" value={columns} onChange={(e) => setColumns(e.target.value)} /></label>
              <button className="nav-cta" onClick={generate}>Generate booths</button>
            </>}
            <span>{booths.filter((b) => b.status === 'assigned').length} assigned · {booths.filter((b) => b.status === 'reserved').length} reserved · {booths.filter((b) => b.status === 'available').length} available</span>
          </div>
          <div className="legend"><span className="dot available" />Available<span className="dot reserved" />Reserved<span className="dot assigned" />Assigned<span className="dot mine" />Yours</div>
          {booths.length === 0 ? <Empty>{role === 'organizer' ? 'No booths yet. Generate a floor plan above.' : 'The organizer has not published a floor plan yet.'}</Empty> : <Grid booths={booths} selectedId={selectedId} onSelect={(b) => setSelectedId(b._id)} />}
          {selected && (role === 'organizer' ? <OrganizerPanel key={selected._id + selected.status} booth={selected} approved={approvedApps} ctx={ctx} refresh={reload} />
            : role === 'exhibitor' ? <ExhibitorPanel key={selected._id + selected.status} booth={selected} myApp={myApp} myBooth={myBooth} ctx={ctx} refresh={reload} />
            : <ViewerPanel key={selected._id} booth={selected} ctx={ctx} />)}
        </>
      )}
    </>
  );
}
