import { useState } from 'react';
import { assetUrl, fmt, useFetch } from '../api';
import { CATEGORIES } from './constants';
import { Empty, Field, FileInput, SectionTitle, StatusPill, Thumb } from './ui';

const blank = { eventId: '', companyName: '', category: 'Technology', productsServices: '', documents: '', logo: '', website: '', description: '', contactPhone: '', documentFiles: [] };

function ApplicationForm({ ctx, initial, events, onDone, editing }) {
  const { api, run } = ctx;
  const [form, setForm] = useState(initial);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const rest = { ...form };
    delete rest.eventId;
    const r = editing ? await run(() => api(`/portal/exhibitor/applications/${editing}`, { method: 'PATCH', body: rest })) : await run(() => api('/portal/exhibitor/apply', { method: 'POST', body: form }));
    if (r) onDone();
  };
  return (
    <form className="dashboard-event-form" onSubmit={submit}>
      {!editing && <Field label="Expo *"><select value={form.eventId} onChange={set('eventId')} required><option value="">Choose an event</option>{events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}</select></Field>}
      <Field label="Company / brand name *"><input value={form.companyName} onChange={set('companyName')} required maxLength={120} /></Field>
      <Field label="Category"><select value={form.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Products / services *"><textarea value={form.productsServices} onChange={set('productsServices')} required /></Field>
      <Field label="Contact phone"><input value={form.contactPhone} onChange={set('contactPhone')} /></Field>
      <Field label="Website"><input value={form.website} onChange={set('website')} placeholder="https://" /></Field>
      <Field label="Company logo URL"><input value={form.logo} onChange={set('logo')} placeholder="Link, or upload below" /></Field>
      <FileInput api={api} run={run} label="Upload logo (PNG/JPG/WEBP, max 5 MB)" accept="image/png,image/jpeg,image/webp,image/gif" onUploaded={(f) => setForm((x) => ({ ...x, logo: f.url }))} />
      <FileInput api={api} run={run} label="Upload required documents (PDF or image, max 5 MB)" accept="application/pdf,image/png,image/jpeg" onUploaded={(f) => setForm((x) => ({ ...x, documentFiles: [...x.documentFiles, { name: f.name, url: f.url }].slice(0, 5) }))} />
      <Field label="Document reference / notes"><input value={form.documents} onChange={set('documents')} /></Field>
      {(form.logo || form.documentFiles.length > 0) && (
        <div className="dashboard-full-field uploaded">
          {form.logo && <Thumb src={form.logo} fallback="LOGO" />}
          {form.documentFiles.map((f) => <span key={f.url} className="doc-chip"><a href={assetUrl(f.url)} target="_blank" rel="noreferrer">📄 {f.name}</a><button type="button" aria-label={`Remove ${f.name}`} onClick={() => setForm({ ...form, documentFiles: form.documentFiles.filter((x) => x.url !== f.url) })}>×</button></span>)}
        </div>
      )}
      <Field label="Company description" full><textarea value={form.description} onChange={set('description')} /></Field>
      <div className="dashboard-form-actions"><button className="nav-cta">{editing ? 'Save profile' : 'Submit application'}</button>{editing && <button type="button" className="secondary-button" onClick={onDone}>Cancel</button>}</div>
    </form>
  );
}

export default function ExhibitorPortalTab({ ctx }) {
  const { api, events, live, setTab } = ctx;
  const { data, reload } = useFetch(api, '/portal/exhibitor/applications', live);
  const [editing, setEditing] = useState(null);
  const published = events.filter((e) => e.status === 'published');
  const apps = data?.applications || [];

  return (
    <>
      <SectionTitle kicker="EXHIBITOR PORTAL" title={editing ? 'Update exhibitor profile' : 'Apply for an expo'} />
      {editing
        ? <ApplicationForm key={editing._id} ctx={ctx} events={published} editing={editing._id} initial={{ ...blank, ...editing, documentFiles: editing.documentFiles || [] }} onDone={() => { setEditing(null); reload(); }} />
        : <ApplicationForm ctx={ctx} events={published} initial={blank} onDone={reload} />}

      <SectionTitle kicker="APPLICATION STATUS" title="My applications" />
      <div className="portal-list">
        {data && apps.length === 0 && <Empty>You have not applied to any expo yet.</Empty>}
        {apps.map((a) => (
          <article className="portal-item" key={a._id}>
            <Thumb src={a.logo} fallback="BR" />
            <div><strong>{a.companyName}</strong><p>{a.event?.title} · {a.event?.location}</p><small>Submitted {fmt(a.createdAt, { dateStyle: 'medium' })}{a.organizerNote ? ` · Organizer note: ${a.organizerNote}` : ''}</small></div>
            <div className="portal-actions"><StatusPill status={a.status} /><button className="secondary-button" onClick={() => { setEditing(a); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit profile</button>{a.status === 'approved' && <button className="nav-cta" onClick={() => setTab('floorplan')}>Choose booth</button>}</div>
          </article>
        ))}
      </div>

      {data?.booths.length > 0 && (
        <>
          <SectionTitle kicker="MY BOOTHS" title="Reserved & assigned booth spaces" />
          <div className="booth-grid">{data.booths.map((b) => <button key={b._id} className={`booth ${b.status} mine`} onClick={() => setTab('floorplan')}><strong>{b.boothNumber}</strong><span>{b.event?.title} · {b.size}</span><span>{b.status === 'reserved' ? 'Awaiting confirmation' : 'Confirmed'}</span></button>)}</div>
        </>
      )}
    </>
  );
}
