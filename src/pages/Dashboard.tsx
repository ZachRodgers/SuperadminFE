import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import Notifications from '../components/Notifications';
import AddLot from '../components/AddLot';
import { api, BASE_URL } from '../config/api';

const LOTS_API_URL = `${BASE_URL}/parkinglots/get-all`;
const DEVICES_API_URL = `${BASE_URL}/devices`;

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
  lot: {
    lotId: string;
  };
  deviceType: string;
  isWifiRegistered: boolean;
  wifiNetworkName: string;
  wifiPassword: string;
  deviceStatus: string;   // e.g. "Online", "Offline", "RecentlyAdded", "Calibrating"
  lastActive: string;
  deviceTemp: number;
  createdOn: string | null;
  createdBy: string | null;
  modifiedOn: string | null;
  modifiedBy: string | null;
  isDeleted: boolean;
}

interface DeviceStatusCounts {
  online: number;
  calibrating: number;
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
  const [showAddLotModal, setShowAddLotModal] = useState(false);
  const [showArchivedLots, setShowArchivedLots] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const popupRef = useRef<HTMLDivElement | null>(null);

  const formatLotId = (lotId: string): string => {
    // Only for display purposes, remove the PWP-PL- prefix
    const prefix = "PWP-PL-";
    if (lotId && lotId.startsWith(prefix)) {
      return lotId.substring(prefix.length);
    }
    return lotId;
  };

  // Format date strings consistently across the application
  // This matches the formatDate function in Customer.tsx to ensure dates
  // are displayed in the same format everywhere
  const formatDate = (isoDate: string): string => {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleString();
  };

  // Fetch lots from Spring Boot
  const fetchLots = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(LOTS_API_URL);
      if (!response.ok) {
        console.error('HTTP error', response.status);
        setIsLoading(false);
        return;
      }
      const data = await response.json();
      console.log('Fetched lots data:', data); // added logging for debugging

      // Map DB fields to our Lot interface
      // NOTE: The /parkinglots/get-all endpoint currently doesn't include createdOn field
      // Backend modification is needed to include this information
      const parsedLots: Lot[] = data.map((item: any) => ({
        lotID: item.lotId,
        companyName: item.companyName,
        location: item.address,
        purchaseDate: 'Loading...', // Show loading state while fetching details
        adminPortal: 'https://google.ca',
        accountStatus: item.accountStatus,
      }));
      setLots(parsedLots);
      console.log('Dashboard: Parsed lots:', parsedLots);

