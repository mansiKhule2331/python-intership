/**
 * Customer Detail Page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersAPI } from '../../services/api';
import { LoadingState, StatusBadge, PriorityBadge, EmptyState } from '../../components/common';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [custRes, leadsRes] = await Promise.all([
          customersAPI.getById(id),
          customersAPI.getLeads(id),
        ]);
        setCustomer(custRes.data);
        setLeads(leadsRes.data.results || leadsRes.data);
      } catch { navigate('/customers'); }
      setLoading(false);
    };
    fetch();
  }, [id, navigate]);

  if (loading) return <LoadingState />;
  if (!customer) return null;

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', width: '120px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.9rem' }}>{value || '—'}</span>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customers')} style={{ marginBottom: '8px' }}>
            ← Back to Customers
          </button>
          <h1 className="page-title">{customer.name}</h1>
          <p className="page-subtitle">{customer.company}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/leads', { state: { customerId: customer.id } })}>
            + Add Lead
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Customer Info */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Customer Information</h3>
          </div>
          <InfoRow label="Email" value={<a href={`mailto:${customer.email}`}>{customer.email}</a>} />
          <InfoRow label="Phone" value={customer.phone} />
          <InfoRow label="Company" value={customer.company} />
          <InfoRow label="Website" value={customer.website ? <a href={customer.website} target="_blank" rel="noreferrer">{customer.website}</a> : null} />
          <InfoRow label="City" value={customer.city} />
          <InfoRow label="Country" value={customer.country} />
          <InfoRow label="Created" value={new Date(customer.created_at).toLocaleString()} />
          {customer.notes && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '6px' }}>Notes</div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Leads */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Leads ({leads.length})</h3>
          </div>
          {leads.length === 0 ? (
            <EmptyState icon="◈" title="No leads yet" description="Create a lead for this customer" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  style={{
                    padding: '12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem', marginBottom: '4px' }}>{lead.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {lead.assigned_to_name || 'Unassigned'} ·{' '}
                        {lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : 'No value'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                      <StatusBadge status={lead.status} />
                      <PriorityBadge priority={lead.priority} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
