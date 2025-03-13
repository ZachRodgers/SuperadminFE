import axios from 'axios';
import React, { useState } from 'react';
import './Login.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:8085/ParkingWithParallel/users/login', {
        email: username,
        password: password
      });
      const token = response.data.token;
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
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
          placeholder="Username"
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
