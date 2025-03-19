import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './VehicleLog.css';
import './RefreshBar.css';

interface AlprData {
  alprId: string;
  deviceId: string;
  plateNumber: string;
  imageUrl: string;
  timestamp: string;
  lotId: string;
  confidence: number;
  status: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  deviceTemp: number;
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

const ALPR_API_URL = 'http://localhost:8085/ParkingWithParallel/alpr';
const DEVICES_API_URL = 'http://localhost:8085/ParkingWithParallel/devices';
const refreshInterval = 10000;

const VehicleLog: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const [alprEntries, setAlprEntries] = useState<AlprData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'ascending' });
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ plateNumber: '', timestamp: '', status: 'Enter' });
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
      const norm = `${entry.plateNumber} ${entry.status} ${entry.timestamp} ${entry.confidence}`.toLowerCase();
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
    const header = 'PlateNumber,Date,Time,Status,Confidence\n';
    const rows = filteredResults.map((e) => {
      const { date, time } = parseTimestamp(e.timestamp);
      return `${e.plateNumber},${date},${time},${e.status},${e.confidence}`;
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
    const { plateNumber, timestamp, status } = newEntry;
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
          imageUrl: '',
          timestamp: finalTimestamp,
          confidence: 101,
          status,
          vehicleType: 'manualentry',
          vehicleMake: '',
          vehicleModel: '',
          deviceTemp: 0,
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
      setNewEntry({ plateNumber: '', timestamp: '', status: 'Enter' });
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
    <div className="vehicle-log">
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
            placeholder="Search Plate, Date, State, Time or Confidence"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <button className="download-button" onClick={handleDownload}>
          Download as Sheet
        </button>

        <button className="download-button" onClick={() => setShowModal(true)} style={{ marginRight: '0' }}>
          Add Manual Entry
        </button>
      </div>

      <table className="vehicle-log-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('plateNumber')} className="sortable-column">
              Plate
              <img
                src={sortConfig.key === 'plateNumber' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                alt="Sort Arrow"
                className={
                  sortConfig.key === 'plateNumber' && sortConfig.direction === 'descending'
                    ? 'sort-arrow descending'
                    : 'sort-arrow'
                }
              />
            </th>
            <th onClick={() => handleSort('timestamp')} className="sortable-column">
              Date
              <img
                src={sortConfig.key === 'timestamp' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                alt="Sort Arrow"
                className={
                  sortConfig.key === 'timestamp' && sortConfig.direction === 'descending'
                    ? 'sort-arrow descending'
                    : 'sort-arrow'
                }
              />
            </th>
            <th onClick={() => handleSort('time')} className="sortable-column">
              Time
              <img
                src={sortConfig.key === 'time' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                alt="Sort Arrow"
                className={
                  sortConfig.key === 'time' && sortConfig.direction === 'descending'
                    ? 'sort-arrow descending'
                    : 'sort-arrow'
                }
              />
            </th>
            <th onClick={() => handleSort('status')} className="sortable-column">
              State
              <img
                src={sortConfig.key === 'status' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                alt="Sort Arrow"
                className={
                  sortConfig.key === 'status' && sortConfig.direction === 'descending'
                    ? 'sort-arrow descending'
                    : 'sort-arrow'
                }
              />
            </th>
            <th onClick={() => handleSort('confidence')} className="sortable-column">
              Confidence
              <img
                src={sortConfig.key === 'confidence' ? '/assets/FilterArrowSelected.svg' : '/assets/FilterArrow.svg'}
                alt="Sort Arrow"
                className={
                  sortConfig.key === 'confidence' && sortConfig.direction === 'descending'
                    ? 'sort-arrow descending'
                    : 'sort-arrow'
                }
              />
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
                <td>{entry.status}</td>
                <td>{entry.confidence}%</td>
                <td>
                  <img
                    src={entry.imageUrl ? entry.imageUrl : '/assets/PlatePlaceholder.jpg'}
                    alt="Vehicle Placeholder"
                    className="vehicle-placeholder"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="clear-all-container">
        <button className="clear-all-button" onClick={() => setShowClearConfirmModal(true)}>
          Clear All
        </button>
      </div>

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

            <label>State:</label>
            <select
              value={newEntry.status}
              onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
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
