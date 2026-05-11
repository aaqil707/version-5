import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Auth.css';

const Signup = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [emailWarning, setEmailWarning] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.signup(name, email, password);
      if (data.verify_required) {
        setStep(2);
        if (data.email_failed) {
          setEmailWarning(data.message);
        } else {
          setSuccess(data.message);
        }
      } else {
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.verifyOTP(email, otp);
      setSuccess(data.message);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setResendLoading(true);

    try {
      const data = await api.resendOTP(email);
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-container">
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
        
        {step === 1 ? (
          <>
            <h2><i className="fas fa-user-plus"></i> Create Account</h2>
            <p className="auth-subtitle">Join the Tool Management System</p>
            {error && <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>}
            <form onSubmit={handleSignup}>
              <div className="form-group">
                <label><i className="fas fa-user"></i> Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>
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
                  placeholder="Create a password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Creating account...</> : <><i className="fas fa-user-plus"></i> Sign Up</>}
              </button>
            </form>
            <p className="auth-link">
              Already have an account? <Link to="/login"><i className="fas fa-sign-in-alt"></i> Login</Link>
            </p>
          </>
        ) : (
          <>
            <h2><i className="fas fa-envelope-open-text"></i> Verify Your Email</h2>
            <p className="auth-subtitle">Enter the OTP sent to your email</p>
            {error && <div className="error-message"><i className="fas fa-exclamation-circle"></i> {error}</div>}
            {success && <div className="success-message"><i className="fas fa-check-circle"></i> {success}</div>}
            {emailWarning && <div className="warning-message"><i className="fas fa-exclamation-triangle"></i> {emailWarning}</div>}
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label><i className="fas fa-key"></i> OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '18px' }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><i className="fas fa-spinner fa-spin"></i> Verifying...</> : <><i className="fas fa-check"></i> Verify OTP</>}
              </button>
            </form>
            <div className="otp-resend">
              <p>Didn't receive the OTP?</p>
              <button 
                type="button" 
                onClick={handleResendOTP} 
                disabled={resendLoading}
                className="btn-link"
              >
                {resendLoading ? <><i className="fas fa-spinner fa-spin"></i> Sending...</> : <><i className="fas fa-redo"></i> Resend OTP</>}
              </button>
            </div>
            <p className="auth-link">
              <Link to="/signup" onClick={() => { setStep(1); setError(''); setSuccess(''); }}><i className="fas fa-arrow-left"></i> Back to Signup</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;