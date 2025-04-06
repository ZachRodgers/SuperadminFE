import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './VehicleLog.css';
import './RefreshBar.css';
import { BASE_URL } from '../config/api';

interface AlprData {
  alprId: string;
  device: {
    deviceId: string;
  };
  lot: {
    lotId: string;
  };
  plateNumber: string;
  timestamp: string;
  confidence: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleMakeModelConfidence: number;
  vehicleState: string;
  vehicleStateConfidence: number;
  vehicleRegion: string;
  vehicleStatus: string;
}

interface Device {
  deviceId: string;
  lot: {
    lotId: string;
  };
  deviceType: string;
  deviceStatus: string;
}

interface SortConfig {
  key: keyof AlprData | 'time' | null;
  direction: 'ascending' | 'descending';
}

const ALPR_API_URL = `${BASE_URL}/alpr`;
const DEVICES_API_URL = `${BASE_URL}/devices`;
const refreshInterval = 10000000;

// Helper function to extract just the state/province name from the vehicleState
const extractStateFromVehicleState = (vehicleState: string | undefined): string => {
  if (!vehicleState) return 'Unknown';

  // Check if the format is "Country - State"
  const dashIndex = vehicleState.indexOf(' - ');
  if (dashIndex !== -1) {
    return vehicleState.substring(dashIndex + 3).trim();
  }

  return vehicleState;
};