      // After getting the basic lot information, fetch detailed information for each lot
      fetchLotDetails(parsedLots);
    } catch (error) {
      console.error('Error fetching lots:', error);
      setIsLoading(false);
    }
  };

  // Fetch detailed information for each lot to get creation dates
  const fetchLotDetails = async (basicLots: Lot[]) => {
    try {
      const lotsWithDetails = [...basicLots];
      let updatedCount = 0;

      // Process lots in parallel with Promise.all
      await Promise.all(
        basicLots.map(async (lot, index) => {
          try {
            const detailResponse = await fetch(`${LOTS_API_URL.replace('/get-all', '')}/get-by-id/${lot.lotID}`);
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              if (detailData && detailData.createdOn) {
                lotsWithDetails[index] = {
                  ...lot,
                  purchaseDate: formatDate(detailData.createdOn)
                };
                updatedCount++;
              } else {
                lotsWithDetails[index] = {
                  ...lot,
                  purchaseDate: 'N/A'
                };
              }
            } else {
              lotsWithDetails[index] = {
                ...lot,
                purchaseDate: 'N/A'
              };
            }
          } catch (detailError) {
            console.warn(`Error fetching details for lot ${lot.lotID}:`, detailError);
            lotsWithDetails[index] = {
              ...lot,
              purchaseDate: 'N/A'
            };
          }
        })
      );

      console.log(`Updated creation dates for ${updatedCount} out of ${basicLots.length} lots`);
      setLots(lotsWithDetails);
    } catch (error) {
      console.error('Error fetching lot details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch devices from Spring Boot
  const fetchDevices = async () => {
    try {
      const response = await fetch(`${DEVICES_API_URL}/get-all`);
      if (!response.ok) {
        console.error('HTTP error', response.status);
        return;
      }
      const data = await response.json();
      setDevices(data);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  useEffect(() => {
    fetchLots();
    fetchDevices();
  }, []);

  const handleLotCreated = () => {
    setShowAddLotModal(false);
    fetchLots();
  };

  const calculateDeviceStatus = (lotID: string): DeviceStatusCounts => {
    const relevantDevices = devices.filter((device) => device.lot.lotId === lotID);
    const onlineCount = relevantDevices.filter((d) => d.deviceStatus === 'Online').length;
    const calibratingCount = relevantDevices.filter((d) => d.deviceStatus === 'Calibrating').length;
    const offlineCount = relevantDevices.filter((d) =>
      d.deviceStatus === 'Offline' || d.deviceStatus === 'RecentlyAdded'
    ).length;
    return {
      online: onlineCount,
      calibrating: calibratingCount,
      offline: offlineCount,
      total: relevantDevices.length,
    };
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  const handleOpenLot = (lotID: string) => {
    navigate(`/lot/${lotID}/device-manager`);
  };

  const toggleNotifications = () => {
    setNotificationsVisible((prev) => !prev);
  };

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

      // Show only archived lots when the checkbox is checked
      if (showArchivedLots) {
        return lot.accountStatus.toLowerCase() === 'archived' &&
          normalizeString(`${lot.lotID} ${lot.companyName} ${lot.location} ${lot.purchaseDate}`).includes(normalizedSearch);
      }

      // Default behavior: filter out suspended and archived lots
      if (normalizedSearch.includes('suspended')) {
        return normalizeString(
          `${lot.lotID} ${lot.companyName} ${lot.location} ${lot.purchaseDate} ${lot.accountStatus}`
        ).includes(normalizedSearch);
      }

      return (
        lot.accountStatus !== 'suspended' &&
        lot.accountStatus.toLowerCase() !== 'archived' &&
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
            {/* Notifications component */}
            {isNotificationsVisible && <Notifications onClose={() => setNotificationsVisible(false)} />}
            <img src="/assets/MessageIcon.svg" alt="Messages" className="icon" />
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div className="search-bar" style={{ flex: '4', display: 'flex', alignItems: 'center' }}>
            <img src="/assets/SearchBarIcon.svg" alt="Search" />
            <input
              type="text"
              placeholder="Search LotID, Company Name, Purchase Date or Location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <div className="archive-checkbox">
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  id="showArchived"
                  checked={showArchivedLots}
                  onChange={() => setShowArchivedLots(!showArchivedLots)}
                  className="hidden-checkbox"
                />
                <span
                  className={`checkbox-styler ${showArchivedLots ? 'checked' : ''}`}
                ></span>
                <span className="checkbox-label">Show Archived</span>
              </label>
            </div>
          </div>
          <button className="addlot-button" onClick={() => setShowAddLotModal(true)}>
            Add Lot
          </button>
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
                  <div className="header-content">
                    <span className="header-text">
                      {key === 'purchaseDate'
                        ? 'Purchased'
                        : key === 'companyName'
                          ? 'Company'
                          : key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <img
                      src={sortConfig.key === key ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                      alt="Sort Arrow"
                      className={`sort-arrow ${sortConfig.key === key && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                    />
                  </div>
                </th>
              ))}
              <th>
                <span className="header-text">Devices</span>
              </th>
              <th>
                <span className="header-text">Operator</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && filteredLots.length === 0 ? (
              <tr className="loading-indicator-row">
                <td colSpan={6} className="pulse-animation">
                  Loading lot data...
                </td>
              </tr>
            ) : filteredLots.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>
                  No lots found.
                </td>
              </tr>
            ) : (
              filteredLots.map((lot, index) => {
                const { online, calibrating, offline, total } = calculateDeviceStatus(lot.lotID);
                const visibleDevices = 8;
                const additionalDevices = total - visibleDevices;
                const dotsToRender = Array(Math.min(visibleDevices, total))
                  .fill(0)
                  .map((_, idx) => {
                    if (idx < online) {
                      return <span key={idx} className="dot green"></span>;
                    } else if (idx < online + calibrating) {
                      return <span key={idx} className="dot blue"></span>;
                    } else {
                      return <span key={idx} className="dot red"></span>;
                    }
                  });

                return (
                  <tr key={index} onClick={() => handleOpenLot(lot.lotID)}>
                    {/* Use our helper to display the formatted Lot ID */}
                    <td>{formatLotId(lot.lotID)}</td>
                    <td>{lot.companyName}</td>
                    <td>{lot.location}</td>
                    <td>{lot.purchaseDate}</td>
                    <td>
                      {dotsToRender}
                      {additionalDevices > 0 && <span className="extra-devices">+{additionalDevices}</span>}
                    </td>
                    <td>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Get the current token
                          const token = localStorage.getItem('token');
                          if (token) {
                            // Open operator portal with the lot ID and token
                            window.open(
                              `https://operator.parkwithparallel.com/lot/${lot.lotID}/revenue-dashboard?superadmin=true&token=${token}`,
                              "_blank"
                            );
                          } else {
                            alert("Your session has expired. Please log in again.");
                          }
                        }}
                      >
                        🡥 Open
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAddLotModal && (
        <AddLot
          existingLots={lots}
          onClose={() => setShowAddLotModal(false)}
          onLotAdded={handleLotCreated}
        />
      )}
    </div>
  );
};

export default Dashboard;
