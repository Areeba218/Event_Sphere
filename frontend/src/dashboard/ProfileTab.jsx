import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { assetUrl, useFetch } from '../api';
import { Field, FileInput, SectionTitle, Thumb } from './ui';

export default function ProfileTab({ ctx }) {
  const { api, run, role, user, saveUser, logout } = ctx;
  const navigate = useNavigate();
  const isExhibitor = role === 'exhibitor';
  const { data, reload } = useFetch(api, '/portal/profile');
  const profile = data?.user;
  const [form, setForm] = useState(null); // null = read-only summary
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [deletePw, setDeletePw] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const r = await run(() => api('/portal/profile', { method: 'PUT', body: form }));
    if (r) { saveUser(r.user); setForm(null); reload(); }
  };
  const toggle = async (key, value) => { const r = await run(() => api('/portal/profile', { method: 'PUT', body: { [key]: value } })); if (r) reload(); };
  const changePassword = async (e) => { e.preventDefault(); if (await run(() => api('/portal/profile/password', { method: 'POST', body: pw }))) setPw({ currentPassword: '', newPassword: '' }); };
  const exportData = () => run(() => api.download('/portal/privacy/export', 'eventsphere-my-data.json'));
  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('This permanently deletes your account and personal data. Continue?')) return;
    if (await run(() => api('/portal/privacy/account', { method: 'DELETE', body: { password: deletePw } }))) { logout(); navigate('/'); }
  };

  if (!profile) return <SectionTitle kicker="ACCOUNT PROFILE" title="Loading…" />;
  return (
    <>
      <SectionTitle kicker={isExhibitor ? 'COMPANY PROFILE' : 'ACCOUNT PROFILE'} title={isExhibitor ? 'Your company profile' : 'Your account details'} />
      {!form ? (
        <section className="portal-card profile-summary static">
          <div className="profile-summary-head"><Thumb src={profile.logo} fallback={(profile.name || 'U').slice(0, 1).toUpperCase()} /><div><h3>{profile.name}</h3><p>{profile.email}</p><small>{role} account</small></div></div>
          {isExhibitor && <div className="profile-details-grid">
            <div><span>Company / brand</span><strong>{profile.companyName || 'Not added yet'}</strong></div>
            <div><span>Products / services</span><strong>{profile.productsServices || 'Not added yet'}</strong></div>
            <div><span>Phone</span><strong>{profile.phone || 'Not added yet'}</strong></div>
            <div><span>Description</span><strong>{profile.description || 'Not added yet'}</strong></div>
            <div><span>Logo</span><strong>{profile.logo ? <a href={assetUrl(profile.logo)} target="_blank" rel="noreferrer">View logo</a> : 'Not added yet'}</strong></div>
          </div>}
          <button className="nav-cta" onClick={() => setForm({ ...profile })}>{isExhibitor ? 'Edit company profile' : 'Edit account details'}</button>
        </section>
      ) : (
        <form className="dashboard-event-form" onSubmit={save}>
          <Field label="Full name"><input value={form.name || ''} onChange={set('name')} required /></Field>
          <Field label="Email address"><input value={form.email || ''} readOnly disabled /></Field>
          {isExhibitor && <>
            <Field label="Company / brand"><input value={form.companyName || ''} onChange={set('companyName')} /></Field>
            <Field label="Products / services"><textarea value={form.productsServices || ''} onChange={set('productsServices')} /></Field>
            <Field label="Logo URL"><input value={form.logo || ''} onChange={set('logo')} /></Field>
            <FileInput api={api} run={run} label="Upload logo" accept="image/png,image/jpeg,image/webp,image/gif" onUploaded={(f) => setForm((x) => ({ ...x, logo: f.url }))} />
            <Field label="Description" full><textarea value={form.description || ''} onChange={set('description')} /></Field>
          </>}
          <Field label="Phone"><input value={form.phone || ''} onChange={set('phone')} /></Field>
          <div className="dashboard-form-actions"><button className="nav-cta">Save changes</button><button type="button" className="secondary-button" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}

      <SectionTitle kicker="PASSWORD" title="Change password" />
      <form className="dashboard-event-form" onSubmit={changePassword}>
        <Field label="Current password"><input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
        <Field label="New password (8+ characters, letters and numbers)"><input type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></Field>
        <div className="dashboard-form-actions"><button className="nav-cta">Update password</button></div>
      </form>

      <SectionTitle kicker="PRIVACY & DATA" title="Control your data" />
      <section className="portal-card static">
        <label className="check"><input type="checkbox" checked={profile.shareContact !== false} onChange={(e) => toggle('shareContact', e.target.checked)} /> Share my email and phone with other users (exhibitor directory, booth neighbours)</label>
        <label className="check"><input type="checkbox" checked={profile.reminderEmails !== false} onChange={(e) => toggle('reminderEmails', e.target.checked)} /> Email me reminders before my sessions start</label>
        <p className="profile-note">Consent recorded {profile.consentAt ? new Date(profile.consentAt).toLocaleDateString() : '—'} · <Link to="/privacy">Read the Privacy Policy</Link></p>
        <button className="secondary-button" onClick={exportData}>Download my data (JSON)</button>
      </section>
      <form className="portal-card static danger-zone" onSubmit={deleteAccount}>
        <h3>Delete my account</h3>
        <p>Removes your profile, registrations, applications, messages and feedback. This cannot be undone.{user.role === 'organizer' && ' Organizers must delete their events first.'}</p>
        <div className="inline-row"><input type="password" placeholder="Confirm with your password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} required aria-label="Password" /><button className="dashboard-delete">Delete account</button></div>
      </form>
    </>
  );
}
