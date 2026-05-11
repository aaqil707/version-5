// API service
const API_BASE = ''; // Same origin - requests go to same port

const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/getCsrfToken.php`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await response.json();
    if (data.csrf_token) {
      // Store token so getCsrfToken() can retrieve it
      localStorage.setItem('csrf_token', data.csrf_token);
      return data.csrf_token;
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
  }
  return null;
};

const getCsrfToken = () => {
  return localStorage.getItem('csrf_token');
};

const handleUnauthorized = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('csrf_token');
  window.location.href = '/login';
};

const api = {
  checkAuth: async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/check.php`, {
        method: 'GET',
        credentials: 'include'
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Auth check failed: Invalid response');
        }
        return { authenticated: false };
      }
      if (data.authenticated && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.csrf_token) {
          localStorage.setItem('csrf_token', data.csrf_token);
        }
        return { authenticated: true, user: data.user };
      }
      return { authenticated: false };
    } catch (error) {
      return { authenticated: false };
    }
  },

  // Auth endpoints
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Server error: Invalid response format');
        }
        throw new Error('Server error: Invalid response format');
      }
      if (!response.ok) throw new Error(data.error || 'Login failed');
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      if (data.csrf_token) {
        localStorage.setItem('csrf_token', data.csrf_token);
      }
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  signup: async (name, email, password) => {
    try {
      // Fetch a fresh CSRF token and use the returned value directly
      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`${API_BASE}/auth/signup.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (!response.ok) {
        // Handle permission denied errors
        if (response.status === 403) {
          throw new Error(data.error || 'Permission denied. Admin access required.');
        }
        throw new Error(data.error || 'Signup failed');
      }
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      if (data.csrf_token) {
        localStorage.setItem('csrf_token', data.csrf_token);
      }
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout.php`, {
        method: 'POST',
        credentials: 'include',
      });
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');
    }
  },

  verifyOTP: async (email, otp) => {
    try {
      const response = await fetch(`${API_BASE}/auth/verifyOTP.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      if (data.csrf_token) {
        localStorage.setItem('csrf_token', data.csrf_token);
      }
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  resendOTP: async (email) => {
    try {
      const response = await fetch(`${API_BASE}/auth/resendOTP.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (!response.ok) throw new Error(data.error || 'Failed to resend OTP');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Password Reset
  requestPasswordReset: async (email) => {
    try {
      const response = await fetch(`${API_BASE}/auth/resetPassword.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', email }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (!response.ok) throw new Error(data.error || 'Failed to request password reset');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  resetPassword: async (email, token, newPassword, confirmPassword) => {
    try {
      const response = await fetch(`${API_BASE}/auth/resetPassword.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', email, token, new_password: newPassword, confirm_password: confirmPassword }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Audit Logs
  getAuditLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/getAuditLogs.php?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch audit logs');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Activity Logs (for all users)
  getActivityLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/getActivityLogs.php?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch activity logs');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // User Management (Admin)
  getUsers: async (statusFilter = 'all') => {
    try {
      const csrfToken = getCsrfToken();
      let url = `${API_BASE}/auth/getUsers.php`;
      if (statusFilter && statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  createUser: async (userData) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/adminResetPassword.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'create_user', ...userData }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to create user');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  adminResetPassword: async (userId) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/adminResetPassword.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'send_reset_link', user_id: userId }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to send reset link');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  toggleUserStatus: async (userId, action) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/toggleUserStatus.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, action: action }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to update user status');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  verifyResetToken: async (email, token, newPassword, confirmPassword) => {
    try {
      const response = await fetch(`${API_BASE}/auth/verifyResetToken.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, new_password: newPassword, confirm_password: confirmPassword }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (!response.ok) throw new Error(data.error || 'Failed to reset password');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Get all users for admin dropdown
  getAllUsersForAdmin: async () => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/getAllUsersForAdmin.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Grant or revoke admin access
  setAdminAccess: async (userId, grantAdmin) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/auth/setAdminAccess.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, grant_admin: grantAdmin }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (response.status === 403) {
        throw new Error(data.error || 'Permission denied. Admin access required.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to update admin access');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Tools endpoints
  getToolsForPortal: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/getToolsForPortal.php?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch tools');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  getTools: async (page = 1, limit = 50, status = null) => {
    try {
      const csrfToken = getCsrfToken();
      let url = `${API_BASE}/tools/getTools.php?page=${page}&limit=${limit}`;
      if (status && status !== 'All') {
        url += `&status=${status}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch tools');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  addTool: async (tool) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/addTool.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify(tool),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (response.status === 403) {
        throw new Error(data.error || 'Permission denied. Admin access required.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to add tool');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  updateTool: async (tool) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/updateTool.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify(tool),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (response.status === 403) {
        throw new Error(data.error || 'Permission denied. Admin access required.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to update tool');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  deleteTool: async (id) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/deleteTool.php`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ id }),
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (response.status === 403) {
        throw new Error(data.error || 'Permission denied. Admin access required.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to delete tool');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  // Portal Performance endpoints
  getPortalStats: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/portal/getPortalStats.php?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch portal stats');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  triggerToolRefresh: () => {
    localStorage.setItem('toolDataChanged', Date.now().toString());
  },

  // Email settings endpoints
  getAlerts: async () => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/notifications/getAlerts.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch alerts');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  getRecycleBin: async () => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/getRecycleBin.php`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch recycle bin');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  restoreTool: async (id) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/restoreTool.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to restore tool');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  permanentDeleteTool: async (id) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_BASE}/tools/permanentDeleteTool.php`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to permanently delete tool');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  },

  getDeleteLogs: async (filters = {}) => {
    try {
      const csrfToken = getCsrfToken();
      const params = new URLSearchParams();
      if (filters.action && filters.action !== 'all') params.append('action', filters.action);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      
      const response = await fetch(`${API_BASE}/tools/getDeleteLogs.php?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server error: ' + text.substring(0, 100));
      }
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error('Session expired. Please login again.');
      }
      if (!response.ok) throw new Error(data.error || 'Failed to fetch delete logs');
      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error');
    }
  }
};

export default api;