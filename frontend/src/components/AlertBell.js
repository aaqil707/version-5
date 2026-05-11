import React, { useState, useEffect } from 'react';

const AlertBell = () => {
  const [alerts, setAlerts] = useState({ this_month: [], '30_days': [], '7_days': [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const API_BASE = window.location.origin;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/check.php`, {
          method: 'GET',
          credentials: 'include'
        });
        const data = await response.json();
        if (data.authenticated && data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          const adminStatus = data.user.admin_access === true || data.user.admin_access === 1;
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        console.error('Failed to check auth:', error);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setRefreshing(true);
      const csrfToken = localStorage.getItem('csrf_token') || '';
      const response = await fetch(`${API_BASE}/notifications/getAlerts.php`, {
        method: 'GET',
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        const alertsData = data.alerts || { this_month: [], '30_days': [], '7_days': [] };
        setAlerts(alertsData);
        const total = (alertsData.this_month?.length || 0) + (alertsData['30_days']?.length || 0) + (alertsData['7_days']?.length || 0);
        setTotalAlerts(total);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch alerts:', error);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const sendAutoReminders = async () => {
    if (sendingEmails) return;
    
    const confirmSend = window.confirm('Send automatic renewal reminder emails to all expiring tools?');
    if (!confirmSend) return;
    
    setSendingEmails(true);
    try {
      const csrfToken = localStorage.getItem('csrf_token') || '';
      const response = await fetch(`${API_BASE}/notifications/sendAutoReminders.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Emails sent successfully!\n\nTotal emails sent: ${data.total_emails_sent}\nTools expiring: ${data.total_tools_expiring}`);
      } else {
        const errorMsg = data.error || data.message || 'Failed to send emails. Check SMTP settings.';
        console.error('Send reminders error:', errorMsg);
        alert('Failed to send emails: ' + errorMsg);
      }
    } catch (error) {
      console.error('Failed to send reminders:', error);
      alert('Failed to send reminders. Check SMTP settings or network connection.');
    } finally {
      setSendingEmails(false);
    }
  };

  const getAlertColor = (days) => {
    if (days <= 7) return '#dc3545'; // Red - urgent
    if (days <= 14) return '#ffc107'; // Yellow - warning
    return '#17a2b8'; // Blue - notice
  };

  const getAlertIcon = (days) => {
    if (days <= 7) return '🔴';
    if (days <= 14) return '🟡';
    return '🔵';
  };

  return (
    <div className="alert-bell-container">
      <button 
        className="alert-bell-button" 
        onClick={() => setShowDropdown(!showDropdown)}
        title="Renewal Alerts"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`alert-bell-icon ${totalAlerts > 0 ? 'has-alerts' : ''}`}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        
        {totalAlerts > 0 && (
          <span className="alert-badge">{totalAlerts}</span>
        )}
      </button>

      {showDropdown && (
        <div className="alert-dropdown">
          <div className="alert-dropdown-header">
            <h4>🔔 Renewal Alerts</h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="alert-count">{totalAlerts} pending</span>
              {isAdmin && (
                <button 
                  onClick={sendAutoReminders}
                  disabled={sendingEmails}
                  style={{
                    background: sendingEmails ? '#ccc' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: sendingEmails ? 'not-allowed' : 'pointer'
                  }}
                  title="Send automatic renewal reminder emails"
                >
                  {sendingEmails ? 'Sending...' : '📧 Send'}
                </button>
              )}
            </div>
          </div>
          
          <div className="alert-dropdown-content">
            {totalAlerts === 0 ? (
              <div className="no-alerts">
                <span>✅</span>
                <p>No upcoming renewals</p>
              </div>
            ) : (
              <>
                {alerts['this_month']?.length > 0 && (
                  <div className="alert-section urgent">
                    <h5>⚡ Expiring This Month</h5>
                    {alerts['this_month'].map(alert => (
                      <AlertItem 
                        key={alert.id} 
                        alert={alert} 
                        getAlertColor={getAlertColor}
                        getAlertIcon={getAlertIcon}
                      />
                    ))}
                  </div>
                )}
                
                {alerts['30_days']?.length > 0 && (
                  <div className="alert-section notice">
                    <h5>📅 First Notice (30 days)</h5>
                    {alerts['30_days'].map(alert => (
                      <AlertItem 
                        key={alert.id} 
                        alert={alert} 
                        getAlertColor={getAlertColor}
                        getAlertIcon={getAlertIcon}
                      />
                    ))}
                  </div>
                )}
                
                {alerts['7_days']?.length > 0 && (
                  <div className="alert-section urgent">
                    <h5>⚠️ Final Notice (7 days)</h5>
                    {alerts['7_days'].map(alert => (
                      <AlertItem 
                        key={alert.id} 
                        alert={alert} 
                        getAlertColor={getAlertColor}
                        getAlertIcon={getAlertIcon}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        .alert-bell-container {
          position: relative;
          margin-right: 1rem;
        }
        
        .alert-bell-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          position: relative;
        }
        
        .alert-bell-button:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .alert-bell-icon {
          color: #666;
          transition: color 0.3s ease;
        }
        
        .alert-bell-icon.has-alerts {
          color: #dc3545;
          animation: bellRing 0.5s ease-in-out infinite;
        }
        
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
        
        @keyframes vibrate {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
          100% { transform: translateX(0); }
        }
        
        .alert-bell-button.has-alerts {
          animation: vibrate 0.3s ease-in-out infinite;
        }
        
        .alert-badge {
          position: absolute;
          top: 0;
          right: 0;
          background-color: #dc3545;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .alert-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 350px;
          max-height: 400px;
          overflow-y: auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          margin-top: 8px;
        }
        
        .alert-dropdown-header {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }
        
        .alert-dropdown-header h4 {
          margin: 0;
          font-size: 14px;
          color: #333;
        }
        
        .alert-count {
          font-size: 12px;
          color: #666;
          background: #e9ecef;
          padding: 2px 8px;
          border-radius: 12px;
        }
        
        .alert-dropdown-content {
          max-height: 320px;
          overflow-y: auto;
        }
        
        .no-alerts {
          padding: 30px;
          text-align: center;
          color: #28a745;
        }
        
        .no-alerts span {
          font-size: 40px;
          display: block;
          margin-bottom: 10px;
        }
        
        .no-alerts p {
          margin: 0;
          font-size: 14px;
        }
        
        .alert-section {
          padding: 8px 0;
        }
        
        .alert-section h5 {
          margin: 0;
          padding: 8px 16px;
          font-size: 12px;
          text-transform: uppercase;
          background: #f8f9fa;
        }
        
        .alert-section.urgent h5 {
          background: #ffe6e6;
          color: #dc3545;
        }
        
        .alert-section.warning h5 {
          background: #fff8e6;
          color: #ffc107;
        }
        
        .alert-section.notice h5 {
          background: #e6f7ff;
          color: #17a2b8;
        }
        
        .alert-item {
          padding: 10px 16px;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .alert-item:last-child {
          border-bottom: none;
        }
        
        .alert-item-info {
          flex: 1;
        }
        
        .alert-item-name {
          font-weight: 600;
          font-size: 13px;
          color: #333;
          margin-bottom: 2px;
        }
        
        .alert-item-details {
          font-size: 12px;
          color: #666;
        }
        
        .alert-item-days {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .alert-item-email {
          font-size: 11px;
          color: #999;
          margin-top: 2px;
        }
        
        .send-reminder-btn {
          background: #2196F3;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          cursor: pointer;
          margin-left: 8px;
        }
        
        .send-reminder-btn:hover {
          background: #1976D2;
        }
        
        @media (max-width: 768px) {
          .alert-dropdown {
            width: 300px;
            right: -50px;
          }
        }
      `}</style>
    </div>
  );
};

const AlertItem = ({ alert, getAlertColor, getAlertIcon }) => {
  const days = alert.days_until_renewal;
  const bgColor = getAlertColor(days);
  
  return (
    <div className="alert-item">
      <div className="alert-item-info">
        <div className="alert-item-name">
          {getAlertIcon(days)} {alert.tool_name}
        </div>
        <div className="alert-item-details">
          {alert.message || `Renewing: ${new Date(alert.next_renewal).toLocaleDateString()}`}
        </div>
        <div className="alert-item-email">
          📧 {alert.email_id || 'No email'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span 
          className="alert-item-days" 
          style={{ backgroundColor: bgColor + '20', color: bgColor }}
        >
          {days} days
        </span>
      </div>
    </div>
  );
};

export default AlertBell;
