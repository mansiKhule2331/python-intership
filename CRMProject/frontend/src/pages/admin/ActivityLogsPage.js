/**
 * Activity Logs Page - Admin only
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { LoadingState, EmptyState, Pagination } from '../../components/common';

const ACTION_COLORS = {
  create: '#16a34a', update: '#2563eb', delete: '#dc2626',
  login: '#0891b2', logout: '#6b7280', export: '#7c3aed',
  assign: '#d97706', status_change: '#c2410c',
};

const ACTION_ICONS = {
  create: '+', update: '✎', delete: '✕',
  login: '→', logout: '←', export: '↓',
  assign: '◈', status_change: '◉',
};

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/activity-logs', { params: { page, ordering: '-created_at' } });
      setLogs(data.results || data);
      setCount(data.count || (data.results ? data.results.length : data.length));
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">Complete audit trail of all user actions</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchLogs}>↻ Refresh</button>
      </div>

      {loading ? <LoadingState /> : logs.length === 0 ? (
        <EmptyState icon="◳" title="No activity logs yet" />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>User</th>
                  <th>Resource</th>
                  <th>Object</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 10px',
                        borderRadius: '100px',
                        background: (ACTION_COLORS[log.action] || '#999') + '20',
                        color: ACTION_COLORS[log.action] || '#999',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}>
                        {ACTION_ICONS[log.action]} {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500', fontSize: '0.875rem' }}>{log.user_name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{log.model_name || '—'}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {log.object_repr || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination count={count} page={page} pageSize={10} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
