import { fmt } from '../api';
import { Empty, SectionTitle } from './ui';

export default function NotificationsTab({ ctx }) {
  const { api, run, notifications, reloadNotifications, setTab } = ctx;
  const items = notifications.items;
  const open = async (n) => { if (!n.read) { await api(`/portal/notifications/${n._id}/read`, { method: 'PATCH' }).catch(() => {}); reloadNotifications(); } if (n.tab) setTab(n.tab); };
  const readAll = async () => { if (await run(() => api('/portal/notifications/read-all', { method: 'PATCH' }))) reloadNotifications(); };
  return (
    <>
      <SectionTitle kicker="NOTIFICATIONS" title="Updates & reminders" />
      <div className="toolbar"><span>{notifications.unread} unread</span><button className="secondary-button" onClick={readAll} disabled={!notifications.unread}>Mark all as read</button></div>
      <div className="portal-list">
        {items.length === 0 && <Empty>You are all caught up. Reminders, approvals and schedule changes will appear here.</Empty>}
        {items.map((n) => (
          <article className={`portal-item notification${n.read ? '' : ' unread'}`} key={n._id}>
            <span className="status-pill">{n.type}</span>
            <div><strong>{n.title}</strong>{n.body && <p>{n.body}</p>}<small>{fmt(n.createdAt)}</small></div>
            <button className="secondary-button" onClick={() => open(n)}>{n.tab ? 'Open' : 'Mark read'}</button>
          </article>
        ))}
      </div>
    </>
  );
}
