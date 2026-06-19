/**
 * Interactions Page - Full interaction history with filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { interactionsAPI } from '../../services/api';
import {
  SearchBar, Pagination, LoadingState, EmptyState,
  SelectFilter, InteractionIcon, useDebounce
} from '../../components/common';

const TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow Up' },
];

export default function InteractionsPage() {
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await interactionsAPI.getAll({
        page,
        search: debouncedSearch || undefined,
        interaction_type: typeFilter || undefined,
        ordering: '-interaction_date',
      });
      setInteractions(data.results || data);
      setCount(data.count || (data.results ? data.results.length : data.length));
    } catch {}
    setLoading(false);
  }, [page, debouncedSearch, typeFilter]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);
  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter]);

  const typeColors = {
    call: '#16a34a', email: '#2563eb', meeting: '#7c3aed',
    note: '#d97706', demo: '#d4621a', follow_up: '#0891b2'
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Interactions</h1>
          <p className="page-subtitle">{count} total interactions</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search interactions..." />
        </div>
        <div className="toolbar-right">
          <SelectFilter value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} placeholder="All Types" />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : interactions.length === 0 ? (
        <EmptyState icon="◉" title="No interactions found" description="Interactions are logged from within a lead" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {interactions.map(interaction => (
            <div
              key={interaction.id}
              className="card"
              style={{ cursor: 'pointer', padding: '16px 20px' }}
              onClick={() => navigate(`/leads/${interaction.lead}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                {/* Type indicator */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: (typeColors[interaction.interaction_type] || '#999') + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <InteractionIcon type={interaction.interaction_type} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                    <div>
                      <span style={{ fontWeight: '600', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                        {interaction.interaction_type.replace('_', ' ')}
                      </span>
                      {interaction.duration_minutes && (
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          · {interaction.duration_minutes} min
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(interaction.interaction_date).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--accent)' }}>{interaction.lead_customer}</span>
                    {' · '}
                    {interaction.lead_title}
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {interaction.description.length > 160
                      ? interaction.description.slice(0, 160) + '…'
                      : interaction.description}
                  </p>

                  {interaction.outcome && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '8px',
                      padding: '3px 10px',
                      borderRadius: '100px',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                    }}>
                      Outcome: {interaction.outcome}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Logged by {interaction.created_by_name || 'Unknown'}
                </span>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                  View lead →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {count > 10 && (
        <div className="card" style={{ marginTop: '16px', padding: 0 }}>
          <Pagination count={count} page={page} pageSize={10} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
