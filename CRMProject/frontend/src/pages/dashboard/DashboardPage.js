/**
 * Dashboard Page - Analytics overview with charts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI, exportAPI } from '../../services/api';
import { StatCard, LoadingState, StatusBadge, Avatar, InteractionIcon } from '../../components/common';

const STATUS_COLORS = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#0891b2',
  proposal_sent: '#7c3aed',
  negotiation: '#c2410c',
  won: '#16a34a',
  lost: '#dc2626',
};

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', qualified: 'Qualified',
  proposal_sent: 'Proposal Sent', negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await dashboardAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const { data } = type === 'customers'
        ? await exportAPI.exportCustomers()
        : await exportAPI.exportLeads();
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  if (loading) return <LoadingState message="Loading dashboard..." />;

  const pieData = stats ? Object.entries(stats.leads_by_status)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, color: STATUS_COLORS[k] }))
    : [];

  const conversionRate = stats?.conversion_rate || 0;
  const pipelineValue = parseFloat(stats?.total_pipeline_value || 0);

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--text-primary) 0%, #3a3631 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px 32px',
        marginBottom: '24px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            {user?.first_name || user?.username} 👋
          </h2>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm" onClick={() => handleExport('customers')} disabled={exporting}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
              ↓ Customers CSV
            </button>
            <button className="btn btn-sm" onClick={() => handleExport('leads')} disabled={exporting}
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
              ↓ Leads CSV
            </button>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        <StatCard
          icon="◎"
          label="Total Customers"
          value={stats?.total_customers?.toLocaleString()}
          color="#2563eb"
        />
        <StatCard
          icon="◈"
          label="Total Leads"
          value={stats?.total_leads?.toLocaleString()}
          color="#d4621a"
        />
        <StatCard
          icon="◉"
          label="Interactions"
          value={stats?.total_interactions?.toLocaleString()}
          color="#16a34a"
        />
        <StatCard
          icon="⧉"
          label="Pipeline Value"
          value={pipelineValue > 0 ? `$${(pipelineValue / 1000).toFixed(0)}k` : '$0'}
          color="#7c3aed"
        />
        <StatCard
          icon="✓"
          label="Conversion Rate"
          value={`${conversionRate}%`}
          color="#0891b2"
        />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Monthly Leads Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Leads Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats?.monthly_leads || []}>
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" name="Leads" stroke="var(--accent)" strokeWidth={2} fill="url(#leadsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Status Pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Lead Status Distribution</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No lead data yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-2">
        {/* Recent Leads */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Leads</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>View all →</button>
          </div>
          {(stats?.recent_leads || []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No leads yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(stats?.recent_leads || []).map(lead => (
                <div
                  key={lead.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-md)', transition: 'background var(--transition)' }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={lead.customer_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '500', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.customer_name}</div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Interactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Interactions</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/interactions')}>View all →</button>
          </div>
          {(stats?.recent_interactions || []).length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No interactions yet.</p>
          ) : (
            <div className="timeline">
              {(stats?.recent_interactions || []).map(interaction => (
                <div key={interaction.id} className="timeline-item">
                  <div className="timeline-dot" style={{
                    background: { call: '#16a34a', email: '#2563eb', meeting: '#7c3aed', note: '#d97706' }[interaction.interaction_type] || 'var(--accent)'
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <InteractionIcon type={interaction.interaction_type} />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', textTransform: 'capitalize' }}>
                          {interaction.interaction_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {interaction.lead_customer} · {interaction.lead_title}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(interaction.interaction_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin: Top Performers */}
      {isAdmin && stats?.top_performers?.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <div className="card-header">
            <h3 className="card-title">Top Performers (Won Leads)</h3>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {stats.top_performers.map((rep, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px', background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)', flex: '1', minWidth: '180px',
              }}>
                <span style={{
                  width: '28px', height: '28px',
                  background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#b45309',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: '700', color: '#fff',
                }}>#{i + 1}</span>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>
                    {rep.assigned_to__first_name} {rep.assigned_to__last_name || rep.assigned_to__username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.won_count} won leads</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
