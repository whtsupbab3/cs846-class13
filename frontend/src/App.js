import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import UserProfile from './pages/UserProfile';
import './App.css';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('authToken')
  );

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="app-container">
        {isAuthenticated && (
          <div className="logout-container">
            <button onClick={handleLogout}>Logout</button>
          </div>
        )}
        <div className="register-container">
          <Routes>
            <Route 
              path="/" 
              element={isAuthenticated ? <Feed /> : <Navigate to="/login" />} 
            />
            <Route path="/login" element={
              isAuthenticated ? (
                <Navigate to="/" />
              ) : (
                <div className="auth-form-wrapper">
                  <h1 className="auth-title">Welcome Back!</h1>
                  <p className="auth-subtitle">Login to your account</p>
                  <Login onLoginSuccess={handleLoginSuccess} />
                  <p className="auth-footer">
                    Don't have an account?{' '}
                    <a href="/register" className="switch-button">
                      Register here
                    </a>
                  </p>
                </div>
              )
            } />
            <Route path="/register" element={
              isAuthenticated ? (
                <Navigate to="/" />
              ) : (
                <div className="auth-form-wrapper">
                  <h1 className="auth-title">Welcome!</h1>
                  <p className="auth-subtitle">Create your account to get started</p>
                  <Register onRegisterSuccess={handleLoginSuccess} />
                  <p className="auth-footer">
                    Already have an account?{' '}
                    <a href="/login" className="switch-button">
                      Login here
                    </a>
                  </p>
                </div>
              )
            } />
            <Route path="/profile/:username" element={<UserProfile />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
