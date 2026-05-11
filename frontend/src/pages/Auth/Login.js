import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(email, password);
      if (data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.message;
      if (errMsg.includes('verify your email') || errMsg.includes('not_verified')) {
        setError(<>Please verify your email first. Check your inbox for the OTP sent during signup. <Link to="/signup">Resend OTP?</Link></>);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Floating Logo Background */}
      <div className="auth-logo-bg logo-1"></div>
      <div className="auth-logo-bg logo-2"></div>
      <div className="auth-background">
        <div className="auth-shapes">
          <div className="auth-shape auth-shape-1"></div>
          <div className="auth-shape auth-shape-2"></div>
          <div className="auth-shape auth-shape-3"></div>
        </div>
      </div>
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Logo" />
        </div>
        <h2><i className="fas fa-sign-in-alt"></i> Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue to Tool Management</p>
        {error && <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><i className="fas fa-envelope"></i> Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label><i className="fas fa-lock"></i> Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Logging in...</> : <><i className="fas fa-sign-in-alt"></i> Login</>}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/signup"><i className="fas fa-user-plus"></i> Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
