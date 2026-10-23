import { fmt, useFetch } from '../api';
import { Empty, Field, SectionTitle, StatusPill } from './ui';

const pill = (s) => (s === 'resolved' ? 'approved' : s === 'reviewed' ? 'pending' : 'new');
const label = (s) => (s === 'open' ? 'New' : s === 'reviewed' ? 'In review' : 'Resolved');

export function FeedbackForm({ ctx }) {
  const { api, run, events } = ctx;
  const mine = useFetch(api, '/portal/feedback/mine', ctx.live);
  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const body = { eventId: f.get('eventId') || null, type: f.get('type'), subject: f.get('subject'), rating: f.get('rating') ? Number(f.get('rating')) : null, message: f.get('message') };
    if (await run(() => api('/portal/feedback', { method: 'POST', body }))) { form.reset(); mine.reload(); }
  };
  return (
    <>
      <SectionTitle kicker="FEEDBACK & SUPPORT" title="Tell us about your experience" />
      <form className="dashboard-event-form" onSubmit={submit}>
        <Field label="Type"><select name="type"><option value="feedback">Feedback / suggestion</option><option value="issue">Report an issue</option></select></Field>
        <Field label="Event"><select name="eventId"><option value="">General</option>{events.filter((e) => e.status === 'published').map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}</select></Field>
        <Field label="Subject"><input name="subject" maxLength={160} /></Field>
        <Field label="Rating"><select name="rating"><option value="">No rating</option><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></Field>
        <Field label="Message *" full><textarea name="message" rows="5" required maxLength={3000} placeholder="Share suggestions or describe an issue..." /></Field>
        <div className="dashboard-form-actions"><button className="nav-cta">Submit</button></div>
      </form>
      <SectionTitle kicker="HISTORY" title="My submissions" />
      <div className="portal-list">
        {mine.data?.feedback.length === 0 && <Empty>You have not submitted anything yet.</Empty>}
        {mine.data?.feedback.map((f) => <article className="portal-item" key={f._id}><div><strong>{f.type === 'issue' ? 'Issue' : 'Feedback'}{f.subject ? ` · ${f.subject}` : ''}</strong><p>{f.message}</p><small>{f.event?.title || 'General'} · {fmt(f.createdAt)}</small></div><StatusPill status={pill(f.status)} /><span /></article>)}
      </div>
    </>
  );
}

export function FeedbackInbox({ ctx }) {
  const { api, run, live } = ctx;
  const { data, reload } = useFetch(api, '/portal/organizer/feedback', live);
  const update = async (id, status) => { if (await run(() => api(`/portal/organizer/feedback/${id}`, { method: 'PATCH', body: { status } }))) reload(); };
  const remove = async (id) => { if (window.confirm('Delete this feedback permanently?') && await run(() => api(`/portal/feedback/${id}`, { method: 'DELETE' }))) reload(); };
  return (
    <>
      <SectionTitle kicker="FEEDBACK & SUPPORT" title="User feedback and reported issues" />
      <div className="portal-list">
        {data?.feedback.length === 0 && <Empty>No feedback yet.</Empty>}
        {data?.feedback.map((f) => (
          <article className="portal-item" key={f._id}>
            <div><strong>{f.type === 'issue' ? 'Issue' : 'Feedback'} · {f.user?.name}{f.rating ? ` · ${'★'.repeat(f.rating)}` : ''}</strong><p>{f.message}</p><small>{f.event?.title || 'General'} · {fmt(f.createdAt)}</small></div>
            <div className="feedback-status-actions"><StatusPill status={pill(f.status)} /><div>
              {f.status !== 'reviewed' && <button className="secondary-button" onClick={() => update(f._id, 'reviewed')}>Mark in review</button>}
              {f.status !== 'resolved' && <button className="nav-cta" onClick={() => update(f._id, 'resolved')}>Resolve</button>}
              {f.event && <button className="dashboard-delete" onClick={() => remove(f._id)}>Delete</button>}
            </div></div>
            <span className="visually-hidden">{label(f.status)}</span>
          </article>
        ))}
      </div>
    </>
  );
}
