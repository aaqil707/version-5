import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './UserManagement.css';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [grantAdmin, setGrantAdmin] = useState(true);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    localStorage.removeItem('user');
  }
  const isAdmin = user.admin_access === true || user.admin_access === 1;

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers(statusFilter);
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fetch users error:', err);
      }
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const data = await api.getAllUsersForAdmin();
      if (data.success) {
        setAllUsers(data.users || []);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch all users:', data.error);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Fetch all users error:', err);
      }
    }
  };

  const openModal = async () => {
    setShowModal(true);
    setSelectedUser(null);
    setGrantAdmin(true);
    setModalError('');
    setModalSuccess('');
    await fetchAllUsers();
  };

  const handleGrantAdminAccess = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    
    if (!selectedUser) {
      setModalError('Please select a user');
      return;
    }
    
    // Ensure selectedUser has a valid id
    const userId = selectedUser.id;
    
    if (!userId || userId === 0 || userId === '0') {
      setModalError('Invalid user selection. Please try again. User ID is missing or invalid.');
      return;
    }
    
    try {
      setActionLoading('saving');
      
      const data = await api.setAdminAccess(userId, grantAdmin);
      if (data.success) {
        setModalSuccess(data.message);
        setSelectedUser(null);
        fetchUsers();
        setTimeout(() => setShowModal(false), 1500);
      } else {
        setModalError(data.error || 'Operation failed');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Grant admin access error:', err);
      }
      setModalError(err.message || 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'grantAdmin') {
      setGrantAdmin(checked);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Send password reset link to this user?')) return;
    
    setActionLoading(userId);
    try {
      const data = await api.adminResetPassword(userId);
      alert(data.message || 'Reset link sent!');
    } catch (err) {
      alert(err.message || 'Failed to send reset link');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const userStatus = currentStatus || 'Active';
    const action = userStatus === 'Active' ? 'inactivate' : 'activate_status';
    if (!window.confirm(`${action === 'activate_status' ? 'Activate' : 'Inactivate'} this user?`)) return;
    
    setActionLoading(`toggle_${userId}`);
    try {
      const data = await api.toggleUserStatus(userId, action);
      alert(data.message || 'User status updated!');
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (userId, isAdminUser) => {
    const action = isAdminUser ? 'demote' : 'promote';
    if (!window.confirm(`${action === 'promote' ? 'Promote' : 'Demote'} this user to ${action === 'promote' ? 'admin' : 'user'}?`)) return;
    
    setActionLoading(`promote_${userId}`);
    try {
      const data = await api.toggleUserStatus(userId, 'promote');
      alert(data.message || 'User role updated!');
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (user) => {
    const userStatus = user.status || 'Active';
    if (userStatus === 'Inactive') {
      return <span className="badge inactive">Inactive</span>;
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return <span className="badge locked">Locked</span>;
    }
    if (!user.is_verified) {
      return <span className="badge pending">Pending</span>;
    }
    return <span className="badge active">Active</span>;
  };

  if (!isAdmin) {
    return (
      <div className="user-management-container">
        <div className="access-denied">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="page-header">
        <h1><i className="fas fa-users"></i> User Management</h1>
        <div className="header-actions">
          <div className="status-filter">
            <label>Status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => {
                setStatusFilter(e.target.value);
                fetchUsers();
              }}
            >
              <option value="all">All Users</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          {isAdmin && (
          <button className="btn-add-user" onClick={openModal}>
            <i className="fas fa-user-shield"></i> Grant Admin Access
          </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {modalSuccess && <div className="success-message">{modalSuccess}</div>}

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id}>
                  <td>{index + 1}</td>
                  <td>
                    <div className="user-name">
                      <i className="fas fa-user"></i>
                      {user.name}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.admin_access ? 'admin' : 'user'}`}>
                      <i className={`fas ${user.admin_access ? 'fa-crown' : 'fa-user'}`}></i>
                      {user.admin_access ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td>{getStatusBadge(user)}</td>
<td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td>
                    <td>
                      {isAdmin && (
                      <div className="action-buttons">
                        <button 
                          className="btn-action btn-reset"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={actionLoading === user.id || !user.is_verified}
                          title="Send password reset link"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        <button 
                          className="btn-action btn-promote"
                          onClick={() => handlePromote(user.id, user.admin_access)}
                          disabled={actionLoading === `promote_${user.id}`}
                          title={user.admin_access ? 'Demote to user' : 'Promote to admin'}
                        >
                          <i className="fas fa-arrow-up"></i>
                        </button>
                        <button 
                          className={`btn-action btn-toggle ${user.status === 'Active' ? 'btn-deactivate' : 'btn-activate'}`}
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          disabled={actionLoading === `toggle_${user.id}`}
                          title={user.status === 'Active' ? 'Deactivate user' : 'Activate user'}
                        >
                          <i className={`fas ${user.status === 'Active' ? 'fa-ban' : 'fa-check'}`}></i>
                        </button>
                      </div>
                      )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-data">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-user-shield"></i> Grant Admin Access</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleGrantAdminAccess}>
              <div className="form-group">
                <label>Select User</label>
                <select 
                  className="user-select-dropdown"
                  value={selectedUser?.id || ''}
                  onChange={(e) => {
                    const userId = parseInt(e.target.value);
                    const user = allUsers.find(u => u.id === userId);
                    setSelectedUser(user || null);
                  }}
                >
                  <option value="">-- Select a user --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}){u.admin_access ? ' - Admin' : ''}
                    </option>
                  ))}
                </select>
                {selectedUser && (
                  <div className="selected-user-info">
                    <span>Selected: <strong>{selectedUser.name}</strong> ({selectedUser.email})</span>
                  </div>
                )}
              </div>
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="grantAdmin"
                    checked={grantAdmin}
                    onChange={handleInputChange}
                  />
                  Grant Admin Access
                </label>
                <p className="form-hint">
                  {grantAdmin 
                    ? 'This will give the user admin privileges' 
                    : 'This will remove admin privileges from the user'}
                </p>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-submit" disabled={actionLoading === 'saving'}>
                  <i className="fas fa-save"></i> {actionLoading === 'saving' ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
              {modalError && <div className="error-message">{modalError}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;