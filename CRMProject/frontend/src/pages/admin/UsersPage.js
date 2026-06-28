/**
 * Users Management Page - Admin only
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  SearchBar, LoadingState, EmptyState, ConfirmDialog,
  RoleBadge, Avatar, useDebounce, toast
} from '../../components/common';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersAPI.getAll({ search: debouncedSearch || undefined });
      setUsers(data.results || data);
    } catch {}
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleActive = async (user) => {
    setToggleLoading(user.id);
    try {
      await usersAPI.update(user.id, { is_active: !user.is_active });
      setUsers(us => us.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      toast(`User ${!user.is_active ? 'activated' : 'deactivated'}`);
    } catch {
      toast('Failed to update user', 'error');
    }
    setToggleLoading(null);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await usersAPI.delete(deleteTarget.id);
      toast('User deleted');
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      toast('Failed to delete user', 'error');
    }
    setDeleteLoading(false);
  };

  const admins = users.filter(u => u.role === 'admin');
  const reps = users.filter(u => u.role === 'sales_rep');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} users · {admins.length} admins · {reps.length} sales reps</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState icon="◐" title="No users found" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {users.map(user => (
            <div key={user.id} className="card" style={{
              padding: '20px',
              opacity: user.is_active ? 1 : 0.6,
              transition: 'opacity var(--transition)',
            }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <Avatar name={user.full_name || user.username} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '0.9375rem', marginBottom: '2px' }}>
                        {user.full_name || user.username}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                        @{user.username}
                      </div>
                    </div>
                    <RoleBadge role={user.role} />
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {user.email}
                  </div>

                  {!user.is_active && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '100px',
                      background: 'var(--danger-light)',
                      color: 'var(--danger)',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      marginTop: '4px',
                    }}>
                      Deactivated
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {user.id !== currentUser?.id && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border)',
                }}>
                  <button
                    className={`btn btn-sm ${user.is_active ? 'btn-outline' : 'btn-accent'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleToggleActive(user)}
                    disabled={toggleLoading === user.id}
                  >
                    {toggleLoading === user.id
                      ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      : user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', flex: 1, justifyContent: 'center' }}
                    onClick={() => setDeleteTarget(user)}
                  >
                    Delete
                  </button>
                </div>
              )}
              {user.id === currentUser?.id && (
                <div style={{
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}>
                  This is your account
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Delete user "${deleteTarget?.username}"? This action cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  );
}
