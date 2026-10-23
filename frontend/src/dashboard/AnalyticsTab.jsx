import { useState } from 'react';
import { useFetch } from '../api';
import { EventPicker, SectionTitle, Stat } from './ui';

export default function AnalyticsTab({ ctx }) {
  const { api, run, events, live } = ctx;
  const [eventId, setEventId] = useState('');
  const { data } = useFetch(api, eventId ? `/portal/organizer/events/${eventId}/analytics` : null, live); // reloads on every real-time change
  const system = useFetch(api, '/portal/organizer/metrics', live);
  const a = data?.analytics;
  const maxVisits = Math.max(1, ...(a?.traffic.visitsByDay.map((d) => d.visits) || [0]));

  return (
    <>
      <SectionTitle kicker="ANALYTICS & REPORTING" title="Expo performance" />
      <EventPicker events={events} value={eventId} onChange={setEventId} />
      {a && (
        <>
          <div className="toolbar"><span className="live-badge">● Live</span><span>Updated {new Date(a.generatedAt).toLocaleTimeString()}</span>
            <button className="secondary-button" onClick={() => run(() => api.download(`/portal/organizer/events/${eventId}/analytics/export`, 'eventsphere-analytics.csv'))}>Export CSV report</button></div>
          <h3 className="sub-heading">Registrations & exhibitors</h3>
          <div className="analytics-grid">
            <Stat label="Attendee registrations" value={`${a.attendees}/${a.capacity}`} />
            <Stat label="Capacity used" value={`${a.registrationsPercent}%`} />
            <Stat label="Exhibitor applications" value={a.exhibitorApplications} />
            <Stat label="Approved / pending" value={`${a.approvedExhibitors} / ${a.pendingApplications}`} />
            <Stat label="Booths assigned / reserved" value={`${a.assignedBooths} / ${a.reservedBooths}`} />
            <Stat label="Booths available" value={`${a.availableBooths} of ${a.totalBooths}`} />
            <Stat label="Booth occupancy" value={`${a.boothOccupancyPercent}%`} />
            <Stat label="Sessions" value={a.sessionCount} />
          </div>
          <h3 className="sub-heading">Attendee engagement</h3>
          <div className="analytics-grid">
            <Stat label="Event bookmarks" value={a.engagement.eventBookmarks} />
            <Stat label="Session registrations" value={a.engagement.sessionRegistrations} />
            <Stat label="Session bookmarks" value={a.engagement.sessionBookmarks} />
            <Stat label="Average rating" value={a.engagement.averageRating ?? '—'} />
            <Stat label="Feedback received" value={a.engagement.feedbackCount} />
            <Stat label="Issues reported" value={a.engagement.issuesReported} />
            <Stat label="Messages exchanged" value={a.engagement.messagesExchanged} />
          </div>
          <div className="two-col">
            <div className="portal-card wide static">
              <h3>Session popularity</h3>
              {a.popularSessions.length === 0 ? <p>No sessions yet.</p> : a.popularSessions.map((s) => <p key={s.title}><strong>{s.title}</strong> — {s.registrations} registered · {s.bookmarks} saved</p>)}
            </div>
            <div className="portal-card wide static">
              <h3>Booth traffic</h3>
              <p>{a.traffic.totalVisits} profile/booth views · {a.traffic.uniqueVisitors} unique visitors</p>
              {a.traffic.boothTraffic.map((b) => <p key={b.company}><strong>{b.company}</strong> (booth {b.boothNumber}) — {b.visits} views</p>)}
              <div className="bars" aria-label="Views in the last 7 days">{a.traffic.visitsByDay.map((d) => <div key={d.date} className="bar-col" title={`${d.date}: ${d.visits}`}><div className="bar" style={{ height: `${(d.visits / maxVisits) * 100}%` }} /><small>{d.date.slice(5)}</small></div>)}</div>
            </div>
          </div>
        </>
      )}
      {system.data && (
        <div className="portal-card wide static">
          <h3>System health</h3>
          <p>Uptime {Math.round(system.data.metrics.uptimeSeconds / 60)} min · {system.data.metrics.requests} requests · avg {system.data.metrics.averageResponseMs} ms · {system.data.metrics.serverErrors} server errors · {system.data.metrics.connectedClients} live connections · {system.data.metrics.memoryMb} MB</p>
        </div>
      )}
    </>
  );
}
