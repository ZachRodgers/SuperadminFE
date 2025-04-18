import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import './DeviceManager.css';
import './RefreshBar.css';
import { BASE_URL } from '../config/api';

// Points to your new device endpoints (DevicesController).
const DEVICES_API_URL = `${BASE_URL}/devices`;
const DEVICES_BY_LOT_URL = `${DEVICES_API_URL}/get-by-lot`;
const DEVICES_CREATE_URL = `${DEVICES_API_URL}/create`;
const DEVICES_DELETE_URL = `${DEVICES_API_URL}/permanent-delete`;

// Refresh bar constants
const REFRESH_INTERVAL_MS = 100000000;
const PROGRESS_UPDATE_MS = 100000;    //10 seconds update progress bar every 100ms
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

// Matches your /devices schema from Swagger
interface Device {
  deviceId: string;
  lot: {
    lotId: string;
  };
  deviceType: string;
  isWifiRegistered: boolean;
  wifiNetworkName: string;
  wifiPassword: string;
  deviceStatus: string;   // e.g. "Online", "Offline", "RecentlyAdded", ...
  lastActive: string;
  deviceTemp: number;
  createdOn: string | null;
  createdBy: string | null;
  modifiedOn: string | null;
  modifiedBy: string | null;
  isDeleted: boolean;
}

// Internally for easier rendering
interface ParsedDevice {
  id: string;
  statusText: string;       // e.g. "Online 32°C" or "Offline"
  updatedText: string;      // e.g. "Recently Added • 3 mins ago"
  network: string;
  isOnline: boolean;
  colorClass: 'online' | 'calibrating' | 'offline';
}

