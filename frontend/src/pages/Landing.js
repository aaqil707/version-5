import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    localStorage.removeItem('user');
  }
  const isLoggedIn = user && user.name;

  const handleLogout = async () => {
    try {
      await api.logout();
      localStorage.removeItem('user');
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('user');
      window.location.reload();
    }
  };

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <img src="/logo.png" alt="Logo" className="landing-logo" />
          <h1>Tool Management System</h1>
        </div>
        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <>
              <span className="landing-welcome">
                <i className="fas fa-user-circle"></i>
                Welcome ! <strong>{user.name}</strong>
              </span>
              <button onClick={handleLogout} className="btn-landing-logout">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
              <button onClick={() => navigate('/dashboard')} className="btn-landing-dashboard">
                <i className="fas fa-tachometer-alt"></i> Dashboard
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-landing-login">
                <i className="fas fa-sign-in-alt"></i> Login
              </Link>
            </>
          )}
        </div>
      </nav>

      <header className="landing-hero">
        <div className="hero-background">
          <div className="hero-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            <i className="fas fa-rocket"></i> Professional Tool Management
          </div>
          <h2>Welcome to Tool Management System</h2>
          <p>Manage your tools, track licenses, and monitor renewals all in one powerful platform.</p>
          {!isLoggedIn && (
            <div className="hero-actions">
              <Link to="/login" className="btn-hero-login">
                <i className="fas fa-sign-in-alt"></i> Get Started - Login
              </Link>
              <Link to="/signup" className="btn-hero-signup">
                <i className="fas fa-user-plus"></i> Create Account
              </Link>
            </div>
          )}
          {isLoggedIn && (
            <button onClick={() => navigate('/dashboard')} className="btn-hero-dashboard">
              <i className="fas fa-tachometer-alt"></i> Go to Dashboard
            </button>
          )}
        </div>
        <div className="hero-stats">
          <div className="stat-item">
            <i className="fas fa-tools"></i>
            <span className="stat-number">500+</span>
            <span className="stat-label">Tools Managed</span>
          </div>
          <div className="stat-item">
            <i className="fas fa-users"></i>
            <span className="stat-number">100+</span>
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-item">
            <i className="fas fa-calendar-check"></i>
            <span className="stat-number">99%</span>
            <span className="stat-label">Renewal Success</span>
          </div>
        </div>
      </header>

      <section className="landing-features">
        <h2 className="features-title">
          <i className="fas fa-star"></i> Powerful Features
        </h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-tools"></i>
            </div>
            <h3>Tool Tracking</h3>
            <p>Keep track of all your software tools and their licenses in one centralized location.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-id-card"></i>
            </div>
            <h3>License Management</h3>
            <p>Monitor license counts, costs, and payment schedules effortlessly.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-bell"></i>
            </div>
            <h3>Renewal Alerts</h3>
            <p>Get notified before your tool subscriptions expire to avoid service interruptions.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-file-csv"></i>
            </div>
            <h3>CSV Export</h3>
            <p>Export your tool data to CSV format for reporting and analysis.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3>Analytics</h3>
            <p>Get insights into your tool usage, costs, and renewal patterns.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-envelope"></i>
            </div>
            <h3>Email Notifications</h3>
            <p>Automatic email reminders for upcoming renewals and expirations.</p>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="cta-content">
          <h2><i className="fas fa-rocket"></i> Ready to Get Started?</h2>
          <p>Join thousands of professionals managing their tools efficiently.</p>
          <Link to="/login" className="btn-cta">
            <i className="fas fa-sign-in-alt"></i> Get Started - Login
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/logo.png" alt="Logo" className="footer-logo" />
            <span>Tool Management System</span>
          </div>
          <div className="footer-links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-github"></i></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin"></i></a>
          </div>
          <p>&copy; 2026 Tool Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
