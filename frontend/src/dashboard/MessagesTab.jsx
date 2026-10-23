import { useEffect, useRef, useState } from 'react';
import { fmt, useFetch } from '../api';
import { Empty, Field, SectionTitle } from './ui';

export default function MessagesTab({ ctx }) {
  const { api, run, user, msgTick, compose, clearCompose } = ctx;
  const [partner, setPartner] = useState(compose ? { _id: compose.id, name: compose.name } : null);
  const [text, setText] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const endRef = useRef(null);
  const threads = useFetch(api, '/portal/messages/threads', msgTick);
  const convo = useFetch(api, partner ? `/portal/messages?with=${partner._id}` : null, msgTick);

  useEffect(() => { if (compose) clearCompose(); }, [compose, clearCompose]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [convo.data]);

  const send = async (e) => {
    e.preventDefault();
    const to = partner?._id || emailTo.trim();
    const r = await run(() => api('/portal/messages', { method: 'POST', body: { to, text } }));
    if (r) {
      setText('');
      if (!partner) { setPartner({ _id: r.item.to, name: emailTo.trim() }); setEmailTo(''); }
      convo.reload(); threads.reload();
    }
  };

  return (
    <>
      <SectionTitle kicker="COMMUNICATION" title="Messages & enquiries" />
      <div className="chat">
        <aside className="chat-threads" aria-label="Conversations">
          <button className="secondary-button" onClick={() => setPartner(null)}>+ New message</button>
          {threads.data?.threads.length === 0 && <p className="profile-note">No conversations yet.</p>}
          {threads.data?.threads.map((t) => (
            <button key={t.partner._id} className={`thread${partner?._id === t.partner._id ? ' active' : ''}`} onClick={() => setPartner({ _id: t.partner._id, name: t.partner.name })}>
              <strong>{t.partner.companyName || t.partner.name}</strong>{t.unread > 0 && <span className="badge">{t.unread}</span>}
              <small>{t.partner.role} · {t.lastMessage.slice(0, 40)}</small>
            </button>
          ))}
        </aside>
        <section className="chat-main">
          <h3>{partner ? `Conversation with ${partner.name}` : 'New message'}</h3>
          {partner && (
            <div className="chat-log" aria-live="polite">
              {convo.data?.messages.length === 0 && <Empty>No messages yet. Say hello below.</Empty>}
              {convo.data?.messages.map((m) => (
                <div key={m._id} className={`bubble${m.from?._id === user.id ? ' mine' : ''}`}>{m.text}<small>{m.from?._id === user.id ? 'You' : m.from?.name} · {fmt(m.createdAt)}</small></div>
              ))}
              <div ref={endRef} />
            </div>
          )}
          <form className="dashboard-event-form" onSubmit={send}>
            {!partner && <Field label="Recipient email address *" full><input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required placeholder="exhibitor@example.com" /></Field>}
            <Field label="Message *" full><textarea rows="3" value={text} onChange={(e) => setText(e.target.value)} required maxLength={2000} placeholder="Write your enquiry or reply..." /></Field>
            <div className="dashboard-form-actions"><button className="nav-cta">Send message</button></div>
          </form>
        </section>
      </div>
    </>
  );
}
