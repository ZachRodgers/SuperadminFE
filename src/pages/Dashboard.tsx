import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import Notifications from '../components/Notifications'; // Import Notifications
import lotsData from '../data/Lots.json';

const DEVICES_API_URL = 'http://localhost:5000/devices';

interface Lot {
  lotID: string;
  companyName: string;
  location: string;
  purchaseDate: string;
  adminPortal: string;
  accountStatus: string;
}

interface DeviceStatus {
  online: number;
  offline: number;
  total: number;
}

interface SortConfig {
  key: keyof Lot | null;
  direction: 'ascending' | 'descending';
}

const Dashboard: React.FC = () => {
  const [lots, setLots] = useState<Lot[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lotID', direction: 'ascending' });
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);

  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parsedLots: Lot[] = lotsData.map((item: any) => ({
      lotID: item.lotID,
      companyName: item.companyName,
      location: item.location,
      purchaseDate: item.purchaseDate,
      adminPortal: item.adminPortal,
      accountStatus: item.accountStatus,
    }));

    setLots(parsedLots);
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(DEVICES_API_URL);
        const data = await response.json();
        setDevices(data.devices);
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
    };

    fetchDevices();
  }, []);

  const calculateDeviceStatus = (lotID: string): DeviceStatus => {
    const relevantDevices = devices.filter((device) => device.startsWith(`deviceID:${lotID}`));

    const onlineCount = relevantDevices.filter((device) => {
      const fields = Object.fromEntries(
        device.split(';').map((field) => {
          const [key, value] = field.split(':');
          return [key, value?.trim()];
        })
      );
      return fields.status === 'Online';
    }).length;

    const offlineCount = relevantDevices.filter((device) => {
      const fields = Object.fromEntries(
        device.split(';').map((field) => {
          const [key, value] = field.split(':');
          return [key, value?.trim()];
        })
      );
      return fields.status === 'Offline' || fields.status === 'RecentlyAdded';
    }).length;

    return { online: onlineCount, offline: offlineCount, total: relevantDevices.length };
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
  };

  const handleOpenLot = (lotID: string) => {
    navigate(`/lot/${lotID}/device-manager`);
  };

  const toggleNotifications = () => {
    setNotificationsVisible((prev) => !prev);
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setNotificationsVisible(false);
      }
    };

    if (isNotificationsVisible) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isNotificationsVisible]);

  const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/[-_]/g, ' ');
  };

  const filteredLots = lots
    .filter((lot) => lot.accountStatus !== 'suspended') // Exclude suspended lots
    .filter((lot) => {
      const normalizedData = normalizeString(
        `${lot.lotID} ${lot.companyName} ${lot.location} ${lot.purchaseDate}`
      );
      const normalizedSearch = normalizeString(searchQuery);
      return normalizedData.includes(normalizedSearch);
    })
    .sort((a, b) => {
      if (sortConfig.key) {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (sortConfig.direction === 'ascending') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      }
      return 0;
    });

  const handleSort = (key: keyof Lot) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <img src="/assets/LogotypeSuperAdminHorizontal.svg" alt="Logo" />
          </div>
          <div className="header-actions">
            <div
              className="icon-wrapper"
              onClick={toggleNotifications}
              ref={popupRef} // Attach ref to the container
            >
              <img src="/assets/NotificationIcon.svg" alt="Notifications" className="icon" />
            </div>
            {isNotificationsVisible && <Notifications onClose={() => setNotificationsVisible(false)} />}
            <img src="/assets/MessageIcon.svg" alt="Messages" className="icon" />
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>
      <div className="dashboard-content">
        <div className="search-bar">
          <img src="/assets/SearchBarIcon.svg" alt="Search" />
          <input
            type="text"
            placeholder="Search LotID, Company Name, Purchase Date or Location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <table className="dashboard-table">
          <thead>
            <tr>
              {['lotID', 'companyName', 'location', 'purchaseDate'].map((key) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof Lot)}
                  className="sortable-column"
                >
                  {key === 'purchaseDate' ? 'Purchased' : key.charAt(0).toUpperCase() + key.slice(1)}
                  <img
                    src={
                      sortConfig.key === key
                        ? '/assets/FilterArrowSelected.svg'
                        : '/assets/FilterArrow.svg'
                    }
                    alt="Sort Arrow"
                    className={`sort-arrow ${
                      sortConfig.key === key && sortConfig.direction === 'descending'
                        ? 'descending'
                        : ''
                    }`}
                  />
                </th>
              ))}
              <th>Devices</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {filteredLots.map((lot, index) => {
              const { online, offline, total } = calculateDeviceStatus(lot.lotID);
              const visibleDevices = 8;
              const additionalDevices = total - visibleDevices;

              return (
                <tr key={index} onClick={() => handleOpenLot(lot.lotID)}>
                  <td>{lot.lotID}</td>
                  <td>{lot.companyName}</td>
                  <td>{lot.location}</td>
                  <td>{lot.purchaseDate}</td>
                  <td>
                    {Array(Math.min(visibleDevices, total))
                      .fill(0)
                      .map((_, idx) => (
                        <span
                          key={`device-${idx}`}
                          className={`dot ${idx < online ? 'green' : 'red'}`}
                        ></span>
                      ))}
                    {additionalDevices > 0 && (
                      <span className="extra-devices">+{additionalDevices}</span>
                    )}
                  </td>
                  <td>
                    <a
                      href={lot.adminPortal}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      🡥 Open
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
