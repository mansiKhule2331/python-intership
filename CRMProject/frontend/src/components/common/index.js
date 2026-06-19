/**
 * Common Reusable Components
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─── Modal ────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = '' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: '1.25rem',
              padding: '4px', borderRadius: '4px', lineHeight: 1,
              display: 'flex', alignItems: 'center',
            }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────
export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', danger = true, loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing...</> : confirmText}
        </button>
      </div>
    </Modal>
  );
}

// ─── Status Badge ─────────────────────────────────────────────
export function StatusBadge({ status }) {
  const labels = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified',
    proposal_sent: 'Proposal Sent', negotiation: 'Negotiation',
    won: 'Won', lost: 'Lost',
  };
  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge-${priority}`}>{priority?.charAt(0).toUpperCase() + priority?.slice(1)}</span>;
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{role === 'admin' ? 'Admin' : 'Sales Rep'}</span>;
}

// ─── Search Bar ───────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search-bar">
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>⌕</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0 4px' }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────
export function Pagination({ count, page, pageSize = 10, onPageChange }) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="pagination">
      <span>
        Showing {Math.min((page - 1) * pageSize + 1, count)}–{Math.min(page * pageSize, count)} of {count}
      </span>
      <div className="pagination-controls">
        <button className="pagination-btn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>‹</button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>…</span>
            : <button key={p} className={`pagination-btn ${page === p ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
        )}
        <button className="pagination-btn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>›</button>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────
export function StatCard({ icon, label, value, color = '#d4621a', trend, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bgColor || `${color}18`, color }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
        {trend !== undefined && (
          <div style={{ fontSize: '0.75rem', color: trend >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '2px' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-screen" style={{ flexDirection: 'column', gap: '12px' }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{message}</span>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon = '◎', title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
}

// ─── Error Alert ──────────────────────────────────────────────
export function ErrorAlert({ error, onClose }) {
  if (!error) return null;
  const message = error?.response?.data?.detail ||
    error?.response?.data?.non_field_errors?.[0] ||
    error?.message || 'An unexpected error occurred.';

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--danger-light)',
      color: 'var(--danger)',
      borderRadius: 'var(--radius-md)',
      fontSize: '0.875rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '8px',
      marginBottom: '16px',
    }}>
      <span>⚠ {message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1 }}>✕</button>
      )}
    </div>
  );
}

// ─── Select Filter ────────────────────────────────────────────
export function SelectFilter({ value, onChange, options, placeholder = 'All' }) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ minWidth: '140px' }}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ─── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, size = 32, src }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (src) {
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }

  // Generate consistent color from name
  const colors = ['#d4621a', '#2563eb', '#16a34a', '#7c3aed', '#d97706', '#0891b2'];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: colors[colorIdx],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: size * 0.35,
      fontWeight: '600',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Interaction Type Icon ────────────────────────────────────
export function InteractionIcon({ type }) {
  const icons = { call: '☏', email: '✉', meeting: '◉', note: '◎', demo: '◈', follow_up: '↻' };
  const colors = { call: '#16a34a', email: '#2563eb', meeting: '#7c3aed', note: '#d97706', demo: '#d4621a', follow_up: '#0891b2' };
  return (
    <span style={{ color: colors[type] || 'var(--text-muted)', fontSize: '1rem' }}>
      {icons[type] || '◎'}
    </span>
  );
}

// ─── Form Row ─────────────────────────────────────────────────
export function FormRow({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {children}
    </div>
  );
}

// ─── useDebounce hook ─────────────────────────────────────────
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Toast helper (using CSS only) ────────────────────────────
let _toastFn = null;
export function setToastFn(fn) { _toastFn = fn; }
export function toast(message, type = 'success') { _toastFn?.(message, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setToastFn((message, type) => {
      const id = Date.now();
      setToasts(t => [...t, { id, message, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    });
  }, []);

  const colors = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px',
          background: 'var(--bg-card)',
          border: `1px solid ${colors[t.type] || colors.success}`,
          borderLeft: `4px solid ${colors[t.type] || colors.success}`,
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
          maxWidth: '320px',
          animation: 'slideUp 200ms ease',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
