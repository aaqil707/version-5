import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AlertBell from './AlertBell';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    localStorage.removeItem('user');
  }
  const isLoggedIn = user && user.name;
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await api.logout();
      localStorage.removeItem('user');
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src="/logo.png" alt="Logo" className="navbar-logo" />
        <span className="navbar-title">Tool Management</span>
      </div>
      <div className="navbar-user">
        <div className="theme-toggle" onClick={toggleTheme}>
          <div className={`toggle-switch ${isDarkMode ? 'dark' : 'light'}`}>
            <span className="toggle-icon">
              {isDarkMode ? '🌙' : '☀️'}
            </span>
          </div>
        </div>
        {isLoggedIn ? (
          <>
            <AlertBell />
            <span className="welcome-message">
              <i className="fas fa-user-circle"></i>
              Welcome ! <strong>{user.name}</strong>
            </span>
            <button onClick={handleLogout} className="btn-logout">
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </>
        ) : (
          <button onClick={handleLoginClick} className="btn-login">
            <i className="fas fa-sign-in-alt"></i> Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
