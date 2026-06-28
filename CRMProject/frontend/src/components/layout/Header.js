/**
 * Header - Top navigation bar with notifications
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

export default function Header({ collapsed }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await notificationsAPI.getUnreadCount();
      setUnreadCount(data.unread_count);
    } catch {}
  };

  const handleNotifClick = async () => {
    if (!showNotifs) {
      try {
        const { data } = await notificationsAPI.getAll();
        setNotifications(data.results || data);
      } catch {}
    }
    setShowNotifs(!showNotifs);
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markRead();
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    } catch {}
  };

  // Get current page title from URL
  const getPageTitle = () => {
    const path = window.location.pathname;
    const titles = {
      '/dashboard': 'Dashboard',
      '/customers': 'Customers',
      '/leads': 'Leads',
      '/pipeline': 'Pipeline',
      '/interactions': 'Interactions',
      '/users': 'Users',
      '/activity': 'Activity Logs',
      '/profile': 'Profile',
    };
    return titles[path] || 'CRM';
  };

  const notifIcons = {
    lead_assigned: '◈',
    lead_status_changed: '◉',
    interaction_added: '◐',
    general: '◎',
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: '600', letterSpacing: '-0.01em' }}>
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={handleNotifClick}
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: showNotifs ? 'var(--bg-tertiary)' : 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              transition: 'all var(--transition)',
            }}
          >
            ◉
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                background: 'var(--accent)',
                color: '#fff',
                borderRadius: '50%',
                fontSize: '0.625rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              width: '360px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              zIndex: 200,
              animation: 'slideUp 150ms ease',
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No notifications
                  </div>
                ) : notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                      background: n.is_read ? 'transparent' : 'var(--accent-light)',
                      cursor: n.related_lead ? 'pointer' : 'default',
                      transition: 'background var(--transition)',
                    }}
                    onClick={() => n.related_lead && navigate(`/leads/${n.related_lead}`)}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '2px' }}>
                        {notifIcons[n.notification_type] || '◎'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: n.is_read ? '400' : '600' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile button */}
        <button
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px 6px 6px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: '600',
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>
            {user?.full_name || user?.username}
          </span>
        </button>
      </div>
    </header>
  );
}
