import { useState } from 'react';
import { useFetch } from '../api';
import { CATEGORIES } from './constants';
import { Empty, SectionTitle, Thumb } from './ui';

export default function DirectoryTab({ ctx }) {
  const { api, events, live, openMessage, setTab, setFocusEvent } = ctx;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [eventId, setEventId] = useState('');
  const [query, setQuery] = useState('');
  const path = `/portal/exhibitors/search?search=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}${eventId ? `&eventId=${eventId}` : ''}`;
  const { data } = useFetch(api, path, live);

  const contact = (x) => {
    api(`/portal/exhibitors/${x._id}/view`, { method: 'POST' }).catch(() => {}); // counts as a booth visit for analytics
    openMessage(x.exhibitor._id, x.companyName);
  };
  const show = (x) => { api(`/portal/exhibitors/${x._id}/view`, { method: 'POST' }).catch(() => {}); setFocusEvent(x.event._id); setTab('floorplan'); };

  return (
    <>
      <SectionTitle kicker="EXHIBITOR SEARCH" title="Find exhibitors and brands" />
      <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); setQuery(search); }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, products or keywords..." aria-label="Search exhibitors" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category"><option>All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Event"><option value="">All events</option>{events.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}</select>
        <button className="nav-cta">Search</button>
      </form>
      <div className="portal-list">
        {data && data.exhibitors.length === 0 && <Empty>No exhibitors match your search.</Empty>}
        {data?.exhibitors.map((x) => (
          <article className="portal-item" key={x._id}>
            <Thumb src={x.logo} fallback="BR" />
            <div>
              <strong>{x.companyName}</strong> <small>· {x.category}</small>
              <p>{x.productsServices}</p>
              {x.description && <p>{x.description}</p>}
              <small>{x.event?.title} · {x.boothNumber ? `Booth ${x.boothNumber}` : 'Booth not assigned yet'} · {x.exhibitor?.name}{x.contactPhone ? ` · ${x.contactPhone}` : ''}{x.website ? ` · ${x.website}` : ''}</small>
            </div>
            <div className="portal-actions">
              <button className="secondary-button" onClick={() => show(x)}>View on floor plan</button>
              {x.exhibitor && x.exhibitor._id !== ctx.user.id && <button className="nav-cta" onClick={() => contact(x)}>Message</button>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
