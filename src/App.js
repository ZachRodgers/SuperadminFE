import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DeviceManager from './pages/DeviceManager';
import VehicleLog from './pages/VehicleLog';
import BillingCalculator from './pages/BillingCalculator';
import Customer from './pages/Customer';
import Sidebar from './components/Sidebar';
import './App.css';

const App = () => {
  const isAuthenticated = localStorage.getItem('isAuthenticated');

  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Login Route */}
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
          />

          {/* Dashboard Route */}
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />

          {/* Lot Routes */}
          <Route
            path="/lot/:lotId/*"
            element={
              isAuthenticated ? (
                <div className="content-wrapper">
                  <Sidebar />
                  <div className="content">
                    <Routes>
                      <Route path="device-manager" element={<DeviceManager />} />
                      <Route path="vehicle-log" element={<VehicleLog />} />
                      <Route path="billing-calculator" element={<BillingCalculator />} />
                      <Route path="customer" element={<Customer />} />
                    </Routes>
                  </div>
                </div>
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Default Route */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
