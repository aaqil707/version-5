import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen, onToggle }) => {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch (e) {
    localStorage.removeItem('user');
  }
  const isAdmin = user && (user.admin_access === true || user.admin_access === 1);

  const handleMenuClick = () => {
    if (window.innerWidth <= 768) {
      onToggle(false);
    }
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={() => onToggle(false)}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="Logo" className="sidebar-logo" />
          <span className="sidebar-brand">TMS</span>
        </div>
        <ul className="sidebar-menu">
          <li className="menu-section">
            <span className="menu-section-title">
              <i className="fas fa-th-large"></i> Dashboard
            </span>
            <ul className="submenu">
              <li>
                <NavLink to="/dashboard/portal-analysis" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleMenuClick}>
                  <i className="fas fa-chart-pie"></i>
                  <span>Portal Analysis</span>
                </NavLink>
              </li>
            </ul>
          </li>
          <li className="menu-item">
            <NavLink to="/dashboard/tool-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleMenuClick}>
              <i className="fas fa-archive"></i>
              <span>Tool Archive</span>
            </NavLink>
          </li>
          <li className="menu-item">
            <NavLink to="/dashboard/history-logs" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleMenuClick}>
              <i className="fas fa-history"></i>
              <span>History & Logs</span>
            </NavLink>
          </li>
           {isAdmin && (
           <li className="menu-item">
            <NavLink to="/dashboard/user-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={handleMenuClick}>
              <i className="fas fa-users"></i>
              <span>Users</span>
            </NavLink>
          </li>
          )}
        </ul>
        <div className="sidebar-footer">
          <div className="sidebar-version">
            <i className="fas fa-code-branch"></i>
            <span>v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
