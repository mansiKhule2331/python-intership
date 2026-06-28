/**
 * Login Page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ErrorAlert } from '../../components/common';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError(null);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };

  // Demo login shortcuts
  const demoLogin = async (role) => {
    const creds = role === 'admin'
      ? { email: 'admin@crm.com', password: 'Admin@123' }
      : { email: 'rep1@crm.com', password: 'Rep@123' };
    setForm(creds);
    setLoading(true);
    setApiError(null);
    try {
      await login(creds);
      navigate('/dashboard');
    } catch (err) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'var(--accent)',
            borderRadius: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '16px',
            boxShadow: '0 8px 24px rgba(212,98,26,0.3)',
          }}>N</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to NexusCRM</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <ErrorAlert error={apiError} onClose={() => setApiError(null)} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="email"
                autoFocus
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange('password')}
                autoComplete="current-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'var(--text-inverse)' }} /> Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          {/* Demo logins */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Demo Access
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }} onClick={() => demoLogin('admin')} disabled={loading}>
                ◐ Admin
              </button>
              <button className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }} onClick={() => demoLogin('rep')} disabled={loading}>
                ◎ Sales Rep
              </button>
            </div>
          </div>
        </div>

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: '600' }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
