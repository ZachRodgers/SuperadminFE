import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lotId } = useParams<{ lotId: string }>(); // Dynamically get the lotId from the URL

  const getActivePage = (): string | null => {
    if (location.pathname.includes('device-manager')) return 'device-manager';
    if (location.pathname.includes('vehicle-log')) return 'vehicle-log';
    if (location.pathname.includes('billing-calculator')) return 'billing-calculator';
    if (location.pathname.includes('customer')) return 'customer';
    return null;
  };

  const activePage = getActivePage();

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/assets/LogotypeSuperadmin.svg" alt="Parallel Superadmin Logo" />
      </div>
      <div className="device-id">{lotId}</div>
      <div className="back-button" onClick={() => navigate('/dashboard')}>
        <img src="/assets/BackArrow.svg" alt="Back Arrow" />
        <span>Back</span>
      </div>
      <ul className="menu">
        <li
          className={activePage === 'device-manager' ? 'active' : ''}
          onClick={() => navigate(`/lot/${lotId}/device-manager`)}
        >
          <a href="#">Device Manager</a>
        </li>
        <li
          className={activePage === 'vehicle-log' ? 'active' : ''}
          onClick={() => navigate(`/lot/${lotId}/vehicle-log`)}
        >
          <a href="#">Vehicle Log</a>
        </li>
        <li
          className={activePage === 'billing-calculator' ? 'active' : ''}
          onClick={() => navigate(`/lot/${lotId}/billing-calculator`)}
        >
          <a href="#">Billing Calculator</a>
        </li>
        <li
          className={activePage === 'customer' ? 'active' : ''}
          onClick={() => navigate(`/lot/${lotId}/customer`)}
        >
          <a href="#">Customer</a>
        </li>
      </ul>
      <div className="footer">
        <a href="#">🡥 Admin Portal</a>
        <a href="#">Send Message</a>
      </div>
    </div>
  );
};

export default Sidebar;
