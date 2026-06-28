/**
 * Pipeline Page - Kanban Board with drag-and-drop
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineAPI } from '../../services/api';
import { LoadingState, StatusBadge, PriorityBadge, Avatar, toast } from '../../components/common';

const COLUMNS = [
  { key: 'new', label: 'New', color: '#3b82f6' },
  { key: 'contacted', label: 'Contacted', color: '#f59e0b' },
  { key: 'qualified', label: 'Qualified', color: '#0891b2' },
  { key: 'proposal_sent', label: 'Proposal Sent', color: '#7c3aed' },
  { key: 'negotiation', label: 'Negotiation', color: '#c2410c' },
  { key: 'won', label: 'Won', color: '#16a34a' },
  { key: 'lost', label: 'Lost', color: '#dc2626' },
];

function LeadCard({ lead, onDragStart, onClick }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onClick(lead)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        cursor: 'grab',
        transition: 'all var(--transition)',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = 'var(--text-muted)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Title */}
      <div style={{ fontWeight: '600', fontSize: '0.8125rem', marginBottom: '6px', lineHeight: 1.4 }}>
        {lead.title}
      </div>

      {/* Customer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Avatar name={lead.customer_name} size={18} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lead.customer_name}
        </span>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PriorityBadge priority={lead.priority} />
        {lead.estimated_value && (
          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            ${Number(lead.estimated_value).toLocaleString()}
          </span>
        )}
      </div>

      {/* Assigned to */}
      {lead.assigned_to_name && (
        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          → {lead.assigned_to_name}
        </div>
      )}
    </div>
  );
}

function Column({ column, leads, totalValue, onDragStart, onDrop, onDragOver, onDragLeave, isDragOver, navigate }) {
  return (
    <div
      onDrop={(e) => onDrop(e, column.key)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        minWidth: '240px',
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all var(--transition)',
      }}
    >
      {/* Column Header */}
      <div style={{
        padding: '12px 14px',
        background: isDragOver ? `${column.color}12` : 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${isDragOver ? column.color + '40' : 'var(--border)'}`,
        transition: 'all var(--transition)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: column.color }} />
            <span style={{ fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {column.label}
            </span>
          </div>
          <span style={{
            background: column.color + '20',
            color: column.color,
            fontSize: '0.75rem',
            fontWeight: '700',
            padding: '1px 8px',
            borderRadius: '100px',
          }}>
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            ${(totalValue / 1000).toFixed(0)}k pipeline
          </div>
        )}
      </div>

      {/* Drop Zone */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        minHeight: '80px',
        padding: '4px 2px',
        borderRadius: 'var(--radius-md)',
        background: isDragOver ? `${column.color}08` : 'transparent',
        border: isDragOver ? `2px dashed ${column.color}60` : '2px dashed transparent',
        transition: 'all var(--transition)',
      }}>
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onClick={(l) => navigate(`/leads/${l.id}`)}
          />
        ))}
        {leads.length === 0 && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            opacity: isDragOver ? 0.8 : 0.5,
          }}>
            {isDragOver ? 'Drop here' : 'No leads'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const { data } = await pipelineAPI.get();
      setPipeline(data);
    } catch {}
    setLoading(false);
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLead || draggedLead.status === targetStatus) {
      setDraggedLead(null);
      return;
    }

    // Optimistic update
    const sourceStatus = draggedLead.status;
    setPipeline(prev => {
      const updated = { ...prev };
      // Remove from source
      updated[sourceStatus] = {
        ...updated[sourceStatus],
        leads: updated[sourceStatus].leads.filter(l => l.id !== draggedLead.id),
        count: updated[sourceStatus].count - 1,
      };
      // Add to target
      const movedLead = { ...draggedLead, status: targetStatus };
      updated[targetStatus] = {
        ...updated[targetStatus],
        leads: [movedLead, ...updated[targetStatus].leads],
        count: updated[targetStatus].count + 1,
      };
      return updated;
    });

    setUpdating(true);
    try {
      await pipelineAPI.updateStatus(draggedLead.id, targetStatus);
      toast(`Moved to ${targetStatus.replace('_', ' ')}`);
    } catch {
      toast('Failed to update status', 'error');
      fetchPipeline(); // Revert on error
    }
    setUpdating(false);
    setDraggedLead(null);
  };

  if (loading) return <LoadingState message="Loading pipeline..." />;

  const totalLeads = pipeline ? COLUMNS.reduce((acc, col) => acc + (pipeline[col.key]?.count || 0), 0) : 0;
  const totalValue = pipeline ? COLUMNS.reduce((acc, col) => acc + parseFloat(pipeline[col.key]?.total_value || 0), 0) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p className="page-subtitle">
            {totalLeads} leads · ${(totalValue / 1000).toFixed(0)}k total pipeline value
            {updating && <span style={{ marginLeft: '8px', color: 'var(--accent)' }}>· Saving…</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={fetchPipeline}>↻ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/leads/new')}>+ Add Lead</button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'var(--accent-light)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
        fontSize: '0.8125rem',
        color: 'var(--accent)',
      }}>
        <span>⟺</span>
        <span>Drag and drop lead cards between columns to update their status</span>
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '16px',
        minHeight: '60vh',
      }}>
        {COLUMNS.map(column => (
          <Column
            key={column.key}
            column={column}
            leads={pipeline?.[column.key]?.leads || []}
            totalValue={parseFloat(pipeline?.[column.key]?.total_value || 0)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={(e) => { handleDragOver(e); setDragOverColumn(column.key); }}
            onDragLeave={handleDragLeave}
            isDragOver={dragOverColumn === column.key}
            navigate={navigate}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        marginTop: '20px',
        padding: '16px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
      }}>
        {COLUMNS.map(col => (
          <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {col.label}: <strong>{pipeline?.[col.key]?.count || 0}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
