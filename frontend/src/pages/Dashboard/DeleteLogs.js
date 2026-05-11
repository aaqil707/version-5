import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './DeleteLogs.css';

const DeleteLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: 'all',
    date_from: '',
    date_to: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getDeleteLogs(filters);
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || 'Failed to fetch delete logs');
      }
    } catch (err) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (log) => {
    return (
      <span 
        className="action-badge"
        style={{ backgroundColor: log.action_color + '20', color: log.action_color }}
      >
        {log.action_label}
      </span>
    );
  };

  const showLogDetails = (log) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const actionCounts = {
    soft_delete: logs.filter(l => l.action_type === 'soft_delete').length,
    permanent_delete: logs.filter(l => l.action_type === 'permanent_delete').length,
    restore: logs.filter(l => l.action_type === 'restore').length
  };

  if (loading) {
    return (
      <div className="delete-logs-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Delete Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="delete-logs-page">
      <div className="logs-header">
        <div className="header-left">
          <h1><i className="fas fa-history"></i> Delete Logs</h1>
          <span className="log-count">{logs.length} total actions</span>
        </div>
        <div className="header-right">
          <button className="btn-back" onClick={() => navigate('/dashboard/tool-management')}>
            <i className="fas fa-arrow-left"></i> Back to Tools
          </button>
        </div>
      </div>

      <div className="logs-filters">
        <div className="filter-group">
          <label>Action Type</label>
          <select name="action" value={filters.action} onChange={handleFilterChange}>
            <option value="all">All Actions</option>
            <option value="soft_delete">Soft Delete</option>
            <option value="permanent_delete">Permanent Delete</option>
            <option value="restore">Restore</option>
          </select>
        </div>
        <div className="filter-group">
          <label>From Date</label>
          <input 
            type="date" 
            name="date_from" 
            value={filters.date_from} 
            onChange={handleFilterChange}
          />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input 
            type="date" 
            name="date_to" 
            value={filters.date_to} 
            onChange={handleFilterChange}
          />
        </div>
        <button className="btn-reset" onClick={() => setFilters({ action: 'all', date_from: '', date_to: '' })}>
          <i className="fas fa-redo"></i> Reset
        </button>
      </div>

      <div className="logs-summary">
        <div className="summary-card" onClick={() => setFilters({ ...filters, action: 'soft_delete' })}>
          <div className="summary-icon red">
            <i className="fas fa-trash"></i>
          </div>
          <div className="summary-info">
            <span className="summary-count">{actionCounts.soft_delete}</span>
            <span className="summary-label">Soft Deletes</span>
          </div>
        </div>
        <div className="summary-card" onClick={() => setFilters({ ...filters, action: 'permanent_delete' })}>
          <div className="summary-icon red">
            <i className="fas fa-times-circle"></i>
          </div>
          <div className="summary-info">
            <span className="summary-count">{actionCounts.permanent_delete}</span>
            <span className="summary-label">Permanent Deletes</span>
          </div>
        </div>
        <div className="summary-card" onClick={() => setFilters({ ...filters, action: 'restore' })}>
          <div className="summary-icon green">
            <i className="fas fa-trash-restore"></i>
          </div>
          <div className="summary-info">
            <span className="summary-count">{actionCounts.restore}</span>
            <span className="summary-label">Restores</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {logs.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-history"></i>
          <h3>No Delete Logs Found</h3>
          <p>Actions will appear here when tools are deleted or restored</p>
        </div>
      ) : (
        <div className="logs-table-container">
          <table className="logs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tool Name</th>
                <th>Action</th>
                <th>Performed By</th>
                <th>Date & Time</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={log.id}>
                  <td>{index + 1}</td>
                  <td><strong>{log.tool_name}</strong></td>
                  <td>{getActionBadge(log)}</td>
                  <td>
                    <div className="user-info">
                      <i className="fas fa-user"></i>
                      {log.deleted_by_name || 'Unknown'}
                    </div>
                  </td>
                  <td className="datetime-cell">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td>
                    <button 
                      className="btn-view-details"
                      onClick={() => showLogDetails(log)}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetails && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-info-circle"></i> Log Details</h2>
              <button className="modal-close" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <label>Log ID:</label>
                <span>{selectedLog.id}</span>
              </div>
              <div className="detail-row">
                <label>Tool ID:</label>
                <span>{selectedLog.tool_id}</span>
              </div>
              <div className="detail-row">
                <label>Tool Name:</label>
                <span>{selectedLog.tool_name}</span>
              </div>
              <div className="detail-row">
                <label>Action:</label>
                <span>{getActionBadge(selectedLog)}</span>
              </div>
              <div className="detail-row">
                <label>Performed By:</label>
                <span>{selectedLog.deleted_by_name} (ID: {selectedLog.deleted_by_id})</span>
              </div>
              <div className="detail-row">
                <label>Date & Time:</label>
                <span>{formatDateTime(selectedLog.created_at)}</span>
              </div>
              {selectedLog.previous_data && (
                <>
                  <h3 className="details-section-title">Previous Data</h3>
                  <div className="previous-data">
                    <div className="detail-row">
                      <label>Type:</label>
                      <span>{selectedLog.previous_data.type || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <label>Cost:</label>
                      <span>{selectedLog.previous_data.currency || '$'}{parseFloat(selectedLog.previous_data.cost || 0).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <label>Revenue:</label>
                      <span>{selectedLog.previous_data.currency || '$'}{parseFloat(selectedLog.previous_data.revenue || 0).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <label>Geography:</label>
                      <span>{selectedLog.previous_data.geography || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <label>Status:</label>
                      <span className={`status-badge ${selectedLog.previous_data.status?.toLowerCase()}`}>
                        {selectedLog.previous_data.status || 'N/A'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteLogs;