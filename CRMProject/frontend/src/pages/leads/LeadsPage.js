/**
 * Leads Page - Full CRUD with status/priority filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI, customersAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  SearchBar, Pagination, LoadingState, EmptyState,
  ConfirmDialog, Modal, ErrorAlert, StatusBadge, PriorityBadge,
  SelectFilter, useDebounce, toast
} from '../../components/common';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const INTERACTION_TYPES = ['call', 'email', 'meeting', 'note', 'demo', 'follow_up'];
const SOURCE_OPTIONS = ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Conference', 'Email Campaign', 'Other'];

function LeadForm({ initial = {}, customers, users, onSubmit, loading, error, onClose }) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    customer: '', title: '', status: 'new', priority: 'medium',
    assigned_to: '', estimated_value: '', expected_close_date: '',
    source: '', notes: '',
    ...initial,
    customer: initial.customer || '',
    assigned_to: initial.assigned_to || '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.customer) e.customer = 'Customer is required';
    if (!form.title.trim()) e.title = 'Title is required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    const payload = {
      ...form,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      expected_close_date: form.expected_close_date || null,
      assigned_to: form.assigned_to || null,
    };
    onSubmit(payload);
  };

  const f = (field) => (e) => {
    setForm(x => ({ ...x, [field]: e.target.value }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorAlert error={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Lead Title *</label>
          <input className="form-input" value={form.title} onChange={f('title')} placeholder="e.g. Enterprise Software Deal" />
          {errors.title && <span className="form-error">{errors.title}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Customer *</label>
          <select className="form-select" value={form.customer} onChange={f('customer')}>
            <option value="">Select customer…</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
          </select>
          {errors.customer && <span className="form-error">{errors.customer}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={f('status')}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={f('priority')}>
            {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {isAdmin && (
          <div className="form-group">
            <label className="form-label">Assign To</label>
            <select className="form-select" value={form.assigned_to} onChange={f('assigned_to')}>
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Estimated Value ($)</label>
          <input type="number" className="form-input" value={form.estimated_value} onChange={f('estimated_value')} placeholder="0.00" min="0" step="100" />
        </div>
        <div className="form-group">
          <label className="form-label">Expected Close Date</label>
          <input type="date" className="form-input" value={form.expected_close_date} onChange={f('expected_close_date')} />
        </div>
        <div className="form-group">
          <label className="form-label">Lead Source</label>
          <select className="form-select" value={form.source} onChange={f('source')}>
            <option value="">Select source…</option>
            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={f('notes')} rows={3} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : 'Save Lead'}
        </button>
      </div>
    </form>
  );
}

export default function LeadsPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [formModal, setFormModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  // Load customers and users for form selects
  useEffect(() => {
    const loadSelects = async () => {
      try {
        const custRes = await customersAPI.getAll({ page_size: 200 });
        setCustomers(custRes.data.results || custRes.data);
        if (isAdmin) {
          const usersRes = await usersAPI.getAll({ page_size: 100 });
          setUsers(usersRes.data.results || usersRes.data);
        }
      } catch {}
    };
    loadSelects();
  }, [isAdmin]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        search: debouncedSearch || undefined,
        ordering,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      };
      const { data } = await leadsAPI.getAll(params);
      setLeads(data.results || data);
      setCount(data.count || (data.results ? data.results.length : data.length));
    } catch {}
    setLoading(false);
  }, [page, debouncedSearch, ordering, statusFilter, priorityFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, priorityFilter]);

  const handleSort = (field) => {
    setOrdering(o => o === field ? `-${field}` : field);
    setPage(1);
  };

  const SortIcon = ({ field }) => {
    if (ordering === field) return <span style={{ marginLeft: 4, opacity: 0.7 }}>↑</span>;
    if (ordering === `-${field}`) return <span style={{ marginLeft: 4, opacity: 0.7 }}>↓</span>;
    return <span style={{ marginLeft: 4, opacity: 0.25 }}>↕</span>;
  };

  const handleCreate = async (form) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await leadsAPI.create(form);
      toast('Lead created successfully');
      setFormModal(null);
      fetchLeads();
    } catch (err) {
      setFormError(err);
    }
    setFormLoading(false);
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await leadsAPI.update(formModal.id, form);
      toast('Lead updated successfully');
      setFormModal(null);
      fetchLeads();
    } catch (err) {
      setFormError(err);
    }
    setFormLoading(false);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await leadsAPI.delete(deleteTarget.id);
      toast('Lead deleted');
      setDeleteTarget(null);
      fetchLeads();
    } catch {
      toast('Failed to delete lead', 'error');
    }
    setDeleteLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{count} total leads</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setFormModal('create'); }}>
          + Add Lead
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search leads..." />
        </div>
        <div className="toolbar-right">
          <SelectFilter value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="All Statuses" />
          <SelectFilter value={priorityFilter} onChange={setPriorityFilter} options={PRIORITY_OPTIONS} placeholder="All Priorities" />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('title')}>Lead <SortIcon field="title" /></th>
                <th>Customer</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('priority')}>Priority <SortIcon field="priority" /></th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('estimated_value')}>Value <SortIcon field="estimated_value" /></th>
                <th>Assigned To</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('expected_close_date')}>Close Date <SortIcon field="expected_close_date" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingState /></td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon="◈" title="No leads found" description="Add your first lead or adjust filters" />
                </td></tr>
              ) : leads.map(lead => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: '500', cursor: 'pointer', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      onClick={() => navigate(`/leads/${lead.id}`)}>
                      {lead.title}
                    </div>
                    {lead.source && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.source}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem' }}>{lead.customer_name}</div>
                    {lead.customer_company && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lead.customer_company}</div>}
                  </td>
                  <td><StatusBadge status={lead.status} /></td>
                  <td><PriorityBadge priority={lead.priority} /></td>
                  <td style={{ fontWeight: '600', color: lead.estimated_value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {lead.estimated_value ? `$${Number(lead.estimated_value).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {lead.assigned_to_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost btn-sm" title="View" onClick={() => navigate(`/leads/${lead.id}`)}>◎</button>
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setFormError(null); setFormModal(lead); }}>✎</button>
                      <button className="btn btn-ghost btn-sm" title="Delete"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(lead)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination count={count} page={page} pageSize={10} onPageChange={setPage} />
      </div>

      <Modal
        isOpen={!!formModal}
        onClose={() => setFormModal(null)}
        title={formModal === 'create' ? 'Add Lead' : 'Edit Lead'}
        size="lg"
      >
        <LeadForm
          initial={formModal !== 'create' ? formModal : {}}
          customers={customers}
          users={users}
          onSubmit={formModal === 'create' ? handleCreate : handleUpdate}
          loading={formLoading}
          error={formError}
          onClose={() => setFormModal(null)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Delete "${deleteTarget?.title}"? All associated interactions will also be deleted.`}
        loading={deleteLoading}
      />
    </div>
  );
}
