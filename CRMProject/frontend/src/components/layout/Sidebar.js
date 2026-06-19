/**
 * Sidebar - Main navigation component
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { path: '/customers', icon: '◎', label: 'Customers' },
  { path: '/leads', icon: '◈', label: 'Leads' },
  { path: '/pipeline', icon: '⧉', label: 'Pipeline' },
  { path: '/interactions', icon: '◉', label: 'Interactions' },
];

const ADMIN_ITEMS = [
  { path: '/users', icon: '◐', label: 'Users' },
  { path: '/activity', icon: '◳', label: 'Activity Logs' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const NavItem = ({ item }) => (
    <NavLink
      to={item.path}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: collapsed ? '10px 0' : '10px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: isActive ? '600' : '400',
        background: isActive ? 'var(--bg-tertiary)' : 'transparent',
        fontSize: '0.9rem',
        transition: 'all var(--transition)',
        textDecoration: 'none',
        position: 'relative',
      })}
    >
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );

  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      width: collapsed ? '64px' : 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      transition: 'width var(--transition)',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '24px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: 'var(--accent)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: '700',
          flexShrink: 0,
        }}>N</div>
        {!collapsed && (
          <span style={{ fontWeight: '700', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            NexusCRM
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map(item => <NavItem key={item.path} item={item} />)}

        {isAdmin && (
          <>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              padding: collapsed ? '12px 0 4px' : '12px 14px 4px',
              textAlign: collapsed ? 'center' : 'left',
            }}>
              {collapsed ? '•' : 'Admin'}
            </div>
            {ADMIN_ITEMS.map(item => <NavItem key={item.path} item={item} />)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: collapsed ? '10px 0' : '10px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            width: '100%',
            transition: 'all var(--transition)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>{isDark ? '☀' : '◑'}</span>
          {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* User info + logout */}
        {!collapsed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            marginTop: '4px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
              flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || user?.username}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {user?.role === 'admin' ? 'Admin' : 'Sales Rep'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '1rem',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              ⇥
            </button>
          </div>
        )}

        {collapsed && (
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 0',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              transition: 'all var(--transition)',
            }}
            title="Logout"
          >
            ⇥
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: '28px',
          right: collapsed ? '-14px' : '-14px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          zIndex: 10,
          transition: 'all var(--transition)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>
    </aside>
  );
}
