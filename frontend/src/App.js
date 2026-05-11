import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ResetPassword from './pages/Auth/ResetPassword';
import Landing from './pages/Landing';
import Layout from './pages/Dashboard/Layout';
import PortalAnalysis from './pages/Dashboard/PortalAnalysis';
import ToolManagement from './pages/Dashboard/ToolManagement';
import HistoryLogs from './pages/Dashboard/HistoryLogs';
import UserManagement from './pages/Dashboard/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/tool-management" replace />} />
            <Route path="portal-analysis" element={<PortalAnalysis />} />
            <Route path="tool-management" element={<ToolManagement />} />
            <Route path="history-logs" element={<HistoryLogs />} />
            <Route path="user-management" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;