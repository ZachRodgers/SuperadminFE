import React, { useState, useEffect, useRef } from 'react';
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
  laneType: string;
  distanceChange: number;
  vehicleColour: string;
  vehicleColourConfidence: number;
  plateColour: string;
  plateCharacterColour: string;
  vehicleView: string;
  vehicleViewConfidence: number;
  fullImage: string;
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
const refreshInterval = 100000000;

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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'descending' });
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    plateNumber: '',
    timestamp: '',
    region: 'Test',
    vehicleStatus: 'Enter'
  });
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isTableNarrow, setIsTableNarrow] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AlprData | null>(null);

  // Check table width on resize
  useEffect(() => {
    const checkTableWidth = () => {
      if (tableRef.current) {
        setIsTableNarrow(tableRef.current.offsetWidth < 600);
      }
    };

    // Initial check
    checkTableWidth();

    // Add resize listener
    window.addEventListener('resize', checkTableWidth);

    // Cleanup
    return () => window.removeEventListener('resize', checkTableWidth);
  }, []);

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
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Format date based on whether it's today, yesterday, or another day
    let date;
    if (d.toDateString() === now.toDateString()) {
      date = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      date = 'Yesterday';
    } else {
      // Format as M-D-Y with only last 2 digits of year
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const year = d.getFullYear().toString().slice(-2); // Get only last 2 digits of year
      date = `${month}-${day}-${year}`;
    }

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
    const header = 'PlateNumber,Date,Time,VehicleState,Confidence,VehicleMake,VehicleModel,VehicleStatus,LaneType,DistanceChange,VehicleColour,VehicleColourConfidence,PlateColour,PlateCharacterColour,VehicleRegion,VehicleView,VehicleViewConfidence\n';
    const rows = filteredResults.map((e) => {
      const { date, time } = parseTimestamp(e.timestamp);
      return `${e.plateNumber},${date},${time},${e.vehicleState || ''},${e.confidence},${e.vehicleMake || ''},${e.vehicleModel || ''},${e.vehicleStatus || ''},${e.laneType || ''},${e.distanceChange || ''},${e.vehicleColour || ''},${e.vehicleColourConfidence || ''},${e.plateColour || ''},${e.plateCharacterColour || ''},${e.vehicleRegion || ''},${e.vehicleView || ''},${e.vehicleViewConfidence || ''}`;
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

    if (sortConfig.key === key) {
      // If already sorting by this key, toggle direction
      if (sortConfig.direction === 'ascending') {
        direction = 'descending';
      } else {
        direction = 'ascending';
      }
    } else if (key === 'timestamp') {
      // Default to descending (newest first) for timestamp
      direction = 'descending';
    }

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
          deviceId: chosenDevice.deviceId,
          lotId: lotId,
          laneType: vehicleStatus, // Using vehicleStatus (Enter/Exit) as laneType
          distanceChange: 2,
          timestamp: finalTimestamp,
          plateNumber,
          confidence: 101,
          vehicleMake: 'N/A',
          vehicleModel: 'N/A',
          vehicleMakeModelConfidence: 0,
          vehicleColour: 'N/A',
          vehicleColourConfidence: 0,
          plateColour: 'N/A',
          plateCharacterColour: 'N/A',
          vehicleState: region,
          vehicleStateConfidence: 0,
          vehicleRegion: 'N/A',
          vehicleView: 'N/A',
          vehicleViewConfidence: 0
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
        region: 'Test',
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

  // Show detail modal when a row is clicked
  const handleRowClick = (entry: AlprData) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  // Close detail modal when clicking outside
  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedEntry(null);
  };

  return (
    <div className={`vehicle-log ${alprEntries.length > 0 ? 'has-data' : ''}`}>
      <div className="refresh-bar-wrapper">
        <div className="refresh-bar">
          <div className="refresh-bar-fill" style={{ width: `${refreshProgress}%` }}></div>
        </div>
        <div className="refresh-text" onClick={handleManualRefresh}>
          {refreshProgress < 100 ? 'Refresh' : 'Manual Refresh'}
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

      <table
        ref={tableRef}
        className={`vehicle-log-table ${alprEntries.length > 0 ? 'has-data' : ''}`}
      >
        <thead>
          <tr>
            <th onClick={() => handleSort('plateNumber')} className="sortable-column" style={{ minWidth: '100px' }}>
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
            <th>
              <div className="vehicle-log-header-content">
                <span className="vehicle-log-header-text">Time</span>
              </div>
            </th>
            {!isTableNarrow && (
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
            )}
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
          </tr>
        </thead>
        <tbody>
          {filteredResults.map((entry, index) => {
            const { date, time } = parseTimestamp(entry.timestamp);
            return (
              <tr 
                key={entry.alprId || index} 
                style={{ backgroundColor: index % 2 === 0 ? '#363941' : '#2B2E35' }}
                onClick={() => handleRowClick(entry)}
                className="clickable-row"
              >
                <td style={{ overflow: 'visible', textOverflow: 'clip', whiteSpace: 'nowrap', minWidth: '100px' }}>{entry.plateNumber}</td>
                <td>{date}</td>
                <td>{time}</td>
                {!isTableNarrow && (
                  <td>{extractStateFromVehicleState(entry.vehicleState)}</td>
                )}
                <td>{entry.vehicleStatus || 'Unknown'}</td>
                <td>{entry.confidence}%</td>
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
              placeholder="Ottawa, Florida, etc."
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

      {showDetailModal && selectedEntry && (
        <div className="modal-overlay" onClick={handleDetailModalClose}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Vehicle Details</h2>
            <div className="detail-grid">
              <div className="detail-column">
                <div className="detail-item">
                  <span className="detail-label">ALPR ID:</span>
                  <span className="detail-value">{selectedEntry.alprId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Device ID:</span>
                  <span className="detail-value">{selectedEntry.device?.deviceId || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Lot ID:</span>
                  <span className="detail-value">{selectedEntry.lot?.lotId || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Plate Number:</span>
                  <span className="detail-value">{selectedEntry.plateNumber}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Timestamp:</span>
                  <span className="detail-value">{new Date(selectedEntry.timestamp).toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Lane Type:</span>
                  <span className="detail-value">{selectedEntry.laneType || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Distance Change:</span>
                  <span className="detail-value">{selectedEntry.distanceChange || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Status:</span>
                  <span className="detail-value">{selectedEntry.vehicleStatus || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Confidence:</span>
                  <span className="detail-value">{selectedEntry.confidence}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Make:</span>
                  <span className="detail-value">{selectedEntry.vehicleMake || 'N/A'}</span>
                </div>
              </div>
              <div className="detail-column">
                <div className="detail-item">
                  <span className="detail-label">Vehicle Model:</span>
                  <span className="detail-value">{selectedEntry.vehicleModel || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Make/Model Confidence:</span>
                  <span className="detail-value">{selectedEntry.vehicleMakeModelConfidence || 'N/A'}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Color:</span>
                  <span className="detail-value">{selectedEntry.vehicleColour || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Color Confidence:</span>
                  <span className="detail-value">{selectedEntry.vehicleColourConfidence || 'N/A'}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Plate Color:</span>
                  <span className="detail-value">{selectedEntry.plateColour || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Plate Character Color:</span>
                  <span className="detail-value">{selectedEntry.plateCharacterColour || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle State:</span>
                  <span className="detail-value">{selectedEntry.vehicleState || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">State Confidence:</span>
                  <span className="detail-value">{selectedEntry.vehicleStateConfidence || 'N/A'}%</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Region:</span>
                  <span className="detail-value">{selectedEntry.vehicleRegion || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle View:</span>
                  <span className="detail-value">{selectedEntry.vehicleView || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">View Confidence:</span>
                  <span className="detail-value">{selectedEntry.vehicleViewConfidence || 'N/A'}%</span>
                </div>
              </div>
            </div>
            {selectedEntry.fullImage && (
              <div className="detail-image">
                <img src={selectedEntry.fullImage} alt="Vehicle" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleLog;
