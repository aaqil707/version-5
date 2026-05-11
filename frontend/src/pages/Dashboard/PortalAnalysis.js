import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import api from '../../services/api';
import './PortalAnalysis.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, PointElement, LineElement);

const countryFlags = {
  USA: 'https://flagcdn.com/w40/us.png',
  INDIA: 'https://flagcdn.com/w40/in.png',
  CANADA: 'https://flagcdn.com/w40/ca.png',
  MALAYSIA: 'https://flagcdn.com/w40/my.png',
  UAE: 'https://flagcdn.com/w40/ae.png',
  UK: 'https://flagcdn.com/w40/gb.png'
};

const PortalAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tools, setTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [summary, setSummary] = useState({});
  const [filters, setFilters] = useState({ year: 'All Years', month: 'All Months', geography: 'All Regions' });
  const [activeTab, setActiveTab] = useState('performance');
  const [expiringThisMonth, setExpiringThisMonth] = useState([]);
  const [showExpiringModal, setShowExpiringModal] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const getDisabledMonths = () => {
    return [];
  };

  const checkAuth = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  };

  useEffect(() => {
    const user = checkAuth();
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    setIsLoggedIn(true);
    
    api.getPortalStats()
      .then(data => {
        if (data.success) {
          setTools(data.tools || []);
          setFilteredTools(data.tools || []);
          setSummary(data.summary || {});
        } else {
          setError(data.error || 'Failed to load');
        }
      })
      .catch(() => {
        setError('Network error');
      })
      .finally(() => setLoading(false));

    api.getAlerts()
      .then(data => {
        if (data.success && data.alerts) {
          setExpiringThisMonth(data.alerts.this_month || []);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let filtered = tools;
    if (filters.year !== 'All Years') filtered = filtered.filter(t => String(t.year) === filters.year);
    if (filters.month !== 'All Months') {
      const month = parseInt(filters.month);
      filtered = filtered.filter(t => {
        if (!t.last_renewal && !t.next_renewal) return false;
        const lastRenewal = t.last_renewal ? new Date(t.last_renewal) : null;
        const nextRenewal = t.next_renewal ? new Date(t.next_renewal) : null;
        return (lastRenewal && lastRenewal.getMonth() + 1 === month) || 
               (nextRenewal && nextRenewal.getMonth() + 1 === month);
      });
    }
    if (filters.geography !== 'All Regions') filtered = filtered.filter(t => t.geography === filters.geography);
    setFilteredTools(filtered);
    const cost = filtered.reduce((s, t) => s + (parseFloat(t.cost) || 0), 0);
    const rev = filtered.reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0);
    const active = filtered.filter(t => t.status === 'Active').length;
    setSummary({ total_tools: filtered.length, total_cost: cost, total_revenue: rev, active_tools: active, inactive_tools: filtered.length - active });
  }, [filters, tools]);

  const handleFilter = (e) => setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  
  const getCurrencySymbol = (geography) => {
    const symbols = { 
      USA: '$', 
      INDIA: 'Rs',  
      MALAYSIA: 'RM', 
      UAE: 'Dhs', 
      CANADA: 'C$', 
      UK: '£' 
    };
    return symbols[geography] || '$';
  };
  
  const formatDateForCSV = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `'${day}/${month}/${year}`;
  };
  
  const formatCurrencyForCSV = (value, geography) => {
    if (!value && value !== 0) return '0';
    const strValue = String(value);
    const cleanedValue = strValue.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanedValue);
    if (isNaN(num)) return '0';
    const symbol = getCurrencySymbol(geography);
    return `'${symbol}${num.toLocaleString('en-US')}`;
  };
  
  const handleExportCSV = () => {
    const headers = ['Tool Name', 'Type', 'Geography', 'Year', 'Cost', 'Revenue', 'Profit', 'Profit %', 'Status', 'Last Renewal', 'Next Renewal', 'Email', 'Payment Frequency', 'Annual Cost', 'Contact'];
    const csvRows = [headers.join(',')];
    
    filteredTools.forEach(tool => {
      const cost = parseFloat(String(tool.cost).replace(/[^0-9.-]/g, '')) || 0;
      const revenue = parseFloat(String(tool.revenue).replace(/[^0-9.-]/g, '')) || 0;
      const profit = revenue - cost;
      const profitPct = cost > 0 ? ((profit / cost) * 100).toFixed(1) : '0';
      const geography = tool.geography || 'USA';
      const row = [
        `"${(tool.tool_name || '').replace(/"/g, '""')}"`,
        `"${tool.type || ''}"`,
        `"${geography}"`,
        tool.year || '',
        formatCurrencyForCSV(cost, geography),
        formatCurrencyForCSV(revenue, geography),
        profit.toFixed(2),
        profitPct,
        `"${tool.status || ''}"`,
        `'${formatDateForCSV(tool.last_renewal)}'`,
        `'${formatDateForCSV(tool.next_renewal)}'`,
        `"${tool.email_id || ''}"`,
        `"${tool.payment_frequency || ''}"`,
        formatCurrencyForCSV(tool.annual_cost || 0, geography),
        `"${tool.contact_no || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const csvContent = '\ufeff' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `portal_analysis_${filters.year}_${filters.geography}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleExport = () => {
    const escapeHtml = (str) => {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, (m) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));
    };
    
    const formatCurrency = (value, geography) => {
      if (!value && value !== 0) return '0';
      const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return '0';
      const symbol = getCurrencySymbol(geography);
      return symbol + num.toLocaleString('en-US');
    };
    
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    const rows = filteredTools.map(t => {
      const geo = t.geography || 'USA';
      return `<tr>
        <td>${escapeHtml(t.tool_name)}</td>
        <td>${escapeHtml(t.type)}</td>
        <td>${escapeHtml(geo)}</td>
        <td>${t.year || ''}</td>
        <td>${formatCurrency(t.cost, geo)}</td>
        <td>${formatCurrency(t.revenue, geo)}</td>
        <td>${((parseFloat(t.revenue)||0) - (parseFloat(t.cost)||0)).toFixed(2)}</td>
        <td>${escapeHtml(t.status)}</td>
        <td>${formatDate(t.last_renewal)}</td>
        <td>${formatDate(t.next_renewal)}</td>
        <td>${escapeHtml(t.payment_frequency)}</td>
        <td>${formatCurrency(t.annual_cost, geo)}</td>
        <td>${escapeHtml(t.email_id)}</td>
      </tr>`;
    }).join('');
    
    const win = window.open('', '', 'width=1200,height=600');
    win.document.write(`<html>
      <head>
        <title>Portal Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background: #4f46e5; color: white; }
          tr:nth-child(even) { background: #f9fafb; }
        </style>
      </head>
      <body>
        <h1>Portal Analysis Report</h1>
        <p><strong>Year:</strong> ${filters.year} | <strong>Geography:</strong> ${filters.geography}</p>
        <table>
          <tr>
            <th>Tool</th><th>Type</th><th>Geo</th><th>Year</th>
            <th>Cost</th><th>Revenue</th><th>Profit</th>
            <th>Status</th><th>Last Renewal</th><th>Next Renewal</th>
            <th>Payment</th><th>Annual Cost</th><th>Email</th>
          </tr>
          ${rows}
        </table>
      </body>
    </html>`);
    win.print();
  };

  const getGeoData = () => {
    const map = {};
    filteredTools.forEach(t => { map[t.geography] = map[t.geography] || { c: 0, r: 0 }; map[t.geography].c += parseFloat(t.cost) || 0; map[t.geography].r += parseFloat(t.revenue) || 0; });
    return { labels: Object.keys(map), datasets: [{ label: 'Cost', data: Object.values(map).map(x => x.c), backgroundColor: '#ef4444' }, { label: 'Revenue', data: Object.values(map).map(x => x.r), backgroundColor: '#10b981' }] };
  };
  const getStatusData = () => ({ labels: ['Active', 'Inactive'], datasets: [{ data: [filteredTools.filter(t => t.status === 'Active').length, filteredTools.filter(t => t.status === 'Inactive').length], backgroundColor: ['#10b981', '#ef4444'] }] });
  const getTopData = () => { const s = [...filteredTools].sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 5); return { labels: s.map(t => t.tool_name), datasets: [{ label: 'Cost', data: s.map(t => t.cost || 0), backgroundColor: '#667eea' }] }; };

  const getPortalPerformance = () => {
    const portals = ['USA', 'INDIA', 'CANADA', 'MALAYSIA', 'UAE'];
    const years = [...new Set(filteredTools.map(t => t.year))].sort();
    
    const costData = portals.map(geo => {
      return years.map(year => {
        return filteredTools.filter(t => t.geography === geo && String(t.year) === String(year))
          .reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
      });
    });

    const revenueData = portals.map(geo => {
      return years.map(year => {
        return filteredTools.filter(t => t.geography === geo && String(t.year) === String(year))
          .reduce((sum, t) => sum + (parseFloat(t.revenue) || 0), 0);
      });
    });

    const roiData = portals.map((geo, idx) => {
      return years.map((year, yIdx) => {
        const cost = costData[idx][yIdx];
        const revenue = revenueData[idx][yIdx];
        return cost > 0 ? ((revenue - cost) / cost * 100).toFixed(1) : 0;
      });
    });

    return { years, portals, costData, revenueData, roiData };
  };

  const performance = getPortalPerformance();

  const costChartData = {
    labels: performance.years,
    datasets: performance.portals.map((geo, idx) => ({
      label: geo,
      data: performance.costData[idx],
      backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][idx],
    }))
  };

  const revenueChartData = {
    labels: performance.years,
    datasets: performance.portals.map((geo, idx) => ({
      label: geo,
      data: performance.revenueData[idx],
      borderColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][idx],
      backgroundColor: 'transparent',
      tension: 0.4
    }))
  };

  const roiChartData = {
    labels: performance.years,
    datasets: performance.portals.map((geo, idx) => ({
      label: geo,
      data: performance.roiData[idx],
      borderColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][idx],
      backgroundColor: 'transparent',
      tension: 0.4
    }))
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } }
  };

  const renderContent = () => {
    if (loading) return <div className="portal-loading"><div className="spinner"></div></div>;
    if (!isLoggedIn) return <div className="portal-login-required"><div className="lock-icon"><i className="fas fa-lock"></i></div><h2>Login Required</h2><button className="btn-login" onClick={() => window.location.href = '/login'}>Go to Login</button></div>;
    if (error) return <div className="portal-error"><i className="fas fa-exclamation-triangle"></i><p>{error}</p></div>;
    return null;
  };

  const content = renderContent();
  if (content) return <div className="portal-compact-container">{content}</div>;

  const profitPct = summary.total_cost > 0 ? (((summary.total_revenue - summary.total_cost) / summary.total_cost) * 100).toFixed(1) : 0;
  
  const totalClosures = filteredTools.filter(t => t.status === 'Inactive').length;
  const totalStarts = filteredTools.filter(t => t.status === 'Active').length;
  const avgROI = summary.total_cost > 0 ? (((summary.total_revenue - summary.total_cost) / summary.total_cost) * 100).toFixed(1) : 0;

  const getPortalCurrencySymbol = (geography) => {
    const symbols = { USA: '$', INDIA: 'Rs', MALAYSIA: 'RM', UAE: 'Dhs', CANADA: 'C$', UK: '£' };
    return symbols[geography] || '$';
  };
  
  const formatPortalCurrency = (value, geography) => {
    if (!value && value !== 0) return '0';
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '0';
    const symbol = getPortalCurrencySymbol(geography);
    return symbol + num.toLocaleString('en-US');
  };
  
  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value?.toLocaleString() || 0}`;
  };

  const kpiCards = [
    { label: 'Total Cost', value: formatCurrency(summary.total_cost), icon: 'fa-dollar-sign', color: '#ef4444' },
    { label: 'Total Revenue', value: formatCurrency(summary.total_revenue), icon: 'fa-chart-line', color: '#10b981' },
    { label: 'Total Closures', value: totalClosures, icon: 'fa-times-circle', color: '#f59e0b' },
    { label: 'Total Starts', value: totalStarts, icon: 'fa-play-circle', color: '#3b82f6' },
    { label: 'Average ROI', value: `${avgROI}%`, icon: 'fa-percentage', color: '#8b5cf6' },
    { label: 'Total Tools', value: summary.total_tools || 0, icon: 'fa-tools', color: '#6366f1' }
  ];

  return (
    <div className="portal-compact-container">
      <div className="portal-header-bar">
        <div className="portal-title"><h1><i className="fas fa-chart-line"></i> Portal Analysis</h1></div>
        <div className="portal-filters">
          <select name="year" value={filters.year} onChange={handleFilter} className="filter-select">
            <option value="All Years">All Years</option>
<option value="2026">2026</option>
<option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          <select name="month" value={filters.month} onChange={handleFilter} className="filter-select">
            <option value="All Months">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          <select name="geography" value={filters.geography} onChange={handleFilter} className="filter-select"><option value="All Regions">All Regions</option><option value="USA">USA</option><option value="INDIA">INDIA</option><option value="CANADA">CANADA</option><option value="MALAYSIA">MALAYSIA</option><option value="UAE">UAE</option></select>
          <button className="btn-apply" onClick={() => setFilters({ ...filters })}><i className="fas fa-filter"></i> Apply</button>
          <button className="btn-reset" onClick={() => setFilters({ year: 'All Years', month: 'All Months', geography: 'All Regions' })}>Reset</button>
          <button className="btn-export" onClick={handleExportCSV}><i className="fas fa-file-csv"></i> CSV</button>
        </div>
      </div>
      <div className="kpi-grid">
        {kpiCards.map((kpi, index) => (
          <div 
            key={index} 
            className={`kpi-card ${kpi.isClickable ? 'clickable' : ''}`} 
            style={{ '--kpi-color': kpi.color }}
            onClick={kpi.onClick}
          >
            <div className="kpi-icon"><i className={`fas ${kpi.icon}`}></i></div>
            <div className="kpi-content">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      {showExpiringModal && (
        <div className="modal-overlay" onClick={() => setShowExpiringModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-calendar-exclamation"></i> Tools Expiring This Month</h2>
              <button className="modal-close" onClick={() => setShowExpiringModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {expiringThisMonth.length === 0 ? (
                <p className="no-data">No tools expiring this month</p>
              ) : (
                <table className="expiring-table">
                  <thead>
                    <tr>
                      <th>Tool Name</th>
                      <th>Renewal Date</th>
                      <th>Days Left</th>
                      <th>Cost</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringThisMonth.map(tool => (
                      <tr key={tool.id}>
                        <td>{tool.tool_name}</td>
                        <td>{new Date(tool.next_renewal).toLocaleDateString()}</td>
                        <td><span className="days-badge">{tool.days_until_renewal} days</span></td>
                        <td>${parseFloat(tool.cost || 0).toLocaleString()}</td>
                        <td>{tool.email_id || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="portal-tabs">
        <button className={`portal-tab ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
          <i className="fas fa-chart-bar"></i> Portal-wise Performance
        </button>
        <button className={`portal-tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
          <i className="fas fa-th-large"></i> Portal Performance Summary
        </button>
        <button className={`portal-tab ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')}>
          <i className="fas fa-chart-line"></i> Charts
        </button>
      </div>
      {activeTab === 'performance' && (
      <div className="portal-performance-section">
        <h2 className="section-title"><i className="fas fa-chart-bar"></i> Portal-wise Performance</h2>
        <div className="performance-charts">
          <div className="performance-chart-card">
            <h3><i className="fas fa-layer-group"></i> Cost (Stacked Bar)</h3>
            <div className="chart-wrapper">
              <Bar data={costChartData} options={{ ...chartOptions, scales: { x: { stacked: true }, y: { stacked: true } } }} />
            </div>
          </div>
          <div className="performance-chart-card">
            <h3><i className="fas fa-chart-line"></i> Revenue (Line)</h3>
            <div className="chart-wrapper">
              <Line data={revenueChartData} options={chartOptions} />
            </div>
          </div>
          <div className="performance-chart-card">
            <h3><i className="fas fa-percentage"></i> ROI (Line)</h3>
            <div className="chart-wrapper">
              <Line data={roiChartData} options={{ ...chartOptions, scales: { y: { callback: (value) => value + '%' } } }} />
            </div>
          </div>
        </div>
      </div>
      )}
      {activeTab === 'summary' && (
      <div className="portal-summary-section">
        <h2 className="section-title"><i className="fas fa-th-large"></i> Portal Performance Summary</h2>
        <div className="summary-cards-grid">
          {(() => {
            const toolGroups = filteredTools.reduce((acc, tool) => {
              const key = `${tool.tool_name}-${tool.geography}`;
              if (!acc[key]) {
                acc[key] = {
                  tool_name: tool.tool_name,
                  geography: tool.geography,
                  total_cost: 0,
                  total_revenue: 0,
                  closures: 0,
                  starts: 0
                };
              }
              acc[key].total_cost += parseFloat(tool.cost) || 0;
              acc[key].total_revenue += parseFloat(tool.revenue) || 0;
              if (tool.status === 'Inactive') acc[key].closures++;
              if (tool.status === 'Active') acc[key].starts++;
              return acc;
            }, {});
            return Object.values(toolGroups).map((item, idx) => {
              const roi = item.total_cost > 0 ? ((item.total_revenue - item.total_cost) / item.total_cost * 100).toFixed(1) : 0;
              return (
                <div key={idx} className="summary-tool-card">
                  <div className="summary-card-header">
                    <span className="tool-name">{item.tool_name}</span>
                    <img 
                      src={countryFlags[item.geography] || 'https://flagcdn.com/w40/un.png'} 
                      alt={item.geography} 
                      className="country-flag-img"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="summary-card-metrics">
                    <div className="metric"><span className="metric-label">Total Cost</span><span className="metric-value cost">${item.total_cost.toLocaleString()}</span></div>
                    <div className="metric"><span className="metric-label">Total Revenue</span><span className="metric-value revenue">${item.total_revenue.toLocaleString()}</span></div>
                    <div className="metric"><span className="metric-label">Closures</span><span className="metric-value">{item.closures}</span></div>
                    <div className="metric"><span className="metric-label">Starts</span><span className="metric-value">{item.starts}</span></div>
                    <div className="metric"><span className="metric-label">ROI</span><span className={`metric-value roi ${parseFloat(roi) >= 0 ? 'positive' : 'negative'}`}>{roi}%</span></div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
      )}
      {activeTab === 'charts' && (
      <div className="charts-dashboard">
        <div className="charts-section">
          <h3 className="charts-section-title"><i className="fas fa-calendar-quarter"></i> Quarterly Performance</h3>
          <div className="charts-grid">
            <div className="chart-card">
              <h4>Cost (Bar)</h4>
              <div className="chart-wrapper">
                <Bar data={{
                  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                  datasets: [{
                    label: 'Cost',
                    data: [
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 0 && m <= 2; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0),
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 3 && m <= 5; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0),
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 6 && m <= 8; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0),
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 9 && m <= 11; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)
                    ],
                    backgroundColor: '#ef4444'
                  }]
                }} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>Revenue (Area)</h4>
              <div className="chart-wrapper">
                <Line data={{
                  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                  datasets: [{
                    label: 'Revenue',
                    data: [
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 0 && m <= 2; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0),
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 3 && m <= 5; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0),
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 6 && m <= 8; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0),
                      filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 9 && m <= 11; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0)
                    ],
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: '#10b981',
                    fill: true,
                    tension: 0.4
                  }]
                }} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>ROI (Line)</h4>
              <div className="chart-wrapper">
                <Line data={{
                  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                  datasets: [{
                    label: 'ROI %',
                    data: [
                      (() => { const c = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 0 && m <= 2; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0); const r = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 0 && m <= 2; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0); return c > 0 ? ((r - c) / c * 100).toFixed(1) : 0; })(),
                      (() => { const c = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 3 && m <= 5; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0); const r = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 3 && m <= 5; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0); return c > 0 ? ((r - c) / c * 100).toFixed(1) : 0; })(),
                      (() => { const c = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 6 && m <= 8; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0); const r = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 6 && m <= 8; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0); return c > 0 ? ((r - c) / c * 100).toFixed(1) : 0; })(),
                      (() => { const c = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 9 && m <= 11; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0); const r = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m >= 9 && m <= 11; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0); return c > 0 ? ((r - c) / c * 100).toFixed(1) : 0; })()
                    ],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'transparent',
                    tension: 0.4
                  }]
                }} options={{ ...chartOptions, scales: { y: { callback: (v) => v + '%' } } }} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="charts-section">
          <h3 className="charts-section-title"><i className="fas fa-calendar-alt"></i> Monthly Performance</h3>
          <div className="charts-grid">
            <div className="chart-card">
              <h4>Cost Trend (Line)</h4>
              <div className="chart-wrapper">
                <Line data={{
                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                  datasets: [{
                    label: 'Cost',
                    data: Array.from({ length: 12 }, (_, i) => filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m === i; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)),
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    tension: 0.4
                  }]
                }} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>Revenue (Bar)</h4>
              <div className="chart-wrapper">
                <Bar data={{
                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                  datasets: [{
                    label: 'Revenue',
                    data: Array.from({ length: 12 }, (_, i) => filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m === i; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0)),
                    backgroundColor: '#10b981'
                  }]
                }} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>Monthly ROI (Area)</h4>
              <div className="chart-wrapper">
                <Line data={{
                  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                  datasets: [{
                    label: 'ROI %',
                    data: Array.from({ length: 12 }, (_, i) => { const c = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m === i; }).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0); const r = filteredTools.filter(t => { const m = new Date(t.last_renewal || t.next_renewal || '2025-01-01').getMonth(); return m === i; }).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0); return c > 0 ? ((r - c) / c * 100).toFixed(1) : 0; }),
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: '#8b5cf6',
                    fill: true,
                    tension: 0.4
                  }]
                }} options={{ ...chartOptions, scales: { y: { callback: (v) => v + '%' } } }} />
              </div>
            </div>
          </div>
        </div>

        <div className="charts-section">
          <h3 className="charts-section-title"><i className="fas fa-calendar-check"></i> Annual Performance</h3>
          <div className="charts-grid">
            <div className="chart-card">
              <h4>Yearly Cost (Line)</h4>
              <div className="chart-wrapper">
                <Line data={{
                  labels: [...new Set(filteredTools.map(t => t.year))].sort(),
                  datasets: [{
                    label: 'Total Cost',
                    data: [...new Set(filteredTools.map(t => t.year))].sort().map(y => filteredTools.filter(t => String(t.year) === String(y)).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)),
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    tension: 0.4
                  }]
                }} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>Yearly Revenue (Bar)</h4>
              <div className="chart-wrapper">
                <Bar data={{
                  labels: [...new Set(filteredTools.map(t => t.year))].sort(),
                  datasets: [{
                    label: 'Total Revenue',
                    data: [...new Set(filteredTools.map(t => t.year))].sort().map(y => filteredTools.filter(t => String(t.year) === String(y)).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0)),
                    backgroundColor: '#10b981'
                  }]
                }} options={chartOptions} />
              </div>
            </div>
            <div className="chart-card">
              <h4>Cost vs Revenue (Scatter)</h4>
              <div className="chart-wrapper">
                <Bar data={{
                  labels: [...new Set(filteredTools.map(t => t.year))].sort(),
                  datasets: [
                    {
                      label: 'Cost',
                      data: [...new Set(filteredTools.map(t => t.year))].sort().map(y => filteredTools.filter(t => String(t.year) === String(y)).reduce((s, t) => s + (parseFloat(t.cost) || 0), 0)),
                      backgroundColor: '#ef4444'
                    },
                    {
                      label: 'Revenue',
                      data: [...new Set(filteredTools.map(t => t.year))].sort().map(y => filteredTools.filter(t => String(t.year) === String(y)).reduce((s, t) => s + (parseFloat(t.revenue) || 0), 0)),
                      backgroundColor: '#10b981'
                    }
                  ]
                }} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      <div className="portal-table-container">
        <div className="portal-table-header"><h3><i className="fas fa-list"></i> All Tools ({filteredTools.length})</h3><span>Active: {summary.active_tools} | Inactive: {summary.inactive_tools}</span></div>
        <div className="portal-table-scroll">
          <table className="portal-table">
            <thead><tr><th>#</th><th>Tool</th><th>Type</th><th>Geo</th><th>Year</th><th>Cost</th><th>Revenue</th><th>Profit</th><th>Status</th></tr></thead>
            <tbody>{filteredTools.slice(0, 15).map((t, i) => { const p = ((t.revenue || 0) - (t.cost || 0)); const pp = t.cost > 0 ? (p / t.cost * 100).toFixed(0) : 0; const geo = t.geography || 'USA'; return <tr key={i}><td>{i + 1}</td><td><strong>{t.tool_name}</strong></td><td>{t.type}</td><td>{t.geography}</td><td>{t.year}</td><td>{formatPortalCurrency(t.cost, geo)}</td><td>{formatPortalCurrency(t.revenue, geo)}</td><td className={p >= 0 ? 'profit-positive' : 'profit-negative'}>{p >= 0 ? '+' : ''}{pp}%</td><td><span className={`status-badge ${t.status?.toLowerCase()}`}>{t.status}</span></td></tr>; })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PortalAnalysis;