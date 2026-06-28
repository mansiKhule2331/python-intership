/**
 * Lead Detail Page - Full lead view with interaction history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadsAPI, interactionsAPI } from '../../services/api';
import {
  LoadingState, StatusBadge, PriorityBadge, Modal, ErrorAlert,
  ConfirmDialog, InteractionIcon, Avatar, toast
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';

const INTERACTION_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Follow Up' },
];

const STATUS_OPTIONS = ['new','contacted','qualified','proposal_sent','negotiation','won','lost'];

function AddInteractionForm({ leadId, onSuccess, onClose }) {
  const [form, setForm] = useState({
    lead: leadId,
    interaction_type: 'call',
    description: '',
    outcome: '',
    interaction_date: new Date().toISOString().slice(0, 16),
    duration_minutes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await interactionsAPI.create({
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      });
      toast('Interaction logged');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err);
    }
    setLoading(false);
  };

  const f = (field) => (e) => setForm(x => ({ ...x, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit}>
      <ErrorAlert error={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-select" value={form.interaction_type} onChange={f('interaction_type')}>
            {INTERACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Date & Time</label>
          <input type="datetime-local" className="form-input" value={form.interaction_date} onChange={f('interaction_date')} />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Description *</label>
          <textarea className="form-textarea" value={form.description} onChange={f('description')} placeholder="Describe the interaction..." rows={4} required />
        </div>
        <div className="form-group">
          <label className="form-label">Outcome</label>
          <input className="form-input" value={form.outcome} onChange={f('outcome')} placeholder="e.g. Follow-up scheduled" />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input type="number" className="form-input" value={form.duration_minutes} onChange={f('duration_minutes')} placeholder="30" min="1" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Logging…</> : 'Log Interaction'}
        </button>
      </div>
    </form>
  );
}

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteInteraction, setDeleteInteraction] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const [leadRes, interRes] = await Promise.all([
        leadsAPI.getById(id),
        leadsAPI.getInteractions(id),
      ]);
      setLead(leadRes.data);
      setInteractions(interRes.data.results || interRes.data);
    } catch { navigate('/leads'); }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchLead(); }, [fetchLead]);

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      await leadsAPI.update(id, { ...lead, status: newStatus });
      setLead(l => ({ ...l, status: newStatus }));
      toast(`Status updated to ${newStatus}`);
    } catch {
      toast('Failed to update status', 'error');
    }
    setStatusLoading(false);
  };

  const handleDeleteInteraction = async () => {
    setDeleteLoading(true);
    try {
      await interactionsAPI.delete(deleteInteraction.id);
      toast('Interaction deleted');
      setDeleteInteraction(null);
      fetchLead();
    } catch {
      toast('Failed to delete', 'error');
    }
    setDeleteLoading(false);
  };

  if (loading) return <LoadingState />;
  if (!lead) return null;

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', width: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.9rem' }}>{value ?? '—'}</span>
    </div>
  );

  const typeColors = { call: '#16a34a', email: '#2563eb', meeting: '#7c3aed', note: '#d97706', demo: '#d4621a', follow_up: '#0891b2' };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')} style={{ marginBottom: '8px' }}>
            ← Back to Leads
          </button>
          <h1 className="page-title">{lead.title}</h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <StatusBadge status={lead.status} />
            <PriorityBadge priority={lead.priority} />
            {lead.source && <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{lead.source}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/customers/${lead.customer}`)}>
            View Customer
          </button>
          <button className="btn btn-primary" onClick={() => setShowInteractionModal(true)}>
            + Log Interaction
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '24px' }}>
        {/* Lead Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Lead Details</h3>
            </div>
            <InfoRow label="Customer" value={
              <span style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: '500' }}
                onClick={() => navigate(`/customers/${lead.customer}`)}>
                {lead.customer_name}
              </span>
            } />
            <InfoRow label="Company" value={lead.customer_company} />
            <InfoRow label="Email" value={<a href={`mailto:${lead.customer_email}`}>{lead.customer_email}</a>} />
            <InfoRow label="Assigned To" value={lead.assigned_to_name || 'Unassigned'} />
            <InfoRow label="Estimated Value" value={lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : null} />
            <InfoRow label="Expected Close" value={lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : null} />
            <InfoRow label="Interactions" value={lead.interactions_count} />
            <InfoRow label="Created" value={new Date(lead.created_at).toLocaleString()} />
            {lead.notes && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '6px' }}>Notes</div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Quick Status Change */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Update Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => s !== lead.status && handleStatusChange(s)}
                  disabled={statusLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: lead.status === s ? 'var(--accent)' : 'var(--border)',
                    background: lead.status === s ? 'var(--accent-light)' : 'transparent',
                    cursor: s === lead.status ? 'default' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: lead.status === s ? '600' : '400',
                    color: lead.status === s ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'all var(--transition)',
                    textAlign: 'left',
                  }}
                >
                  {lead.status === s && <span>●</span>}
                  {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interaction Timeline */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Interaction History ({interactions.length})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInteractionModal(true)}>
              + Add
            </button>
          </div>

          {interactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px', opacity: 0.4 }}>◉</div>
              <p style={{ fontSize: '0.875rem' }}>No interactions yet. Log the first one!</p>
            </div>
          ) : (
            <div className="timeline">
              {interactions.map(interaction => (
                <div key={interaction.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: typeColors[interaction.interaction_type] || 'var(--accent)' }} />
                  <div style={{
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    position: 'relative',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <InteractionIcon type={interaction.interaction_type} />
                        <span style={{ fontWeight: '600', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                          {interaction.interaction_type.replace('_', ' ')}
                        </span>
                        {interaction.duration_minutes && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            · {interaction.duration_minutes}m
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(interaction.interaction_date).toLocaleString()}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)', padding: '2px 6px', fontSize: '0.8rem' }}
                          onClick={() => setDeleteInteraction(interaction)}
                        >✕</button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {interaction.description}
                    </p>
                    {interaction.outcome && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 8px', borderRadius: '100px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        fontSize: '0.75rem', color: 'var(--text-secondary)',
                      }}>
                        Outcome: {interaction.outcome}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <Avatar name={interaction.created_by_name} size={20} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {interaction.created_by_name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Interaction Modal */}
      <Modal isOpen={showInteractionModal} onClose={() => setShowInteractionModal(false)} title="Log Interaction" size="lg">
        <AddInteractionForm
          leadId={id}
          onSuccess={fetchLead}
          onClose={() => setShowInteractionModal(false)}
        />
      </Modal>

      {/* Delete Interaction Confirm */}
      <ConfirmDialog
        isOpen={!!deleteInteraction}
        onClose={() => setDeleteInteraction(null)}
        onConfirm={handleDeleteInteraction}
        title="Delete Interaction"
        message="Are you sure you want to delete this interaction?"
        loading={deleteLoading}
      />
    </div>
  );
}
