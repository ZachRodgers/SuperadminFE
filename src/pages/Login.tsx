import { api } from '../config/api';
import React, { useState } from 'react';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<React.ReactNode>(null);

  const handleLogin = async () => {
    try {
      // This calls our Spring Boot /login endpoint
      const response = await api.post('/login', {
        email: username,
        password: password
      });

      // We expect { "token": "...", "userId": "...", "role": "..." }
      const { token, userId, role } = response.data;

      // Check if the user has the "Operator" role
      if (role === "Operator") {
        setError(<>
          Permission Denied. Please try <a href="https://operator.parkwithparallel.com/login" target="_blank" rel="noopener noreferrer" style={{ color: '#ffbfbf' }}>Operator Portal</a>
        </>);
        return;
      }

      // Store them in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
      localStorage.setItem('role', role);
      localStorage.setItem('isAuthenticated', 'true');

      // Redirect, for example to /dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/assets/LogotypeSuperadmin.svg" alt="Logo" className="logo-superadmin" />
        <input
          type="text"
          placeholder="Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={handleLogin}>Login</button>
        {error && <p className="error">{error}</p>}
      </div>
      <footer className="powered-by">
        <img src="/assets/PoweredbyParallelDark.svg" alt="Powered by Parallel" />
      </footer>
    </div>
  );
};

export default Login;
