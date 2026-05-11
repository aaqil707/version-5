import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './HistoryLogs.css';

const HistoryLogs = () => {
  const [activeTab, setActiveTab] = useState('history');
  const [tools, setTools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [filters, setFilters] = useState({ action: 'all', date_from: '', date_to: '' });
  const [activityFilters, setActivityFilters] = useState({ action: 'all', date_from: '', date_to: '' });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activityPagination, setActivityPagination] = useState({ total: 0, limit: 50, offset:0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    localStorage.removeItem('user');
  }

  useEffect(() => {
    setIsAdmin(user.admin_access === true || user.admin_access === 1);
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchRecycleBin();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'activity') {
      fetchActivityLogs();
    }
  }, [activeTab, filters, activityFilters, activityPagination.offset]);

  const fetchRecycleBin = async () => {
    try {
      setLoading(true);
      const data = await api.getRecycleBin();
      if (data.success) {
        setTools(data.tools || []);
      } else {
        setError(data.error || 'Failed to fetch');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getDeleteLogs(filters);
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityLogs({
        ...activityFilters,
        limit: activityPagination.limit,
        offset: activityPagination.offset
      });
      if (data.success) {
        setActivityLogs(data.logs || []);
        setActivityPagination(prev => ({ ...prev, total: data.total }));
      } else {
        setError(data.error || 'Failed to fetch activity logs');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      setActionLoading(id);
      await api.restoreTool(id);
      setTools(tools.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to restore');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDaysSinceDeleted = (deletedAt) => {
    if (!deletedAt) return 0;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diff = now - deleted;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleActivityFilterChange = (e) => {
    setActivityFilters({ ...activityFilters, [e.target.name]: e.target.value });
    setActivityPagination(prev => ({ ...prev, offset: 0 }));
  };

  const showLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const actionCounts = {
    soft_delete: logs.filter(l => l.action_type === 'soft_delete').length,
    restore: logs.filter(l => l.action_type === 'restore').length
  };

  const getActionIcon = (action) => {
    const icons = {
      'login_success': 'fa-sign-in-alt',
      'login_attempt': 'fa-sign-in-alt',
      'logout': 'fa-sign-out-alt',
      'user_created': 'fa-user-plus',
      'user_activated': 'fa-user-check',
      'user_deactivated': 'fa-user-slash',
      'user_promoted': 'fa-arrow-up',
      'admin_access_granted': 'fa-crown',
      'admin_access_revoked': 'fa-minus-circle',
      'password_reset': 'fa-key',
      'password_reset_by_admin': 'fa-key',
      'add_tool': 'fa-plus-circle',
      'edit_tool': 'fa-edit',
      'delete_tool': 'fa-trash',
      'restore_tool': 'fa-trash-restore'
    };
    return icons[action] || 'fa-circle';
  };

  const getActionColor = (action) => {
    if (action.includes('login') || action === 'logout') return '#10b981';
    if (action.includes('user') || action.includes('admin') || action.includes('password')) return '#3b82f6';
    if (action.includes('tool')) return '#f59e0b';
    return '#6b7280';
  };

  const formatActionName = (action) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleActivityPageChange = (direction) => {
    setActivityPagination(prev => ({
      ...prev,
      offset: direction === 'next' ? prev.offset + prev.limit : Math.max(0, prev.offset - prev.limit)
    }));
  };

  return (
    <div className="history-logs-page">
      <div className="history-header">
        <div className="header-left">
          <h1><i className="fas fa-history"></i> History & Logs</h1>
        </div>
        <div className="header-right">
          <button className="btn-back" onClick={() => navigate('/dashboard/tool-management')}>
            <i className="fas fa-arrow-left"></i> Back to Tool Archive
          </button>
        </div>
      </div>

      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fas fa-trash-restore"></i> Tool History ({tools.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <i className="fas fa-clipboard-list"></i> Delete Logs ({logs.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <i className="fas fa-tasks"></i> Activity Log
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'history' && (
            <div className="tab-content">
              {tools.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <h3>No Deleted Tools</h3>
                  <p>Deleted tools will appear here</p>
                </div>
              ) : (
                <div className="compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tool Name</th>
                        <th>Type</th>
                        <th>Cost</th>
                        <th>Status</th>
                        <th>Deleted</th>
                        <th>Days</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tools.map((tool, index) => (
                        <tr key={tool.id}>
                          <td>{index + 1}</td>
                          <td><strong>{tool.tool_name}</strong></td>
                          <td>{tool.type}</td>
                          <td>{tool.currency} {parseFloat(tool.cost || 0).toLocaleString()}</td>
                          <td><span className={`status-badge ${tool.status?.toLowerCase()}`}>{tool.status}</span></td>
                          <td>{formatDate(tool.deleted_at)}</td>
                          <td><span className="days-ago">{getDaysSinceDeleted(tool.deleted_at)}d</span></td>
                          <td>
                            <button className="btn-restore" onClick={() => handleRestore(tool.id)} disabled={actionLoading === tool.id}>
                              <i className="fas fa-trash-restore"></i> Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="tab-content">
              <div className="logs-filters">
                <select name="action" value={filters.action} onChange={handleFilterChange}>
                  <option value="all">All Actions</option>
                  <option value="soft_delete">Delete</option>
                  <option value="restore">Restore</option>
                </select>
                <input type="date" name="date_from" value={filters.date_from} onChange={handleFilterChange} />
                <input type="date" name="date_to" value={filters.date_to} onChange={handleFilterChange} />
                <button className="btn-reset" onClick={() => setFilters({ action: 'all', date_from: '', date_to: '' })}>Reset</button>
              </div>

              <div className="summary-row">
                <span className="summary-item" onClick={() => setFilters({ ...filters, action: 'soft_delete' })}>
                  <i className="fas fa-trash"></i> {actionCounts.soft_delete} Deletes
                </span>
                <span className="summary-item" onClick={() => setFilters({ ...filters, action: 'restore' })}>
                  <i className="fas fa-trash-restore"></i> {actionCounts.restore} Restores
                </span>
              </div>

              {logs.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-clipboard-list"></i>
                  <h3>No Logs Found</h3>
                  <p>Actions will appear here</p>
                </div>
              ) : (
                <div className="compact-table">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tool</th>
                        <th>Action</th>
                        <th>By</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={log.id}>
                          <td>{index + 1}</td>
                          <td><strong>{log.tool_name}</strong></td>
                          <td><span className="action-badge" style={{ backgroundColor: log.action_color + '20', color: log.action_color }}>{log.action_label}</span></td>
                          <td><i className="fas fa-user"></i> {log.deleted_by_name}</td>
                          <td>{formatDateTime(log.created_at)}</td>
                          <td><button className="btn-view" onClick={() => showLogDetails(log)}><i className="fas fa-eye"></i></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tab-content">
              <div className="activity-filters">
                <select name="action" value={activityFilters.action} onChange={handleActivityFilterChange}>
                  <option value="all">All Activities</option>
                  <option value="login_success">Login</option>
                  <option value="login_attempt">Login Failed</option>
                  <option value="logout">Logout</option>
                  <option value="user_created">User Created</option>
                  <option value="user_activated">User Activated</option>
                  <option value="user_deactivated">User Deactivated</option>
                  <option value="user_promoted">User Promoted</option>
                  <option value="admin_access_granted">Admin Access Granted</option>
                  <option value="admin_access_revoked">Admin Access Revoked</option>
                  <option value="password_reset">Password Reset</option>
                  <option value="password_reset_by_admin">Password Reset (Admin)</option>
                  <option value="add_tool">Tool Added</option>
                  <option value="edit_tool">Tool Edited</option>
                  <option value="delete_tool">Tool Deleted</option>
                  <option value="restore_tool">Tool Restored</option>
                </select>
                <input type="date" name="date_from" value={activityFilters.date_from} onChange={handleActivityFilterChange} placeholder="From Date" />
                <input type="date" name="date_to" value={activityFilters.date_to} onChange={handleActivityFilterChange} placeholder="To Date" />
                <button className="btn-reset" onClick={() => setActivityFilters({ action: 'all', date_from: '', date_to: '' })}>Reset</button>
              </div>

              {activityLogs.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-tasks"></i>
                  <h3>No Activity Found</h3>
                  <p>User activities will appear here</p>
                </div>
              ) : (
                <div className="activity-table">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date & Time</th>
                        <th>User Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Activity</th>
                        <th>Details</th>
                        {isAdmin && <th>IP Address</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.map((log, index) => (
                        <tr key={log.id}>
                          <td>{activityPagination.offset + index + 1}</td>
                          <td>{formatDateTime(log.created_at)}</td>
                          <td><strong>{log.user_name || 'System'}</strong></td>
                          <td>{log.user_email || 'N/A'}</td>
                          <td>
                            <span className={`role-badge ${log.user_role === 'admin' ? 'admin' : 'user'}`}>
                              {log.user_role || 'user'}
                            </span>
                          </td>
                          <td>
                            <span className="activity-badge" style={{ backgroundColor: getActionColor(log.action) + '20', color: getActionColor(log.action) }}>
                              <i className={`fas ${getActionIcon(log.action)}`}></i>
                              {formatActionName(log.action)}
                            </span>
                          </td>
                          <td className="details-cell">{log.details || 'N/A'}</td>
                          {isAdmin && <td className="ip-cell">{log.ip_address || 'N/A'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activityPagination.total > activityPagination.limit && (
                <div className="pagination">
                  <button 
                    className="btn-pagination" 
                    onClick={() => handleActivityPageChange('prev')}
                    disabled={activityPagination.offset === 0}
                  >
                    <i className="fas fa-chevron-left"></i> Previous
                  </button>
                  <span className="page-info">
                    Showing {activityPagination.offset + 1} - {Math.min(activityPagination.offset + activityPagination.limit, activityPagination.total)} of {activityPagination.total}
                  </span>
                  <button 
                    className="btn-pagination" 
                    onClick={() => handleActivityPageChange('next')}
                    disabled={activityPagination.offset + activityPagination.limit >= activityPagination.total}
                  >
                    Next <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showDetails && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-info-circle"></i> Log Details</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><label>Tool:</label><span>{selectedLog.tool_name}</span></div>
              <div className="detail-row"><label>Action:</label><span style={{ color: selectedLog.action_color }}>{selectedLog.action_label}</span></div>
              <div className="detail-row"><label>By:</label><span>{selectedLog.deleted_by_name}</span></div>
              <div className="detail-row"><label>Date:</label><span>{formatDateTime(selectedLog.created_at)}</span></div>
              {selectedLog.previous_data && (
                <>
                  <h4>Previous Data</h4>
                  <div className="detail-row"><label>Type:</label><span>{selectedLog.previous_data.type || 'N/A'}</span></div>
                  <div className="detail-row"><label>Cost:</label><span>{selectedLog.previous_data.currency || '$'}{parseFloat(selectedLog.previous_data.cost || 0).toLocaleString()}</span></div>
                  <div className="detail-row"><label>Status:</label><span className={`status-badge ${selectedLog.previous_data.status?.toLowerCase()}`}>{selectedLog.previous_data.status || 'N/A'}</span></div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDetails(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryLogs;