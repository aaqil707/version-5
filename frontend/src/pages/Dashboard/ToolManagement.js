import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// ── Timezone list covering all VDart geographies ──────────────────────────
const TIMEZONES = [
  { group: 'India', zones: [
    { label: 'IST — India Standard Time (UTC+5:30)', value: 'Asia/Kolkata' },
  ]},
  { group: 'United States', zones: [
    { label: 'EST — Eastern (UTC-5)', value: 'America/New_York' },
    { label: 'CST — Central (UTC-6)', value: 'America/Chicago' },
    { label: 'MST — Mountain (UTC-7)', value: 'America/Denver' },
    { label: 'PST — Pacific (UTC-8)', value: 'America/Los_Angeles' },
  ]},
  { group: 'Canada', zones: [
    { label: 'EST — Eastern Canada (UTC-5)', value: 'America/Toronto' },
    { label: 'CST — Central Canada (UTC-6)', value: 'America/Winnipeg' },
    { label: 'MST — Mountain Canada (UTC-7)', value: 'America/Edmonton' },
    { label: 'PST — Pacific Canada (UTC-8)', value: 'America/Vancouver' },
  ]},
  { group: 'Malaysia', zones: [
    { label: 'MYT — Malaysia Time (UTC+8)', value: 'Asia/Kuala_Lumpur' },
  ]},
  { group: 'Middle East', zones: [
    { label: 'GST — Gulf Standard Time / UAE (UTC+4)', value: 'Asia/UAE' },
  ]},
  { group: 'United Kingdom', zones: [
    { label: 'GMT — Greenwich Mean Time (UTC+0)', value: 'Europe/London' },
  ]},
  { group: 'Other', zones: [
    { label: 'UTC — Coordinated Universal Time', value: 'UTC' },
    { label: 'CET — Central European Time (UTC+1)', value: 'Europe/Paris' },
    { label: 'SGT — Singapore (UTC+8)', value: 'Asia/Singapore' },
    { label: 'AEST — Australia Eastern (UTC+10)', value: 'Australia/Sydney' },
  ]},
];

const ToolManagement = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTool, setViewingTool] = useState(null);
  const [editingTool, setEditingTool] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const [showRenewedModal, setShowRenewedModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const buildEmptyForm = () => ({
    tool_name: '', year: new Date().getFullYear(), no_of_license: '',
    type: 'NA', cost: '', revenue: '', monthly_cost: '', quarterly_cost: '',
    annual_cost: '', currency: 'USD', geography: 'INDIA', job_slots: '',
    resume_views: '', bulk_mail: '', payment_frequency: 'Monthly',
    last_renewal: '', next_renewal: '', comments: '',
    spoc_1: '', spoc_1_contact: '', spoc_1_email: '', spoc_1_timezone: '', spoc_1_best_time: '',
    spoc_2: '', spoc_2_contact: '', spoc_2_email: '', spoc_2_timezone: '', spoc_2_best_time: '',
    contact_no: '', email_id: '',
    status: 'Active', reason_for_using: '', deactivation_reason: '',
  });

  const [formData, setFormData] = useState(buildEmptyForm());

  const currencySymbols = { INR:'₹', USD:'$', CAD:'$', MYR:'RM', AED:'د.إ', EUR:'€', GBP:'£' };
  const getCurrencySymbol = (c) => currencySymbols[c] || '$';

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(50);
  const [pagination, setPagination] = useState({ page:1, limit:50, total:0, totalPages:0 });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user && (user.admin_access === true || user.admin_access === 1);

  useEffect(() => { fetchTools(); }, []);

  const fetchTools = async (page = 1, status = null) => {
    try {
      setLoading(true);
      const s = status !== null ? status : filterStatus;
      const data = await api.getTools(page, rowsPerPage, s);
      setTools(data.tools || []);
      if (data.pagination) setPagination(data.pagination);
      else setPagination({ page:1, limit:rowsPerPage, total:(data.tools||[]).length, totalPages:1 });
    } catch (err) {
      setError(err.message); setTools([]);
      setPagination({ page:1, limit:rowsPerPage, total:0, totalPages:0 });
    } finally { setLoading(false); }
  };

  const handleFilterChange = (e) => {
    const s = e.target.value; setFilterStatus(s); setCurrentPage(1); fetchTools(1, s);
  };
  const handlePageChange = (p) => { setCurrentPage(p); fetchTools(p, null); };

  const sanitizeCSVField = (field) => {
    const str = String(field || '');
    if (/^[=+\-@\t]/.test(str)) return "'" + str;
    return str.replace(/"/g, '""');
  };

  const handleExportCSV = () => {
    const headers = [
      'Year','Tool Name','Type','No. of License','Resume Views','Job Slots','Bulk Mail',
      'Cost','Monthly Cost','Quarterly Cost','Annual Cost','Currency','Payment Frequency',
      'Last Renewal','Next Renewal','Comments',
      'SPOC 1 Name','SPOC 1 Contact','SPOC 1 Email','SPOC 1 Timezone',
      'SPOC 2 Name','SPOC 2 Contact','SPOC 2 Email','SPOC 2 Timezone',
      'Status','Reason for Using','Deactivation Reason',
    ];
    const rows = tools.map(t => [
      t.year, t.tool_name, t.type, t.no_of_license, t.resume_views, t.job_slots, t.bulk_mail||0,
      getCurrencySymbol(t.currency)+t.cost, getCurrencySymbol(t.currency)+t.monthly_cost,
      getCurrencySymbol(t.currency)+t.quarterly_cost, getCurrencySymbol(t.currency)+t.annual_cost,
      t.currency, t.payment_frequency, t.last_renewal, t.next_renewal, t.comments,
      t.spoc_1, t.spoc_1_contact, t.spoc_1_email, t.spoc_1_timezone,
      t.spoc_2, t.spoc_2_contact, t.spoc_2_email, t.spoc_2_timezone,
      t.status, t.reason_for_using, t.deactivation_reason,
    ].map(sanitizeCSVField).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type:'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob); a.download = 'tools_export.csv'; a.click();
  };

  const getDaysLeft = (d) => {
    const t = new Date(); t.setHours(0,0,0,0);
    const r = new Date(d); r.setHours(0,0,0,0);
    return Math.ceil((r-t)/(1000*60*60*24));
  };
  const getExpiringTools = () => tools.filter(t => {
    if (!t.next_renewal || t.status !== 'Active') return false;
    const d = getDaysLeft(t.next_renewal); return d >= 0 && d <= 31;
  });
  const getRenewedTools = () => {
    const now = new Date();
    const som = new Date(now.getFullYear(), now.getMonth(), 1);
    return tools.filter(t => t.last_renewal && new Date(t.last_renewal) >= som && t.status === 'Active');
  };

  const handleAdd = () => { setEditingTool(null); setFormData(buildEmptyForm()); setFormErrors({}); setShowModal(true); };

  const handleEdit = (tool) => {
    setEditingTool(tool);
    setFormData({
      tool_name: tool.tool_name||'', year: tool.year||new Date().getFullYear(),
      no_of_license: tool.no_of_license??'', type: tool.type||'NA',
      cost: tool.cost??'', revenue: tool.revenue??'', monthly_cost: tool.monthly_cost??'',
      quarterly_cost: tool.quarterly_cost??'', annual_cost: tool.annual_cost??'',
      currency: tool.currency||'USD', geography: tool.geography||'INDIA',
      job_slots: tool.job_slots??'', resume_views: tool.resume_views??'', bulk_mail: tool.bulk_mail??'',
      payment_frequency: tool.payment_frequency||'Monthly',
      last_renewal: tool.last_renewal||'', next_renewal: tool.next_renewal||'',
      comments: tool.comments||'',
      spoc_1: tool.spoc_1||'', spoc_1_contact: tool.spoc_1_contact||'',
      spoc_1_email: tool.spoc_1_email||'', spoc_1_timezone: tool.spoc_1_timezone||'', spoc_1_best_time: tool.spoc_1_best_time||'',
      spoc_2: tool.spoc_2||'', spoc_2_contact: tool.spoc_2_contact||'',
      spoc_2_email: tool.spoc_2_email||'', spoc_2_timezone: tool.spoc_2_timezone||'', spoc_2_best_time: tool.spoc_2_best_time||'',
      contact_no: tool.contact_no||'', email_id: tool.email_id||'',
      status: tool.status||'Active', reason_for_using: tool.reason_for_using||'',
      deactivation_reason: tool.deactivation_reason||'',
    });
    setFormErrors({}); setShowModal(true);
  };

  const handleView = (tool) => { setViewingTool(tool); setShowViewModal(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tool?')) return;
    try { await api.deleteTool(id); api.triggerToolRefresh(); fetchTools(currentPage, filterStatus); }
    catch (err) { alert(err.message); }
  };

  const validateForm = () => {
    const e = {};
    if (!String(formData.tool_name).trim()) e.tool_name = 'Tool name is required.';
    if (!String(formData.spoc_1).trim()) e.spoc_1 = 'Internal SPOC name is required.';
    if (!formData.last_renewal) e.last_renewal = 'Start / Last Renewal date is required.';
    if (!formData.next_renewal) e.next_renewal = 'End / Next Renewal date is required.';
    if (!String(formData.comments).trim()) e.comments = 'Comments are required.';
    if (!String(formData.reason_for_using).trim()) e.reason_for_using = 'Reason for using is required.';
    if (formData.annual_cost === '' || Number(formData.annual_cost) <= 0) e.annual_cost = 'Annual cost must be greater than 0.';
    if (formData.status === 'Inactive' && !String(formData.deactivation_reason).trim()) e.deactivation_reason = 'Please provide a reason for deactivating this tool.';
    if (formData.last_renewal && formData.next_renewal && new Date(formData.next_renewal) <= new Date(formData.last_renewal)) e.next_renewal = 'Next Renewal must be after Last Renewal.';
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.spoc_1_email && !emailRe.test(formData.spoc_1_email)) e.spoc_1_email = 'Invalid email format.';
    if (formData.spoc_2_email && !emailRe.test(formData.spoc_2_email)) e.spoc_2_email = 'Invalid email format.';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const el = document.querySelector(`[name="${Object.keys(errors)[0]}"]`);
      if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }
    setFormErrors({});
    try {
      const payload = { ...formData };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      if (editingTool) await api.updateTool({ ...payload, id: editingTool.id });
      else await api.addTool(payload);
      api.triggerToolRefresh(); setShowModal(false); fetchTools(currentPage, filterStatus);
    } catch (err) { alert(err.message); }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]:'' }));
    if (name === 'status' && value === 'Active') {
      setFormData(prev => ({ ...prev, status:'Active', deactivation_reason:'' }));
      setFormErrors(prev => ({ ...prev, deactivation_reason:'' }));
      return;
    }
    if (type === 'number') {
      if (value === '' || value === '-') {
        setFormData(prev => ({ ...prev, [name]: '' }));
        return;
      }
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) return;

      // Auto-calculate cost fields when one is entered
      let derived = {};
      if (name === 'monthly_cost') {
        derived.quarterly_cost = parseFloat((num * 3).toFixed(2));
        derived.annual_cost    = parseFloat((num * 12).toFixed(2));
      } else if (name === 'quarterly_cost') {
        derived.monthly_cost = parseFloat((num / 3).toFixed(2));
        derived.annual_cost  = parseFloat((num * 4).toFixed(2));
      } else if (name === 'annual_cost') {
        derived.monthly_cost   = parseFloat((num / 12).toFixed(2));
        derived.quarterly_cost = parseFloat((num / 4).toFixed(2));
      }

      setFormData(prev => ({ ...prev, [name]: num, ...derived }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]:value }));
  };

  const FieldError = ({ name }) => formErrors[name]
    ? <span className="field-error"><i className="fas fa-exclamation-circle"></i> {formErrors[name]}</span>
    : null;

  // Resolve a timezone value to its display label
  const getTimezoneLabel = (value) => {
    for (const group of TIMEZONES) {
      const found = group.zones.find(z => z.value === value);
      if (found) return found.label;
    }
    return value || '—';
  };

  // Reusable timezone select component
  const TimezoneSelect = ({ name, value, onChange }) => (
    <select name={name} value={value} onChange={onChange} className="timezone-select">
      <option value="">— Select Timezone —</option>
      {TIMEZONES.map(group => (
        <optgroup key={group.group} label={group.group}>
          {group.zones.map(z => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  const renderSpocCell = (name, contact, email, bestTime, timezone) => {
    if (!name && !contact && !email) return <span className="muted">—</span>;
    return (
      <div className="spoc-cell">
        {name     && <div className="spoc-name"><i className="fas fa-user"></i> {name}</div>}
        {contact  && <div className="spoc-line"><i className="fas fa-phone"></i> <a href={`tel:${contact}`} onClick={e=>e.stopPropagation()}>{contact}</a></div>}
        {email    && <div className="spoc-line"><i className="fas fa-envelope"></i> <a href={`mailto:${email}`} onClick={e=>e.stopPropagation()}>{email}</a></div>}
        {bestTime && <div className="spoc-line"><i className="fas fa-clock"></i> {bestTime} {timezone ? `(${getTimezoneLabel(timezone)})` : ''}</div>}
        {!bestTime && timezone && <div className="spoc-line spoc-tz"><i className="fas fa-clock"></i> {getTimezoneLabel(timezone)}</div>}
      </div>
    );
  };

  // ── Tool Catalog View ────────────────────────────────────────────────────
  const ToolCatalog = ({ tool, onClose }) => {
    if (!tool) return null;
    const sym = getCurrencySymbol(tool.currency);
    const isActive = tool.status === 'Active';
    const daysLeft = tool.next_renewal ? getDaysLeft(tool.next_renewal) : null;
    const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 31;

    const InfoRow = ({ icon, label, value }) =>
      value && String(value).trim() && String(value).trim() !== '0' ? (
        <div className="catalog-row">
          <span className="catalog-row-label"><i className={`fas ${icon}`}></i> {label}</span>
          <span className="catalog-row-value">{value}</span>
        </div>
      ) : null;

    const ContactCard = ({ name, contact, email, bestTime, timezone }) => (
      <div className="catalog-contact-card">
        {name     && <div className="catalog-contact-name"><i className="fas fa-user"></i> {name}</div>}
        {contact  && <a href={`tel:${contact}`} className="catalog-contact-link"><i className="fas fa-phone"></i> {contact}</a>}
        {email    && <a href={`mailto:${email}`} className="catalog-contact-link"><i className="fas fa-envelope"></i> {email}</a>}
        {bestTime && (
          <div className="catalog-contact-link" style={{color:'#64748b', cursor:'default'}}>
            <i className="fas fa-clock"></i> Best time: {bestTime}
          </div>
        )}
        {timezone && (
          <div className="catalog-contact-tz">
            <i className="fas fa-clock"></i>
            <span>{getTimezoneLabel(timezone)}</span>
          </div>
        )}
      </div>
    );

    return (
      <div className="catalog-overlay" onClick={onClose}>
        <div className="catalog-panel" onClick={e => e.stopPropagation()}>
          <div className={`catalog-header ${isActive ? 'catalog-header-active' : 'catalog-header-inactive'}`}>
            <div className="catalog-header-top">
              <div className="catalog-icon-wrap"><i className="fas fa-tools"></i></div>
              <div className="catalog-title-area">
                <div className="catalog-year-badge">{tool.year}</div>
                <h2 className="catalog-tool-name">{tool.tool_name}</h2>
                <div className="catalog-meta-pills">
                  {tool.type && tool.type !== 'NA' && <span className="catalog-pill pill-type">{tool.type}</span>}
                  {tool.geography && <span className="catalog-pill pill-geo"><i className="fas fa-globe-americas"></i> {tool.geography}</span>}
                  <span className={`catalog-pill ${isActive ? 'pill-active' : 'pill-inactive'}`}>
                    <i className={`fas ${isActive ? 'fa-check-circle' : 'fa-ban'}`}></i> {tool.status}
                  </span>
                  {isExpiringSoon && isActive && <span className="catalog-pill pill-expiring"><i className="fas fa-exclamation-triangle"></i> Expires in {daysLeft}d</span>}
                </div>
              </div>
              <button className="catalog-close" onClick={onClose}><i className="fas fa-times"></i></button>
            </div>
          </div>

          <div className="catalog-body">
            {/* Financials */}
            <div className="catalog-section">
              <div className="catalog-section-title"><i className="fas fa-dollar-sign"></i> Financial Details</div>
              <div className="catalog-finance-grid">
                <div className="catalog-finance-card">
                  <div className="catalog-finance-label">Annual Cost</div>
                  <div className="catalog-finance-value big">{sym}{Number(tool.annual_cost||0).toLocaleString()}</div>
                  <div className="catalog-finance-sub">{tool.currency} · {tool.payment_frequency}</div>
                </div>
                <div className="catalog-finance-card">
                  <div className="catalog-finance-label">Monthly Cost</div>
                  <div className="catalog-finance-value">{sym}{Number(tool.monthly_cost||0).toLocaleString()}</div>
                </div>
                <div className="catalog-finance-card">
                  <div className="catalog-finance-label">Quarterly Cost</div>
                  <div className="catalog-finance-value">{sym}{Number(tool.quarterly_cost||0).toLocaleString()}</div>
                </div>
                <div className="catalog-finance-card">
                  <div className="catalog-finance-label">Base Cost</div>
                  <div className="catalog-finance-value">{sym}{Number(tool.cost||0).toLocaleString()}</div>
                </div>
                {tool.revenue > 0 && (
                  <div className="catalog-finance-card catalog-finance-revenue">
                    <div className="catalog-finance-label">Revenue</div>
                    <div className="catalog-finance-value">{sym}{Number(tool.revenue||0).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Renewal */}
            <div className="catalog-section">
              <div className="catalog-section-title"><i className="fas fa-calendar-alt"></i> Renewal Schedule</div>
              <div className="catalog-renewal-row">
                <div className="catalog-renewal-block">
                  <div className="catalog-renewal-label">Start Date</div>
                  <div className="catalog-renewal-date">{tool.last_renewal || '—'}</div>
                </div>
                <div className="catalog-renewal-arrow"><i className="fas fa-long-arrow-alt-right"></i></div>
                <div className="catalog-renewal-block">
                  <div className="catalog-renewal-label">End Date</div>
                  <div className={`catalog-renewal-date ${isExpiringSoon && isActive ? 'expiring' : ''}`}>
                    {tool.next_renewal || '—'}
                    {isExpiringSoon && isActive && <span className="renewal-badge">{daysLeft}d left</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="catalog-section">
              <div className="catalog-section-title"><i className="fas fa-chart-bar"></i> Usage &amp; Licensing</div>
              <div className="catalog-usage-grid">
                <InfoRow icon="fa-id-card" label="No. of Licenses" value={tool.no_of_license} />
                <InfoRow icon="fa-briefcase" label="Job Slots" value={tool.job_slots > 0 ? tool.job_slots : null} />
                <InfoRow icon="fa-eye" label="Resume Views" value={tool.resume_views > 0 ? tool.resume_views : null} />
                <InfoRow icon="fa-paper-plane" label="Bulk Mail" value={tool.bulk_mail > 0 ? 'Yes' : null} />
              </div>
            </div>

            {/* SPOC 1 */}
            {(tool.spoc_1 || tool.spoc_1_contact || tool.spoc_1_email) && (
                <div className="catalog-section">
                  <div className="catalog-section-title"><i className="fas fa-user-tie"></i> SPOC 1 — Internal Contact</div>
                  <ContactCard name={tool.spoc_1} contact={tool.spoc_1_contact || tool.contact_no} email={tool.spoc_1_email || tool.email_id} bestTime={tool.spoc_1_best_time} timezone={tool.spoc_1_timezone} />
                </div>
            )}
            
            {/* SPOC 2 */}
            {(tool.spoc_2 || tool.spoc_2_contact || tool.spoc_2_email) && (
              <div className="catalog-section">
                <div className="catalog-section-title"><i className="fas fa-user-friends"></i> SPOC 2 — External Contact</div>
                <ContactCard name={tool.spoc_2} contact={tool.spoc_2_contact} email={tool.spoc_2_email} bestTime={tool.spoc_2_best_time} timezone={tool.spoc_2_timezone} />
              </div>
            )}

            {/* Reason for Using */}
            {tool.reason_for_using && (
              <div className="catalog-section">
                <div className="catalog-section-title"><i className="fas fa-lightbulb"></i> Reason for Using</div>
                <div className="catalog-text-block">{tool.reason_for_using}</div>
              </div>
            )}

            {/* Comments */}
            {tool.comments && (
              <div className="catalog-section">
                <div className="catalog-section-title"><i className="fas fa-sticky-note"></i> Comments</div>
                <div className="catalog-text-block">{tool.comments}</div>
              </div>
            )}

            {/* Deactivation */}
            {!isActive && tool.deactivation_reason && (
              <div className="catalog-section">
                <div className="catalog-section-title catalog-section-title-danger"><i className="fas fa-ban"></i> Reason for Deactivation</div>
                <div className="catalog-text-block catalog-text-danger">{tool.deactivation_reason}</div>
              </div>
            )}
          </div>

          <div className="catalog-footer">
            {isAdmin && (
              <button className="catalog-btn-edit" onClick={() => { onClose(); handleEdit(tool); }}>
                <i className="fas fa-edit"></i> Edit Tool
              </button>
            )}
            <button className="catalog-btn-close" onClick={onClose}><i className="fas fa-times"></i> Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="tool-management">
      <div className="tool-header">
        <h1>Tool Archive</h1>
        <div className="tool-header-actions">
          <div className="summary-cards-inline">
            <div className="summary-card-small renewed" onClick={() => setShowRenewedModal(true)}>
              <div className="summary-icon renewed"><i className="fas fa-check-circle"></i></div>
              <div className="summary-card-content"><span className="summary-label">Renewed</span><span className="summary-count">{getRenewedTools().length}</span></div>
            </div>
            <div className="summary-card-small expiring" onClick={() => setShowExpiringModal(true)}>
              <div className="summary-icon expiring"><i className="fas fa-exclamation-triangle"></i></div>
              <div className="summary-card-content"><span className="summary-label">Expiring</span><span className="summary-count">{getExpiringTools().length}</span></div>
            </div>
          </div>
          {isAdmin && (
            <button onClick={handleAdd} className="btn-primary">
              <i className="fas fa-plus-circle"></i> Add New Tool
            </button>
          )}
        </div>
      </div>

      <div className="tool-filters">
        <div className="filter-group">
          <label><i className="fas fa-filter"></i> Filter Status:</label>
          <select value={filterStatus} onChange={handleFilterChange}>
            <option value="All">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
        <button onClick={handleExportCSV} className="btn-export">
          <i className="fas fa-file-export"></i> Export to CSV
        </button>
      </div>

      {showExpiringModal && (
        <div className="modal-overlay" onClick={() => setShowExpiringModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2><i className="fas fa-calendar-exclamation"></i> Tools Expiring This Month</h2><button className="modal-close" onClick={() => setShowExpiringModal(false)}>×</button></div>
            <div className="modal-body">
              {getExpiringTools().length === 0 ? <p className="no-data">No tools expiring this month</p> : (
                <table className="expiring-table">
                  <thead><tr><th>Tool Name</th><th>Type</th><th>Cost</th><th>Renewal Date</th><th>Days Left</th></tr></thead>
                  <tbody>{getExpiringTools().map(t => <tr key={t.id}><td><strong>{t.tool_name}</strong></td><td>{t.type}</td><td>{getCurrencySymbol(t.currency)}{parseFloat(t.cost||0).toLocaleString()}</td><td>{t.next_renewal}</td><td><span className="days-badge">{getDaysLeft(t.next_renewal)} days</span></td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {showRenewedModal && (
        <div className="modal-overlay" onClick={() => setShowRenewedModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2><i className="fas fa-check-circle"></i> Tools Renewed This Month</h2><button className="modal-close" onClick={() => setShowRenewedModal(false)}>×</button></div>
            <div className="modal-body">
              {getRenewedTools().length === 0 ? <p className="no-data">No tools renewed this month</p> : (
                <table className="expiring-table">
                  <thead><tr><th>Tool Name</th><th>Type</th><th>Cost</th><th>Renewed Date</th><th>Status</th></tr></thead>
                  <tbody>{getRenewedTools().map(t => <tr key={t.id}><td><strong>{t.tool_name}</strong></td><td>{t.type}</td><td>{getCurrencySymbol(t.currency)}{parseFloat(t.cost||0).toLocaleString()}</td><td>{t.last_renewal}</td><td><span className="status-badge active">{t.status}</span></td></tr>)}</tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? <p>Loading...</p> : (
        <>
          <div className="table-container">
            <table className="tool-table">
              <thead>
                <tr>
                  <th>Year</th><th>Tool Name</th><th>Type</th><th>Geography</th>
                  <th>License</th><th>Job Slot</th><th>Resume View</th><th>Bulk Mail</th>
                  <th>Cost</th><th>Monthly Cost</th><th>Quarterly Cost</th><th>Annual Cost</th>
                  <th>Currency</th><th>Frequency</th><th>Last Renewal</th><th>Next Renewal</th>
                  <th>Comments</th>
                  <th className="spoc-col">SPOC 1 (Internal)</th>
                  <th className="spoc-col">SPOC 2 (External)</th>
                  <th>Status</th>
                  <th className="action-header-cell">View</th>
                  <th className="action-header-cell">Edit</th>
                  <th className="action-header-cell">Delete</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id}>
                    <td>{tool.year}</td>
                    <td><strong>{tool.tool_name}</strong></td>
                    <td>{tool.type||'NA'}</td>
                    <td>{tool.geography||'-'}</td>
                    <td>{tool.no_of_license||'-'}</td>
                    <td>{tool.job_slots > 0 ? tool.job_slots : '-'}</td>
                    <td>{tool.resume_views > 0 ? tool.resume_views : '-'}</td>
                    <td>{tool.bulk_mail >= 1 ? 'Yes' : 'No'}</td>
                    <td>{getCurrencySymbol(tool.currency)}{Number(tool.cost||0).toLocaleString()}</td>
                    <td>{getCurrencySymbol(tool.currency)}{Number(tool.monthly_cost||0).toLocaleString()}</td>
                    <td>{getCurrencySymbol(tool.currency)}{Number(tool.quarterly_cost||0).toLocaleString()}</td>
                    <td>{getCurrencySymbol(tool.currency)}{Number(tool.annual_cost||0).toLocaleString()}</td>
                    <td>{tool.currency||'USD'}</td>
                    <td>{tool.payment_frequency||'-'}</td>
                    <td>{tool.last_renewal||'-'}</td>
                    <td>{tool.next_renewal||'-'}</td>
                    <td title={tool.comments}>{tool.comments ? (tool.comments.length > 35 ? tool.comments.substring(0,35)+'…' : tool.comments) : '-'}</td>
                    <td className="spoc-col">{renderSpocCell(tool.spoc_1, tool.spoc_1_contact||tool.contact_no, tool.spoc_1_email||tool.email_id, tool.spoc_1_best_time, tool.spoc_1_timezone)}</td>
                    <td className="spoc-col">{renderSpocCell(tool.spoc_2, tool.spoc_2_contact, tool.spoc_2_email, tool.spoc_2_best_time, tool.spoc_2_timezone)}</td>
                    <td><span className={`status status-${tool.status?.toLowerCase()}`}>{tool.status}</span></td>
                    <td className="action-cell-view">
                      <button onClick={() => handleView(tool)} className="btn-view" title="View Details"><i className="fas fa-eye"></i></button>
                    </td>
                    <td className="action-cell-edit">
                      {isAdmin && <button onClick={() => handleEdit(tool)} className="btn-edit" title="Edit"><i className="fas fa-edit"></i></button>}
                    </td>
                    <td className="action-cell-delete">
                      {isAdmin && <button onClick={() => handleDelete(tool.id)} className="btn-delete" title="Delete"><i className="fas fa-trash"></i></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-info">Showing {((pagination.page-1)*rowsPerPage)+1} to {Math.min(pagination.page*rowsPerPage,pagination.total)} of {pagination.total} entries</div>
              <div className="pagination">
                <button onClick={() => handlePageChange(1)} disabled={pagination.page===1} className="page-btn"><i className="fas fa-angle-double-left"></i></button>
                <button onClick={() => handlePageChange(pagination.page-1)} disabled={pagination.page===1} className="page-btn"><i className="fas fa-angle-left"></i></button>
                {Array.from({length:Math.min(5,pagination.totalPages)},(_,i)=>{
                  let p;
                  if(pagination.totalPages<=5)p=i+1;
                  else if(pagination.page<=3)p=i+1;
                  else if(pagination.page>=pagination.totalPages-2)p=pagination.totalPages-4+i;
                  else p=pagination.page-2+i;
                  return <button key={p} onClick={()=>handlePageChange(p)} className={`page-btn ${pagination.page===p?'active':''}`}>{p}</button>;
                })}
                <button onClick={()=>handlePageChange(pagination.page+1)} disabled={pagination.page===pagination.totalPages} className="page-btn"><i className="fas fa-angle-right"></i></button>
                <button onClick={()=>handlePageChange(pagination.totalPages)} disabled={pagination.page===pagination.totalPages} className="page-btn"><i className="fas fa-angle-double-right"></i></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Catalog modal */}
      {showViewModal && <ToolCatalog tool={viewingTool} onClose={() => setShowViewModal(false)} />}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-fullscreen" onClick={e => e.stopPropagation()}>
            <div className="modal-fullscreen-header">
              <h2><i className={`fas ${editingTool ? 'fa-edit' : 'fa-plus-circle'}`}></i> {editingTool ? 'Edit Tool' : 'Add New Tool'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fas fa-times"></i></button>
            </div>

            {Object.keys(formErrors).filter(k=>formErrors[k]).length > 0 && (
              <div className="form-error-summary">
                <i className="fas fa-exclamation-triangle"></i> <strong>Please fix {Object.keys(formErrors).filter(k=>formErrors[k]).length} error(s) before saving.</strong>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-fullscreen-form" noValidate>

              {/* Basic Info */}
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Year <span className="req">*</span></label>
                    <input type="number" name="year" value={formData.year} onChange={handleInputChange} min="2000" max="2100" />
                  </div>
                  <div className={`form-group ${formErrors.tool_name?'has-error':''}`}>
                    <label>Tool Name <span className="req">*</span></label>
                    <input type="text" name="tool_name" value={formData.tool_name} onChange={handleInputChange} placeholder="Enter tool name" />
                    <FieldError name="tool_name" />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select name="type" value={formData.type} onChange={handleInputChange}>
                      <option value="Job Portal">Job Portal</option><option value="Development">Development</option>
                      <option value="Resume Sourcing">Resume Sourcing</option><option value="Analytics">Analytics</option>
                      <option value="Communication">Communication</option><option value="Storage">Storage</option>
                      <option value="Security">Security</option><option value="Both">Both</option><option value="NA">NA</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Geography</label>
                    <select name="geography" value={formData.geography} onChange={handleInputChange}>
                      <option value="USA">USA</option><option value="INDIA">INDIA</option>
                      <option value="CANADA">CANADA</option><option value="MALAYSIA">MALAYSIA</option>
                      <option value="UAE">UAE</option><option value="UK">UK</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>No. of License</label>
                    <input type="number" name="no_of_license" value={formData.no_of_license} onChange={handleInputChange} min="1" />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                {formData.status === 'Inactive' && (
                  <div className={`deactivation-block ${formErrors.deactivation_reason?'has-error':''}`}>
                    <label><i className="fas fa-ban"></i> Reason for Deactivation <span className="req">*</span></label>
                    <textarea name="deactivation_reason" value={formData.deactivation_reason} onChange={handleInputChange} placeholder="Why is this tool being deactivated?" rows="3" />
                    <FieldError name="deactivation_reason" />
                  </div>
                )}
              </div>

              {/* Usage */}
              <div className="form-section">
                <h3>Usage Statistics</h3>
                <div className="form-row">
                  <div className="form-group"><label>Job Slots</label><input type="number" name="job_slots" value={formData.job_slots} onChange={handleInputChange} min="0" placeholder="0" /></div>
                  <div className="form-group"><label>Resume Views</label><input type="number" name="resume_views" value={formData.resume_views} onChange={handleInputChange} min="0" placeholder="0" /></div>
                  <div className="form-group"><label>Bulk Mail</label><input type="number" name="bulk_mail" value={formData.bulk_mail} onChange={handleInputChange} min="0" placeholder="0" /></div>
                </div>
              </div>

              {/* Financial */}
              <div className="form-section">
                <h3>Financial Details</h3>
                <div className="form-row">
                  <div className="form-group"><label>Currency</label>
                    <select name="currency" value={formData.currency} onChange={handleInputChange}>
                      <option value="USD">USD</option><option value="CAD">CAD</option>
                      <option value="INR">INR</option><option value="MYR">MYR</option><option value="AED">AED</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Cost</label><input type="number" name="cost" value={formData.cost} onChange={handleInputChange} step="0.01" placeholder="0.00" /></div>
                  <div className="form-group"><label>Revenue</label><input type="number" name="revenue" value={formData.revenue} onChange={handleInputChange} step="0.01" placeholder="0.00" /></div>
                  <div className="form-group"><label>Monthly Cost</label><input type="number" name="monthly_cost" value={formData.monthly_cost} onChange={handleInputChange} step="0.01" placeholder="0.00" /></div>
                  <div className="form-group"><label>Quarterly Cost</label><input type="number" name="quarterly_cost" value={formData.quarterly_cost} onChange={handleInputChange} step="0.01" placeholder="0.00" /></div>
                  <div className={`form-group ${formErrors.annual_cost?'has-error':''}`}>
                    <label>Annual Cost <span className="req">*</span></label>
                    <input type="number" name="annual_cost" value={formData.annual_cost} onChange={handleInputChange} step="0.01" placeholder="0.00" />
                    <FieldError name="annual_cost" />
                  </div>
                  <div className="form-group"><label>Payment Frequency</label>
                    <select name="payment_frequency" value={formData.payment_frequency} onChange={handleInputChange}>
                      <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option><option value="Annual">Annual</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Renewal */}
              <div className="form-section">
                <h3>Renewal Information</h3>
                <div className="form-row">
                  <div className={`form-group ${formErrors.last_renewal?'has-error':''}`}>
                    <label>Last Renewal (Start) <span className="req">*</span></label>
                    <input type="date" name="last_renewal" value={formData.last_renewal} onChange={handleInputChange} />
                    <FieldError name="last_renewal" />
                  </div>
                  <div className={`form-group ${formErrors.next_renewal?'has-error':''}`}>
                    <label>Next Renewal (End) <span className="req">*</span></label>
                    <input type="date" name="next_renewal" value={formData.next_renewal} onChange={handleInputChange} />
                    <FieldError name="next_renewal" />
                  </div>
                </div>
              </div>

              {/* ── SPOC Information with Timezone ── */}
              <div className="form-section">
                <h3>SPOC Information</h3>

                {/* SPOC 1 */}
                <div className="spoc-block">
                  <div className="spoc-block-title">
                    <i className="fas fa-user-tie"></i> SPOC 1 — Internal
                  </div>
                  <div className="form-row">
                    <div className={`form-group ${formErrors.spoc_1?'has-error':''}`}>
                      <label>Name <span className="req">*</span></label>
                      <input type="text" name="spoc_1" value={formData.spoc_1} onChange={handleInputChange} placeholder="Internal SPOC name" />
                      <FieldError name="spoc_1" />
                    </div>
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input type="text" name="spoc_1_contact" value={formData.spoc_1_contact} onChange={handleInputChange} placeholder="Phone number" />
                    </div>
                    <div className={`form-group ${formErrors.spoc_1_email?'has-error':''}`}>
                      <label>Email</label>
                      <input type="email" name="spoc_1_email" value={formData.spoc_1_email} onChange={handleInputChange} placeholder="name@example.com" />
                      <FieldError name="spoc_1_email" />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-clock"></i> Best Time to Reach</label>
                      <input
                        type="text"
                        name="spoc_1_best_time"
                        value={formData.spoc_1_best_time}
                        onChange={handleInputChange}
                        placeholder="e.g. 10 AM – 1 PM"
                      />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-globe"></i> Timezone</label>
                      <TimezoneSelect name="spoc_1_timezone" value={formData.spoc_1_timezone} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                {/* SPOC 2 */}
                <div className="spoc-block">
                  <div className="spoc-block-title">
                    <i className="fas fa-user-friends"></i> SPOC 2 — External
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name</label>
                      <input type="text" name="spoc_2" value={formData.spoc_2} onChange={handleInputChange} placeholder="External SPOC name" />
                    </div>
                    <div className="form-group">
                      <label>Contact Number</label>
                      <input type="text" name="spoc_2_contact" value={formData.spoc_2_contact} onChange={handleInputChange} placeholder="Phone number" />
                    </div>
                    <div className={`form-group ${formErrors.spoc_2_email?'has-error':''}`}>
                      <label>Email</label>
                      <input type="email" name="spoc_2_email" value={formData.spoc_2_email} onChange={handleInputChange} placeholder="name@example.com" />
                      <FieldError name="spoc_2_email" />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-clock"></i> Best Time to Reach</label>
                      <input
                        type="text"
                        name="spoc_2_best_time"
                        value={formData.spoc_2_best_time}
                        onChange={handleInputChange}
                        placeholder="e.g. 10 AM – 1 PM"
                      />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-globe"></i> Timezone</label>
                      <TimezoneSelect name="spoc_2_timezone" value={formData.spoc_2_timezone} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional */}
              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-row">
                  <div className={`form-group ${formErrors.comments?'has-error':''}`}>
                    <label>Comments <span className="req">*</span></label>
                    <textarea name="comments" value={formData.comments} onChange={handleInputChange} placeholder="Notes about this tool…" rows="3" />
                    <FieldError name="comments" />
                  </div>
                  <div className={`form-group ${formErrors.reason_for_using?'has-error':''}`}>
                    <label>Reason for Using <span className="req">*</span></label>
                    <textarea name="reason_for_using" value={formData.reason_for_using} onChange={handleInputChange} placeholder="Why is this tool being used?" rows="3" />
                    <FieldError name="reason_for_using" />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary"><i className="fas fa-save"></i> {editingTool ? 'Update Tool' : 'Save Tool'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary"><i className="fas fa-times"></i> Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .req{color:#e53e3e;margin-left:2px}
        .field-error{display:block;color:#e53e3e;font-size:12px;margin-top:4px;font-weight:500}
        .field-error i{margin-right:3px}
        .form-group.has-error input,.form-group.has-error textarea,.form-group.has-error select{border-color:#e53e3e!important;background:#fff5f5}
        .form-error-summary{background:#fff5f5;border-left:4px solid #e53e3e;color:#c53030;padding:12px 20px;margin:0 20px 16px 20px;font-size:14px;border-radius:0 4px 4px 0}

        .deactivation-block{margin:14px 0 4px 0;padding:16px 18px;background:#fffaf0;border:1px solid #f6ad55;border-radius:8px}
        .deactivation-block label{display:block;color:#c05621;font-weight:600;margin-bottom:8px}
        .deactivation-block label i{margin-right:6px}
        .deactivation-block textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;font-size:14px;font-family:inherit;box-sizing:border-box;resize:vertical}
        .deactivation-block.has-error textarea{border-color:#e53e3e!important;background:#fff5f5}

        .spoc-block{margin-bottom:18px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px}
        .spoc-block-title{font-size:13px;font-weight:600;color:#2196F3;margin-bottom:12px;letter-spacing:0.3px;text-transform:uppercase}
        .spoc-block-title i{margin-right:6px}

        .timezone-select{width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:5px;font-size:13px;background:#fff;color:#333;cursor:pointer}
        .timezone-select:focus{outline:none;border-color:#2196F3;box-shadow:0 0 0 2px rgba(33,150,243,0.15)}

        .tool-table td.spoc-col,.tool-table th.spoc-col{min-width:200px}
        .spoc-cell{display:flex;flex-direction:column;gap:3px;font-size:13px;line-height:1.4}
        .spoc-cell .spoc-name{font-weight:600;color:#1a202c}
        .spoc-cell .spoc-line{color:#4a5568;font-size:12px}
        .spoc-cell .spoc-line a{color:#2196F3;text-decoration:none}
        .spoc-cell .spoc-line a:hover{text-decoration:underline}
        .spoc-cell .spoc-tz{color:#718096;font-style:italic}
        .spoc-cell i{color:#718096;width:12px;margin-right:4px}
        .muted{color:#a0aec0}

        .action-cell-view{text-align:center;width:48px}
        .btn-view{background:#e3f2fd;color:#1565c0;border:none;border-radius:6px;width:32px;height:32px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;transition:background 0.15s}
        .btn-view:hover{background:#1565c0;color:#fff}

        /* Catalog */
        .catalog-overlay{position:fixed;inset:0;background:rgba(10,20,40,0.55);backdrop-filter:blur(4px);z-index:9000;display:flex;align-items:flex-start;justify-content:flex-end;padding:16px;animation:catalogFadeIn 0.2s ease}
        @keyframes catalogFadeIn{from{opacity:0}to{opacity:1}}
        .catalog-panel{background:#fff;border-radius:16px;width:min(580px,100%);max-height:calc(100vh - 32px);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.22),0 4px 16px rgba(0,0,0,0.1);animation:catalogSlideIn 0.25s cubic-bezier(0.34,1.1,0.64,1)}
        @keyframes catalogSlideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        .catalog-header{padding:28px 28px 22px;position:relative}
        .catalog-header-active{background:linear-gradient(135deg,#1565c0 0%,#1976d2 60%,#42a5f5 100%);color:#fff}
        .catalog-header-inactive{background:linear-gradient(135deg,#546e7a 0%,#607d8b 100%);color:#fff}
        .catalog-header-top{display:flex;gap:16px;align-items:flex-start}
        .catalog-icon-wrap{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
        .catalog-title-area{flex:1;min-width:0}
        .catalog-year-badge{display:inline-block;background:rgba(255,255,255,0.25);border-radius:20px;padding:2px 10px;font-size:12px;font-weight:600;margin-bottom:6px;letter-spacing:0.5px}
        .catalog-tool-name{margin:0 0 10px 0;font-size:22px;font-weight:700;line-height:1.2;color:#fff}
        .catalog-meta-pills{display:flex;flex-wrap:wrap;gap:6px}
        .catalog-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.2);color:#fff;letter-spacing:0.3px}
        .catalog-pill i{font-size:10px}
        .pill-active{background:rgba(102,255,153,0.3)}
        .pill-inactive{background:rgba(255,100,100,0.3)}
        .pill-expiring{background:rgba(255,200,0,0.35);color:#fff3c4}
        .catalog-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:background 0.15s}
        .catalog-close:hover{background:rgba(255,255,255,0.35)}
        .catalog-body{overflow-y:auto;flex:1;padding:4px 0 0 0}
        .catalog-section{padding:18px 28px;border-bottom:1px solid #f0f4f8}
        .catalog-section:last-child{border-bottom:none}
        .catalog-section-title{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;display:flex;align-items:center;gap:6px}
        .catalog-section-title i{color:#2196F3}
        .catalog-section-title-danger i{color:#e53e3e}
        .catalog-section-title-danger{color:#c53030}
        .catalog-finance-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
        .catalog-finance-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}
        .catalog-finance-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
        .catalog-finance-value{font-size:16px;font-weight:700;color:#1e293b}
        .catalog-finance-value.big{font-size:20px;color:#1565c0}
        .catalog-finance-sub{font-size:11px;color:#94a3b8;margin-top:2px}
        .catalog-finance-revenue .catalog-finance-value{color:#059669}
        .catalog-renewal-row{display:flex;align-items:center;gap:12px}
        .catalog-renewal-block{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;text-align:center}
        .catalog-renewal-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
        .catalog-renewal-date{font-size:15px;font-weight:600;color:#1e293b;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}
        .catalog-renewal-date.expiring{color:#dc2626}
        .renewal-badge{background:#fef2f2;border:1px solid #fca5a5;color:#dc2626;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:700}
        .catalog-renewal-arrow{color:#94a3b8;font-size:20px;flex-shrink:0}
        .catalog-usage-grid{display:flex;flex-direction:column;gap:0}
        .catalog-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f4f8}
        .catalog-row:last-child{border-bottom:none}
        .catalog-row-label{font-size:13px;color:#64748b;display:flex;align-items:center;gap:8px}
        .catalog-row-label i{width:14px;color:#94a3b8}
        .catalog-row-value{font-size:13px;font-weight:600;color:#1e293b}
        .catalog-contact-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
        .catalog-contact-name{font-size:15px;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px}
        .catalog-contact-name i{color:#94a3b8;font-size:13px}
        .catalog-contact-link{display:inline-flex;align-items:center;gap:8px;color:#1565c0;text-decoration:none;font-size:13px;font-weight:500;transition:color 0.15s}
        .catalog-contact-link:hover{color:#1976d2;text-decoration:underline}
        .catalog-contact-link i{color:#94a3b8;width:14px;font-size:12px}
        .catalog-contact-tz{display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b;background:#eef2ff;border-radius:6px;padding:5px 10px;margin-top:2px}
        .catalog-contact-tz i{color:#818cf8;font-size:11px}
        .catalog-contact-tz span{font-weight:500}
        .catalog-text-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;font-size:14px;color:#334155;line-height:1.6;white-space:pre-wrap}
        .catalog-text-danger{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
        .catalog-footer{padding:16px 28px;border-top:1px solid #f0f4f8;display:flex;gap:10px;background:#fafbfc;border-radius:0 0 16px 16px}
        .catalog-btn-edit{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;background:#1565c0;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.15s}
        .catalog-btn-edit:hover{background:#1976d2}
        .catalog-btn-close{display:inline-flex;align-items:center;gap:7px;padding:9px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background 0.15s;margin-left:auto}
        .catalog-btn-close:hover{background:#e2e8f0}
      `}</style>
    </div>
  );
};

export default ToolManagement;