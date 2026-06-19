/**
 * Register Page
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ErrorAlert } from '../../components/common';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', confirm_password: '', role: 'sales_rep',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.username) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'Min 3 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Min 8 characters';
    else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) e.password = 'Must include uppercase & number';
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError(null);
    try {
      await register(form);
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

  const PasswordStrength = () => {
    const p = form.password;
    const checks = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)];
    const strength = checks.filter(Boolean).length;
    const colors = ['', '#dc2626', '#d97706', '#2563eb', '#16a34a'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    if (!p) return null;
    return (
      <div style={{ marginTop: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= strength ? colors[strength] : 'var(--border)', transition: 'background 200ms' }} />
          ))}
        </div>
        <span style={{ fontSize: '0.75rem', color: colors[strength] }}>{labels[strength]}</span>
      </div>
    );
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
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
          }}>N</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Create account
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join NexusCRM today</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <ErrorAlert error={apiError} onClose={() => setApiError(null)} />

          <form onSubmit={handleSubmit}>
            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input type="text" className="form-input" placeholder="John" value={form.first_name} onChange={handleChange('first_name')} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input type="text" className="form-input" placeholder="Doe" value={form.last_name} onChange={handleChange('last_name')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Username *</label>
              <input type="text" className="form-input" placeholder="johndoe" value={form.username} onChange={handleChange('username')} autoComplete="username" />
              {errors.username && <span className="form-error">{errors.username}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input" placeholder="john@company.com" value={form.email} onChange={handleChange('email')} autoComplete="email" />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={form.role} onChange={handleChange('role')}>
                <option value="sales_rep">Sales Representative</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" className="form-input" placeholder="Min 8 chars, uppercase & number" value={form.password} onChange={handleChange('password')} autoComplete="new-password" />
              <PasswordStrength />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input type="password" className="form-input" placeholder="Repeat password" value={form.confirm_password} onChange={handleChange('confirm_password')} autoComplete="new-password" />
              {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: 'var(--text-inverse)' }} /> Creating account…</>
                : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '600' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
