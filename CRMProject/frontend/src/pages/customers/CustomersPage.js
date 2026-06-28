/**
 * Customers Page - Full CRUD with search, pagination, sorting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  SearchBar, Pagination, LoadingState, EmptyState,
  ConfirmDialog, Modal, ErrorAlert, useDebounce, toast
} from '../../components/common';

function CustomerForm({ initial = {}, onSubmit, loading, error, onClose }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    website: '', address: '', city: '', country: '', notes: '',
    ...initial,
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
  };

  const f = (field) => (e) => {
    setForm(x => ({ ...x, [field]: e.target.value }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <ErrorAlert error={error} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="form-input" value={form.name} onChange={f('name')} placeholder="John Doe" />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input type="email" className="form-input" value={form.email} onChange={f('email')} placeholder="john@company.com" />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={form.phone} onChange={f('phone')} placeholder="+1 555 0000" />
        </div>
        <div className="form-group">
          <label className="form-label">Company</label>
          <input className="form-input" value={form.company} onChange={f('company')} placeholder="Acme Corp" />
        </div>
        <div className="form-group">
          <label className="form-label">Website</label>
          <input className="form-input" value={form.website} onChange={f('website')} placeholder="https://example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">City</label>
          <input className="form-input" value={form.city} onChange={f('city')} placeholder="New York" />
        </div>
        <div className="form-group">
          <label className="form-label">Country</label>
          <input className="form-input" value={form.country} onChange={f('country')} placeholder="USA" />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={f('notes')} placeholder="Any additional notes..." rows={3} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…</> : 'Save Customer'}
        </button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [formModal, setFormModal] = useState(null); // null | 'create' | customer object
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await customersAPI.getAll({
        page,
        search: debouncedSearch || undefined,
        ordering,
      });
      setCustomers(data.results || data);
      setCount(data.count || (data.results ? data.results.length : data.length));
    } catch {}
    setLoading(false);
  }, [page, debouncedSearch, ordering]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

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
      await customersAPI.create(form);
      toast('Customer created successfully');
      setFormModal(null);
      fetchCustomers();
    } catch (err) {
      setFormError(err);
    }
    setFormLoading(false);
  };

  const handleUpdate = async (form) => {
    setFormLoading(true);
    setFormError(null);
    try {
      await customersAPI.update(formModal.id, form);
      toast('Customer updated successfully');
      setFormModal(null);
      fetchCustomers();
    } catch (err) {
      setFormError(err);
    }
    setFormLoading(false);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await customersAPI.delete(deleteTarget.id);
      toast('Customer deleted');
      setDeleteTarget(null);
      fetchCustomers();
    } catch {
      toast('Failed to delete customer', 'error');
    }
    setDeleteLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">{count} total customers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setFormModal('create'); }}>
          + Add Customer
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search customers..." />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Name <SortIcon field="name" /></th>
                <th>Email</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('company')}>Company <SortIcon field="company" /></th>
                <th>Phone</th>
                <th>Leads</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('created_at')}>Created <SortIcon field="created_at" /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><LoadingState /></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState icon="◎" title="No customers found" description={search ? 'Try a different search term' : 'Add your first customer to get started'} />
                </td></tr>
              ) : customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: '500', cursor: 'pointer', color: 'var(--text-primary)' }}
                      onClick={() => navigate(`/customers/${c.id}`)}>
                      {c.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{c.email}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.company || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                  <td>
                    <span style={{ fontWeight: '600', color: (c.leads_count || 0) > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {c.leads_count || 0}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className="btn btn-ghost btn-sm" title="View" onClick={() => navigate(`/customers/${c.id}`)}>◎</button>
                      <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setFormError(null); setFormModal(c); }}>✎</button>
                      {isAdmin && (
                        <button className="btn btn-ghost btn-sm" title="Delete"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setDeleteTarget(c)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination count={count} page={page} pageSize={10} onPageChange={setPage} />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={!!formModal}
        onClose={() => setFormModal(null)}
        title={formModal === 'create' ? 'Add Customer' : 'Edit Customer'}
        size="lg"
      >
        <CustomerForm
          initial={formModal !== 'create' ? formModal : {}}
          onSubmit={formModal === 'create' ? handleCreate : handleUpdate}
          loading={formLoading}
          error={formError}
          onClose={() => setFormModal(null)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also delete all their leads and interactions.`}
        loading={deleteLoading}
      />
    </div>
  );
}
