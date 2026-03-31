import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const Register = ({ onRegisterSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('http://localhost:3001/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      // Store auth token if provided
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      // Call parent callback to update auth state
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      // Navigate to feed page after registration
      navigate('/');
    } else {
      alert('Registration failed.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h1>Welcome!</h1>
        <p>Create your account to get started</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="form-options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#">Forgot password?</a>
          </div>
          <button type="submit" className="register-button">Create an Account</button>
        </form>
      </div>
    </div>
  );
};

export default Register;