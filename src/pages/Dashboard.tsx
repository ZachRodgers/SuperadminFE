import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import Notifications from '../components/Notifications';

// Updated endpoints
const LOTS_API_URL = 'http://localhost:8085/ParkingWithParallel/parkinglots';
const DEVICES_API_URL = 'http://localhost:8085/ParkingWithParallel/devices';

interface Lot {
  lotID: string;
  companyName: string;
  location: string;
  purchaseDate: string;
  adminPortal: string;
  accountStatus: string;
}

interface Device {
  deviceId: string;
  lotId: string;
  deviceType: string;
  isWifiRegistered: boolean;
  wifiNetworkName: string;
  wifiPassword: string;
  deviceStatus: string;
  lastActive: string;
  deviceTemp: number;
  createdOn: string;
  createdBy: string;
  modifiedOn: string;
  modifiedBy: string;
  isDeleted: boolean;
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'lotID', direction: 'ascending' });
  const [isNotificationsVisible, setNotificationsVisible] = useState(false);

  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Fetch lots from Spring Boot
  useEffect(() => {
    const fetchLots = async () => {
      try {
        const response = await fetch(LOTS_API_URL);
        if (!response.ok) {
          console.error('HTTP error', response.status);
          return;
        }
        const data = await response.json();
        // Map DB fields (lotId, address, createdOn, etc.) to our Lot interface
        const parsedLots: Lot[] = data.map((item: any) => ({
          lotID: item.lotId,
          companyName: item.companyName,
          location: item.address, // Using address as location
          purchaseDate: item.createdOn ? new Date(item.createdOn).toLocaleDateString() : 'N/A',
          adminPortal: 'https://google.ca', // Placeholder (if not stored in DB)
          accountStatus: item.accountStatus,
        }));
        setLots(parsedLots);
      } catch (error) {
        console.error('Error fetching lots:', error);
      }
    };

    fetchLots();
  }, []);

  // Fetch devices from Spring Boot
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(DEVICES_API_URL);
        if (!response.ok) {
          console.error('HTTP error', response.status);
          return;
        }
        const data = await response.json();
        // The endpoint returns an array of device objects
        setDevices(data);
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
    };

    fetchDevices();
  }, []);

  // Updated device status calculation for device objects
  const calculateDeviceStatus = (lotID: string): DeviceStatus => {
    const relevantDevices = devices.filter((device) => device.lotId === lotID);
    const onlineCount = relevantDevices.filter((device) => device.deviceStatus === 'Online').length;
    const offlineCount = relevantDevices.filter((device) =>
      device.deviceStatus === 'Offline' || device.deviceStatus === 'RecentlyAdded'
    ).length;
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
    .filter((lot) => {
      const normalizedSearch = normalizeString(searchQuery);
      if (normalizedSearch.includes('suspended')) {
        return normalizeString(
          `${lot.lotID} ${lot.companyName} ${lot.location} ${lot.purchaseDate} ${lot.accountStatus}`
        ).includes(normalizedSearch);
      }
      // Exclude suspended lots by default
      return (
        lot.accountStatus !== 'suspended' &&
        normalizeString(`${lot.lotID} ${lot.companyName} ${lot.location} ${lot.purchaseDate}`).includes(normalizedSearch)
      );
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
            <div className="icon-wrapper" onClick={toggleNotifications} ref={popupRef}>
              <img src="/assets/NotificationIcon.svg" alt="Notifications" className="icon" />
            </div>
            {isNotificationsVisible && <Notifications onClose={() => setNotificationsVisible(false)} />}
            <img src="/assets/MessageIcon.svg" alt="Messages" className="icon" />
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
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
                <th key={key} onClick={() => handleSort(key as keyof Lot)} className="sortable-column">
                  {key === 'purchaseDate' ? 'Purchased' : key.charAt(0).toUpperCase() + key.slice(1)}
                  <img
                    src={sortConfig.key === key ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                    alt="Sort Arrow"
                    className={`sort-arrow ${
                      sortConfig.key === key && sortConfig.direction === 'descending' ? 'descending' : ''
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
                        <span key={`device-${idx}`} className={`dot ${idx < online ? 'green' : 'red'}`}></span>
                      ))}
                    {additionalDevices > 0 && <span className="extra-devices">+{additionalDevices}</span>}
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
