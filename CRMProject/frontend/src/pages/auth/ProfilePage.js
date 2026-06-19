/**
 * Profile Page - User profile management
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { ErrorAlert, RoleBadge, Avatar, toast } from '../../components/common';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm_new_password: '' });
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pwError, setPwError] = useState(null);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data);
      toast('Profile updated successfully');
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_new_password) {
      setPwError({ message: 'New passwords do not match' });
      return;
    }
    setPwLoading(true);
    setPwError(null);
    try {
      await authAPI.changePassword(pwForm);
      toast('Password changed successfully');
      setPwForm({ old_password: '', new_password: '', confirm_new_password: '' });
    } catch (err) {
      setPwError(err);
    }
    setPwLoading(false);
  };

  const f = (setter) => (field) => (e) => setter(x => ({ ...x, [field]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
      </div>

      <div className="grid-2">
        {/* Profile Info */}
        <div className="card">
          {/* Avatar */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <Avatar name={user?.full_name || user?.username} size={56} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.125rem' }}>{user?.full_name || user?.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '6px' }}>{user?.email}</div>
              <RoleBadge role={user?.role} />
            </div>
          </div>

          <ErrorAlert error={error} onClose={() => setError(null)} />

          <form onSubmit={handleProfileSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={form.first_name} onChange={f(setForm)('first_name')} placeholder="John" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.last_name} onChange={f(setForm)('last_name')} placeholder="Doe" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={f(setForm)('phone')} placeholder="+1 555 0000" />
              </div>
            </div>

            {/* Read-only info */}
            <div style={{ padding: '14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Username</span>
                <span style={{ fontWeight: '500' }}>@{user?.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email</span>
                <span style={{ fontWeight: '500' }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Member since</span>
                <span style={{ fontWeight: '500' }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Change Password</h3>
          </div>

          <ErrorAlert error={pwError} onClose={() => setPwError(null)} />

          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" value={pwForm.old_password}
                onChange={f(setPwForm)('old_password')} placeholder="••••••••" autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={pwForm.new_password}
                onChange={f(setPwForm)('new_password')} placeholder="Min 8 chars, uppercase & number" autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" value={pwForm.confirm_new_password}
                onChange={f(setPwForm)('confirm_new_password')} placeholder="Repeat new password" autoComplete="new-password" />
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '16px',
            }}>
              Password must be at least 8 characters and include at least one uppercase letter and one number.
            </div>

            <button type="submit" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} disabled={pwLoading}>
              {pwLoading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Changing…</> : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
