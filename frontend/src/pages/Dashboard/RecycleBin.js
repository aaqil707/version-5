import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './RecycleBin.css';

const RecycleBin = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecycleBin();
  }, []);

  const fetchRecycleBin = async () => {
    try {
      setLoading(true);
      const data = await api.getRecycleBin();
      if (data.success) {
        setTools(data.tools || []);
      } else {
        setError(data.error || 'Failed to fetch recycle bin');
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
      alert(err.message || 'Failed to restore tool');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
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

  const getDaysSinceDeleted = (deletedAt) => {
    if (!deletedAt) return 0;
    const deleted = new Date(deletedAt);
    const now = new Date();
    const diff = now - deleted;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getKPIData = () => {
    const totalDeleted = tools.length;
    const deletedThisWeek = tools.filter(t => getDaysSinceDeleted(t.deleted_at) <= 7).length;
    const deletedThisMonth = tools.filter(t => getDaysSinceDeleted(t.deleted_at) <= 30).length;
    const oldestDeleted = tools.length > 0 ? Math.max(...tools.map(t => getDaysSinceDeleted(t.deleted_at))) : 0;
    const totalCost = tools.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    
    return [
      { label: 'Total Deleted', value: totalDeleted, icon: 'fa-trash-alt', color: '#ef4444' },
      { label: 'This Week', value: deletedThisWeek, icon: 'fa-calendar-week', color: '#f59e0b' },
      { label: 'This Month', value: deletedThisMonth, icon: 'fa-calendar-alt', color: '#3b82f6' },
      { label: 'Oldest (Days)', value: oldestDeleted, icon: 'fa-clock', color: '#8b5cf6' },
      { label: 'Total Cost Lost', value: `$${totalCost.toLocaleString()}`, icon: 'fa-dollar-sign', color: '#10b981' }
    ];
  };

  const kpiCards = getKPIData();

  if (loading) {
    return (
      <div className="tool-management">
          <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Tool History...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-management">
        <div className="tool-header">
        <div className="header-left">
          <h1><i className="fas fa-history"></i> Tool History</h1>
          <span className="tool-count">{tools.length} deleted items</span>
        </div>
        <div className="header-right">
          <button className="btn-back" onClick={() => navigate('/dashboard/tool-management')}>
            <i className="fas fa-arrow-left"></i> Back to Tools
          </button>
        </div>
      </div>

      {tools.length > 0 && (
        <div className="kpi-grid">
          {kpiCards.map((kpi, index) => (
            <div 
              key={index} 
              className="kpi-card" 
              style={{ '--kpi-color': kpi.color }}
            >
              <div className="kpi-icon"><i className={`fas ${kpi.icon}`}></i></div>
              <div className="kpi-content">
                <span className="kpi-value">{kpi.value}</span>
                <span className="kpi-label">{kpi.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {tools.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-history"></i>
          <h3>Tool History is Empty</h3>
          <p>Deleted tools will appear here</p>
        </div>
      ) : (
        <div className="tool-table-container">
          <table className="tool-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tool Name</th>
                <th>Type</th>
                <th>Cost</th>
                <th>Status</th>
                <th>Deleted On</th>
                <th>Days Ago</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool, index) => (
                <tr key={tool.id} className="deleted-row">
                  <td>{index + 1}</td>
                  <td><strong>{tool.tool_name}</strong></td>
                  <td>{tool.type}</td>
                  <td>{tool.currency} {parseFloat(tool.cost || 0).toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${tool.status?.toLowerCase()}`}>
                      {tool.status}
                    </span>
                  </td>
                  <td>{formatDate(tool.deleted_at)}</td>
                  <td>
                    <span className="days-ago">{getDaysSinceDeleted(tool.deleted_at)} days</span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-restore"
                      onClick={() => handleRestore(tool.id)}
                      disabled={actionLoading === tool.id}
                      title="Restore"
                    >
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
  );
};

export default RecycleBin;