const DeviceManager: React.FC = () => {
  // URL param: /lot/:lotId/device-manager
  const { lotId } = useParams<{ lotId: string }>();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'add' | 'remove' | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [nextDeviceId, setNextDeviceId] = useState<string | null>(null);

  // Auto-refresh progress bar
  const [progress, setProgress] = useState(0);

  // 1) Fetch devices on mount
  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Auto-refresh using the progress bar
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Time to fetch
          fetchDevices();
          return 0;
        }
        // step so we reach 100% in REFRESH_INTERVAL_MS
        const step = 100 / (REFRESH_INTERVAL_MS / PROGRESS_UPDATE_MS);
        return prev + step;
      });
    }, PROGRESS_UPDATE_MS);

    return () => clearInterval(timer);
  }, [progress]);

  // Format lot ID by removing the prefix if present
  const formatLotId = (lotId: string): string => {
    const prefix = "PWP-PL-";
    if (lotId.startsWith(prefix)) {
      return lotId.substring(prefix.length);
    }
    return lotId;
  };

  // Format device ID by removing the prefix if present
  const formatDeviceId = (deviceId: string): string => {
    const prefix = "PWP-D-";
    if (deviceId.startsWith(prefix)) {
      return deviceId.substring(prefix.length);
    }
    return deviceId;
  };

  // GET /devices => filter by lotId
  const fetchDevices = async () => {
    if (!lotId) return; // if no lotId in the URL, skip
    try {
      // Use the get-by-lot endpoint with the lot ID
      const response = await fetch(`${DEVICES_BY_LOT_URL}/${lotId}`);
      if (!response.ok) {
        console.error('Failed to fetch devices. Status:', response.status);
        return;
      }
      const devices: Device[] = await response.json();
      setDevices(devices);
      calculateNextDeviceId(devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  // Figure out the next deviceId by trying lotId+'a', lotId+'b', ...
  const calculateNextDeviceId = (lotDevices: Device[]) => {
    if (!lotId) {
      setNextDeviceId(null);
      return;
    }
    // Get existing IDs without their prefixes for comparison
    const existingIds = lotDevices.map(d => formatDeviceId(d.deviceId));
    // Use the formatted lot ID (without prefix) for the next device ID
    const formattedLotId = formatLotId(lotId);
    for (let i = 0; i < ALPHABET.length; i++) {
      const candidate = `${formattedLotId}${ALPHABET[i]}`;
      if (!existingIds.includes(candidate)) {
        setNextDeviceId(candidate);
        return;
      }
    }
    // all letters used up
    setNextDeviceId(null);
  };

  // Manual refresh if user clicks the "Refreshing..." text
  const handleManualRefresh = () => {
    fetchDevices();
    setProgress(0);
  };

  // POST /devices => add a new device
  const handleAddDevice = async () => {
    if (!nextDeviceId || !lotId) {
      console.error('No next device ID or missing lotId');
      return;
    }
    const now = new Date().toISOString();
    // Add back the prefix for the backend
    const deviceIdWithPrefix = `PWP-D-${nextDeviceId}`;
    const newDevice: Device = {
      deviceId: deviceIdWithPrefix,
      lot: {  // Send the lot object instead of just lotId
        lotId: lotId
      },
      deviceType: 'ALPR',
      isWifiRegistered: false,
      wifiNetworkName: 'N/A',
      wifiPassword: 'N/A',
      deviceStatus: 'RecentlyAdded',
      lastActive: now,
      deviceTemp: 0,
      createdOn: now,
      createdBy: 'superadmin', // or from localStorage
      modifiedOn: null,
      modifiedBy: null,
      isDeleted: false
    };
    try {
      const resp = await fetch(DEVICES_CREATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDevice),
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Error adding device:', errorText);
      } else {
        // refresh list
        fetchDevices();
      }
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  // DELETE /devices/{deviceId}
  const handleRemoveDevice = async (deviceId: string) => {
    try {
      // Add back the prefix for the backend
      const deviceIdWithPrefix = `PWP-D-${deviceId}`;
      // Use the permanent delete endpoint with the correct path variable name
      const resp = await fetch(`${DEVICES_DELETE_URL}/${deviceIdWithPrefix}`, {
        method: 'DELETE'
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('Failed to remove device:', errorText);
      } else {
        // refresh
        fetchDevices();
      }
    } catch (error) {
      console.error('Error removing device:', error);
    }
  };

  // Modal openers
  const openAddModal = () => {
    setModalAction('add');
    setIsModalOpen(true);
  };
  const openRemoveModal = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setModalAction('remove');
    setIsModalOpen(true);
  };

  // Modal "confirm" => calls add or remove
  const handleConfirmModal = () => {
    if (modalAction === 'add') {
      handleAddDevice();
    } else if (modalAction === 'remove' && selectedDeviceId) {
      handleRemoveDevice(selectedDeviceId);
    }
    setIsModalOpen(false);
  };
  const handleCancelModal = () => setIsModalOpen(false);

  // Utility: how long ago was lastActive
  const getRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return 'No activity';
    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHr / 24);

    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} mins ago`;
    if (diffHr < 24) return `${diffHr} hours ago`;
    if (diffDays <= 7) return `${diffDays} days ago`;
    // fallback: e.g. "September 18, 2:12 PM"
    return parsedDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Convert from raw Device -> info for rendering
  const parseDevice = (device: Device): ParsedDevice => {
    const { deviceId, deviceStatus, deviceTemp, wifiNetworkName, lastActive } = device;

    let colorClass: 'online' | 'calibrating' | 'offline' = 'offline';
    if (deviceStatus === 'Online') colorClass = 'online';
    else if (deviceStatus === 'Calibrating') colorClass = 'calibrating';
    else if (deviceStatus === 'RecentlyAdded') {
      colorClass = 'offline'; // treat as offline color
    }

    // status text
    let statusText = deviceStatus;
    if (deviceStatus === 'Online' && deviceTemp !== 0) {
      statusText = `Online ${deviceTemp}°C`;
    } else if (deviceStatus === 'RecentlyAdded') {
      // We display "Offline" but keep deviceStatus for color
      statusText = 'Offline';
    }

    // updated text
    let updatedText = getRelativeTime(lastActive);
    if (deviceStatus === 'RecentlyAdded') {
      updatedText = `Recently Added • ${updatedText}`;
    }

    return {
      id: formatDeviceId(deviceId),
      statusText,
      updatedText,
      network: wifiNetworkName,
      isOnline: deviceStatus === 'Online',
      colorClass
    };
  };

  return (
    <div className="device-manager">
      {/* Refresh bar */}
      <div className="refresh-bar-wrapper">
        <div className="refresh-bar">
          <div className="refresh-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="refresh-text" onClick={handleManualRefresh}>
          Refresh
        </div>
      </div>

      <h1>Device Manager</h1>

      <div className="device-list">
        {devices
          .sort((a, b) => formatDeviceId(a.deviceId).localeCompare(formatDeviceId(b.deviceId)))
          .map((device, idx) => {
            const parsed = parseDevice(device);
            return (
              <div
                key={parsed.id}
                className={`device ${parsed.colorClass}`}
                style={{
                  backgroundColor: idx % 2 === 0 ? '#363941' : '#2B2E35',
                }}
              >
                <div className="device-info">
                  <h2>{parsed.id}</h2>
                  <p className="status">{parsed.statusText}</p>
                  <p className="updated">{parsed.updatedText}</p>
                </div>
                <div className="device-actions">
                  <div className="action">
                    <button disabled={!parsed.isOnline}>
                      <img src="/assets/power.svg" alt="Shutdown Icon" />
                    </button>
                    <span>Shutdown</span>
                  </div>
                  <div className="action">
                    <button disabled={!parsed.isOnline}>
                      <img src="/assets/reboot.svg" alt="Reboot Icon" />
                    </button>
                    <span>Reboot</span>
                  </div>
                </div>
                <div className="network-info">
                  <p>
                    Network
                    <br />
                    <a
                      href={`http://${parsed.network}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ip-link"
                      >
                  {parsed.network}
                  </a>
                  </p>
                </div>
                <div className="remove-device">
                  <button onClick={() => openRemoveModal(parsed.id)}>
                    <img src="/assets/Minus.svg" alt="Remove Device" />
                  </button>
                </div>
              </div>
            );
          })}

        {/* "Add Device" tile */}
        <div
          className="add-new-device"
          onClick={openAddModal}
          style={{
            backgroundColor: devices.length % 2 === 0 ? '#363941' : '#2B2E35',
          }}
        >
          <div className="device-info">
            <h2>{nextDeviceId || 'New Device'}</h2>
            <p className="status">+ Add New Device</p>
          </div>
          <div className="add-device">
            <button>
              <img src="/assets/Plus.svg" alt="Add Device" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Modal
          title={
            modalAction === 'add'
              ? 'Confirm adding a new device'
              : 'Confirm removing this device'
          }
          message={
            modalAction === 'add'
              ? 'It will appear as "RecentlyAdded" until configured.'
              : 'Removing a device stops its data reporting. You can re-add later.'
          }
          confirmText={modalAction === 'add' ? 'Add Device' : 'Remove Device'}
          cancelText="Cancel"
          onConfirm={handleConfirmModal}
          onCancel={handleCancelModal}
        />
      )}
    </div>
  );
};

export default DeviceManager;