const VehicleLog: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const [alprEntries, setAlprEntries] = useState<AlprData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'ascending' });
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    plateNumber: '',
    timestamp: '',
    region: 'Western US',
    vehicleStatus: 'Enter'
  });
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);

  // Fetch ALPR data
  useEffect(() => {
    if (lotId) {
      fetchAlprData();
      fetchDevicesForLot();
    }
  }, [lotId]);

  // Refresh bar
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshProgress((prev) => (prev >= 100 ? 0 : prev + 100 / (refreshInterval / 100)));
      if (refreshProgress >= 100) fetchAlprData();
    }, 100);
    return () => clearInterval(interval);
  }, [refreshProgress]);

  const fetchAlprData = async () => {
    try {
      const response = await fetch(`${ALPR_API_URL}/get-alpr-by-lot-id/${lotId}`);
      if (!response.ok) throw new Error('Error fetching ALPR data');
      const data: AlprData[] = await response.json();
      // Sort by timestamp (newest first)
      const sortedEntries = data.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setAlprEntries(sortedEntries);
      setRefreshProgress(0);
    } catch (error) {
      console.error(error);
      setAlprEntries([]);
    }
  };

  // Fetch devices for the current lot
  const fetchDevicesForLot = async () => {
    try {
      const response = await fetch(`${DEVICES_API_URL}/get-by-lot/${lotId}`);
      if (!response.ok) throw new Error('Error fetching devices');
      const lotDevices: Device[] = await response.json();
      // Sort by deviceId alphabetically
      lotDevices.sort((a, b) => a.deviceId.localeCompare(b.deviceId));
      setDevices(lotDevices);
    } catch (err) {
      console.error('Error fetching devices for lot:', err);
      setDevices([]);
    }
  };

  // Basic search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  // Format date/time
  const parseTimestamp = (ts: string) => {
    const d = new Date(ts);
    const date = d.toISOString().split('T')[0];
    const time = d.toLocaleTimeString('en-US', { hour12: false });
    return { date, time };
  };

  // Sorting
  const filteredResults = alprEntries
    .filter((entry) => {
      const norm = `${entry.plateNumber} ${entry.vehicleState} ${entry.timestamp} ${entry.confidence} ${entry.vehicleRegion} ${entry.vehicleStatus}`.toLowerCase();
      return norm.includes(searchQuery);
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortConfig.key === 'timestamp') {
        aVal = new Date(a.timestamp).toISOString();
        bVal = new Date(b.timestamp).toISOString();
      } else if (sortConfig.key === 'time') {
        aVal = new Date(a.timestamp).toLocaleTimeString('en-US', { hour12: false });
        bVal = new Date(b.timestamp).toLocaleTimeString('en-US', { hour12: false });
      } else {
        aVal = (a as any)[sortConfig.key];
        bVal = (b as any)[sortConfig.key];
      }

      if (sortConfig.direction === 'ascending') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

  const handleManualRefresh = () => {
    fetchAlprData();
    setRefreshProgress(0);
  };

  // CSV Download
  const handleDownload = () => {
    const header = 'PlateNumber,Date,Time,VehicleState,Confidence,VehicleMake,VehicleModel,Region,Status\n';
    const rows = filteredResults.map((e) => {
      const { date, time } = parseTimestamp(e.timestamp);
      return `${e.plateNumber},${date},${time},${e.vehicleState || ''},${e.confidence},${e.vehicleMake || ''},${e.vehicleModel || ''},${e.vehicleRegion || ''},${e.vehicleStatus || ''}`;
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'VehicleLog.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (key: keyof AlprData | 'time') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  // Generate next ALPR ID
  const computeNextAlprId = (): string => {
    let maxNum = 0;
    for (const e of alprEntries) {
      const match = e.alprId?.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const nextNum = (maxNum + 1).toString().padStart(6, '0');
    return `PWP-ALPR-${nextNum}`;
  };

  const handleAddEntry = async () => {
    const { plateNumber, timestamp, region, vehicleStatus } = newEntry;
    if (!plateNumber) {
      alert('Please fill Plate Number');
      return;
    }

    // If no time, use now
    const now = new Date();
    // Format the date to include timezone offset
    const finalTimestamp = timestamp
      ? new Date(timestamp).toISOString()
      : now.toISOString();

    // Get the first available device for this lot
    const chosenDevice = devices.find(d => d.lot.lotId === lotId);
    if (!chosenDevice) {
      alert('No devices available for this lot. Please add a device first.');
      return;
    }

    const nextId = computeNextAlprId();

    try {
      const response = await fetch(`${ALPR_API_URL}/create-alpr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alprId: nextId,
          device: {
            deviceId: chosenDevice.deviceId
          },
          lot: {
            lotId: lotId
          },
          plateNumber,
          timestamp: finalTimestamp,
          confidence: 101,
          vehicleMake: 'Manual Entry',
          vehicleModel: 'Manual Entry',
          vehicleMakeModelConfidence: 101,
          vehicleState: region,
          vehicleStateConfidence: 101,
          vehicleRegion: 'Manual Entry',
          vehicleStatus
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message?.includes('DEVICE00002')) {
          alert('Device not found. Please try again or contact support.');
        } else if (errorData.message?.includes('LOT00001')) {
          alert('Lot not found. Please try again or contact support.');
        } else {
          alert('Error adding entry: ' + errorData.message);
        }
        return;
      }

      fetchAlprData();
      setShowModal(false);
      setNewEntry({
        plateNumber: '',
        timestamp: '',
        region: 'Western US',
        vehicleStatus: 'Enter'
      });
    } catch (error) {
      console.error(error);
      alert('Error adding entry. Please try again or contact support.');
    }
  };

  const handleClearAll = async () => {
    try {
      const response = await fetch(`${ALPR_API_URL}/delete-all-by-lot/${lotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message?.includes('LOT00001')) {
          alert('Lot not found. Please try again or contact support.');
        } else {
          alert('Failed to clear ALPR data: ' + errorData.message);
        }
        return;
      }

      // Refresh the data after clearing
      fetchAlprData();
      setShowClearConfirmModal(false);
    } catch (error) {
      console.error('Error clearing ALPR data:', error);
      alert('Failed to clear ALPR data. Please try again or contact support.');
    }
  };

  return (
    <div className={`vehicle-log ${alprEntries.length > 0 ? 'has-data' : ''}`}>
      <div className="refresh-bar-wrapper">
        <div className="refresh-bar">
          <div className="refresh-bar-fill" style={{ width: `${refreshProgress}%` }}></div>
        </div>
        <div className="refresh-text" onClick={handleManualRefresh}>
          {refreshProgress < 100 ? 'Refreshing...' : 'Manual Refresh'}
        </div>
      </div>

      <h1>Vehicle Log</h1>

      <div className="search-and-download">
        <div className="search-bar">
          <img src="/assets/SearchBarIcon.svg" alt="Search" />
          <input
            type="text"
            placeholder="Search Plate, Date, Region, Confidence"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <button className="download-button" onClick={handleDownload}>
          <span className="button-text">
            <span className="full-text">Download as Sheet</span>
            <span className="short-text">Download</span>
          </span>
        </button>

        <button className="download-button" onClick={() => setShowModal(true)} style={{ marginRight: '0' }}>
          <span className="button-text">
            <span className="full-text">Add Manual Entry</span>
            <span className="short-text">+ Entry</span>
          </span>
        </button>
      </div>

      <table className={`vehicle-log-table ${alprEntries.length > 0 ? 'has-data' : ''}`}>
        <thead>
          <tr>
            <th onClick={() => handleSort('plateNumber')} className="sortable-column">
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Plate</span>
                <img
                  src={sortConfig.key === 'plateNumber' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                  alt="Sort Arrow"
                  className={`vehicle-log-sort-arrow ${sortConfig.key === 'plateNumber' && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                />
              </div>
            </th>
            <th onClick={() => handleSort('timestamp')} className="sortable-column">
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Date</span>
                <img
                  src={sortConfig.key === 'timestamp' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                  alt="Sort Arrow"
                  className={`vehicle-log-sort-arrow ${sortConfig.key === 'timestamp' && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                />
              </div>
            </th>
            <th onClick={() => handleSort('time')} className="sortable-column">
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Time</span>
                <img
                  src={sortConfig.key === 'time' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                  alt="Sort Arrow"
                  className={`vehicle-log-sort-arrow ${sortConfig.key === 'time' && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                />
              </div>
            </th>
            <th onClick={() => handleSort('vehicleState')} className="sortable-column">
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Region</span>
                <img
                  src={sortConfig.key === 'vehicleState' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                  alt="Sort Arrow"
                  className={`vehicle-log-sort-arrow ${sortConfig.key === 'vehicleState' && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                />
              </div>
            </th>
            <th onClick={() => handleSort('vehicleStatus')} className="sortable-column">
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Status</span>
                <img
                  src={sortConfig.key === 'vehicleStatus' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                  alt="Sort Arrow"
                  className={`vehicle-log-sort-arrow ${sortConfig.key === 'vehicleStatus' && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                />
              </div>
            </th>
            <th onClick={() => handleSort('confidence')} className="sortable-column">
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Confidence</span>
                <img
                  src={sortConfig.key === 'confidence' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                  alt="Sort Arrow"
                  className={`vehicle-log-sort-arrow ${sortConfig.key === 'confidence' && sortConfig.direction === 'descending' ? 'descending' : ''}`}
                />
              </div>
            </th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {filteredResults.map((entry, index) => {
            const { date, time } = parseTimestamp(entry.timestamp);
            return (
              <tr key={entry.alprId || index} style={{ backgroundColor: index % 2 === 0 ? '#363941' : '#2B2E35' }}>
                <td>{entry.plateNumber}</td>
                <td>{date}</td>
                <td>{time}</td>
                <td>{extractStateFromVehicleState(entry.vehicleState)}</td>
                <td>{entry.vehicleStatus || 'Unknown'}</td>
                <td>{entry.confidence}%</td>
                <td>
                  <img
                    src="/assets/PlatePlaceholder.jpg"
                    alt="Vehicle Placeholder"
                    className="vehicle-placeholder"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredResults.length === 0 ? (
        <div className="no-data-container">
          <h3 className="no-results-header">No Results Found</h3>
          <p>This lot has no ALPR Data available</p>
        </div>
      ) : (
        <div className="clear-all-container">
          <button className="clear-all-button" onClick={() => setShowClearConfirmModal(true)}>
            Clear All
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add Manual Entry</h2>

            <label>Plate Number:</label>
            <input
              type="text"
              value={newEntry.plateNumber}
              onChange={(e) => setNewEntry({ ...newEntry, plateNumber: e.target.value })}
            />

            <label>Date/Time:</label>
            <input
              type="datetime-local"
              value={newEntry.timestamp}
              onChange={(e) => setNewEntry({ ...newEntry, timestamp: e.target.value })}
            />

            <label>Region:</label>
            <input
              type="text"
              value={newEntry.region}
              onChange={(e) => setNewEntry({ ...newEntry, region: e.target.value })}
              placeholder="Western US, Eastern US, etc."
            />

            <label>Status:</label>
            <select
              value={newEntry.vehicleStatus}
              onChange={(e) => setNewEntry({ ...newEntry, vehicleStatus: e.target.value })}
            >
              <option value="Enter">Enter</option>
              <option value="Exit">Exit</option>
            </select>

            <div className="button-group">
              <button className="submit-button" onClick={handleAddEntry}>
                {newEntry.timestamp ? 'Send' : 'Send (Current Time)'}
              </button>
              <button className="cancel-button" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Clear All ALPR Data</h2>
            <p>Are you sure you want to delete all ALPR data for this lot? This action cannot be undone.</p>

            <div className="button-group">
              <button className="submit-button" onClick={handleClearAll}>
                Clear All
              </button>
              <button className="cancel-button" onClick={() => setShowClearConfirmModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleLog;
