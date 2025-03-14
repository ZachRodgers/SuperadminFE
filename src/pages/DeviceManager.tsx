import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import './DeviceManager.css';
import './RefreshBar.css';

const DEVICES_API_URL = 'http://localhost:8085/ParkingWithParallel/devices';
const REFRESH_INTERVAL_MS = 10000; // 10 seconds
const PROGRESS_UPDATE_MS = 100; // how often we update the refresh bar
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

interface Device {
  deviceId: string;
  lotId: string;
  deviceType: string;
  isWifiRegistered: boolean;
  wifiNetworkName: string;
  wifiPassword: string;
  deviceStatus: string; // Online, Offline, RecentlyAdded, Calibrating
  lastActive: string;   // ISO date string
  deviceTemp: number;
  createdOn: string | null;
  createdBy: string | null;
  modifiedOn: string | null;
  modifiedBy: string | null;
  isDeleted: boolean;
}

interface ParsedDevice {
  id: string;
  statusText: string;    // e.g. "Online 32°C", "Offline", etc.
  updatedText: string;   // e.g. "3 mins ago", "Recently Added", etc.
  network: string;       // wifiNetworkName
  isOnline: boolean;
  colorClass: 'online' | 'offline' | 'calibrating' | 'offline'; 
}

const DeviceManager: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();

  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'add' | 'remove' | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [nextDeviceId, setNextDeviceId] = useState<string | null>(null);

  // Refresh bar state
  const [progress, setProgress] = useState(0);

  // Fetch devices on load
  useEffect(() => {
    fetchDevices();
  }, []);

  // Auto-refresh using the progress bar
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        // If we hit 100%, reset and fetch
        if (prev >= 100) {
          fetchDevices();
          return 0;
        }
        // Otherwise increment
        const step = 100 / (REFRESH_INTERVAL_MS / PROGRESS_UPDATE_MS);
        return prev + step;
      });
    }, PROGRESS_UPDATE_MS);

    return () => clearInterval(interval);
  }, [progress]);

  // Fetch devices from the Spring Boot backend
  const fetchDevices = async () => {
    if (!lotId) return; // no lot ID in URL

    try {
      const response = await fetch(DEVICES_API_URL);
      if (!response.ok) {
        console.error('Failed to fetch devices. Status:', response.status);
        return;
      }
      const data: Device[] = await response.json();

      // Filter devices for this lot
      const lotDevices = data.filter((d) => d.lotId === lotId);

      setDevices(lotDevices);
      calculateNextDeviceId(lotDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  // Determine the next device ID (lotId + a/b/c, etc.)
  const calculateNextDeviceId = (lotDevices: Device[]) => {
    if (!lotId) {
      setNextDeviceId(null);
      return;
    }

    const existingIds = lotDevices.map((device) => device.deviceId);

    // For each letter in a-z, see if lotId + letter is free
    for (let i = 0; i < ALPHABET.length; i++) {
      const potentialId = `${lotId}${ALPHABET[i]}`;
      if (!existingIds.includes(potentialId)) {
        setNextDeviceId(potentialId);
        return;
      }
    }
    setNextDeviceId(null);
  };

  // Manual refresh (click on "Refreshing...")
  const handleManualRefresh = () => {
    fetchDevices();
    setProgress(0);
  };

  // "Add Device" flow
  const handleAddDevice = async () => {
    if (!nextDeviceId || !lotId) {
      console.error('No next device ID available or missing lotId.');
      return;
    }

    const now = new Date().toISOString();
    const newDevice: Device = {
      deviceId: nextDeviceId,
      lotId: lotId,
      deviceType: 'ALPR',         // or any default
      isWifiRegistered: false,
      wifiNetworkName: 'N/A',
      wifiPassword: 'N/A',
      deviceStatus: 'RecentlyAdded',
      lastActive: now,
      deviceTemp: 0,
      createdOn: now,
      createdBy: 'admin',         // adjust as needed
      modifiedOn: null,
      modifiedBy: null,
      isDeleted: false
    };

    try {
      const response = await fetch(DEVICES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDevice),
      });
      if (response.ok) {
        fetchDevices();
      } else {
        console.error('Error adding device:', await response.text());
      }
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  // "Remove Device" flow
  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const response = await fetch(`${DEVICES_API_URL}/${deviceId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDevices();
      } else {
        console.error('Failed to remove device:', await response.text());
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

  // Modal confirmations
  const handleConfirmModal = () => {
    if (modalAction === 'add') {
      handleAddDevice();
    } else if (modalAction === 'remove' && selectedDeviceId) {
      handleRemoveDevice(selectedDeviceId);
    }
    setIsModalOpen(false);
  };
  const handleCancelModal = () => {
    setIsModalOpen(false);
  };

  // Utility to display how long ago lastActive was
  const getRelativeTime = (timestamp: string | null): string => {
    if (!timestamp) return 'No activity';
    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays <= 7) return `${diffDays} days ago`;

    // Fallback: show a formatted date
    return parsedDate.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Convert a Device from DB into the data needed for rendering
  const parseDevice = (device: Device): ParsedDevice => {
    const { deviceId, deviceStatus, deviceTemp, wifiNetworkName, lastActive } = device;

    // 1) Determine color class
    let colorClass: 'online' | 'offline' | 'calibrating' | 'offline' = 'offline';
    if (deviceStatus === 'Online') colorClass = 'online';
    else if (deviceStatus === 'Calibrating') colorClass = 'calibrating';
    else if (deviceStatus === 'RecentlyAdded') colorClass = 'offline'; // treat as offline color

    // 2) Build the status text
    // "Online 32°C", "Offline", "Calibrating", etc.
    let statusText = deviceStatus;
    if (deviceStatus === 'Online' && deviceTemp !== 0) {
      statusText = `Online ${deviceTemp}°C`;
    } else if (deviceStatus === 'RecentlyAdded') {
      // show "Offline" for the actual text, but keep deviceStatus if you want
      statusText = 'Offline';
    }

    // 3) Build the updated text from lastActive
    let updatedText = getRelativeTime(lastActive);
    if (deviceStatus === 'RecentlyAdded') {
      updatedText = `Recently Added • ${updatedText}`;
    }

    return {
      id: deviceId,
      statusText,
      updatedText,
      network: wifiNetworkName || 'N/A',
      isOnline: deviceStatus === 'Online',
      colorClass,
    };
  };

  return (
    <div className="device-manager">
      {/* Refresh Bar */}
      <div className="refresh-bar-wrapper">
        <div className="refresh-bar">
          <div className="refresh-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="refresh-text" onClick={handleManualRefresh}>
          Refreshing...
        </div>
      </div>

      <h1>Device Manager</h1>

      {/* Device List */}
      <div className="device-list">
        {devices.map((device, index) => {
          const parsedDevice = parseDevice(device);
          return (
            <div
              key={parsedDevice.id}
              className={`device ${parsedDevice.colorClass}`}
              style={{
                backgroundColor: index % 2 === 0 ? '#363941' : '#2B2E35',
              }}
            >
              <div className="device-info">
                <h2>{parsedDevice.id}</h2>
                <p className="status">{parsedDevice.statusText}</p>
                <p className="updated">{parsedDevice.updatedText}</p>
              </div>
              <div className="device-actions">
                <div className="action">
                  <button disabled={!parsedDevice.isOnline}>
                    <img src="/assets/power.svg" alt="Shutdown Icon" />
                  </button>
                  <span>Shutdown</span>
                </div>
                <div className="action">
                  <button disabled={!parsedDevice.isOnline}>
                    <img src="/assets/reboot.svg" alt="Reboot Icon" />
                  </button>
                  <span>Reboot</span>
                </div>
              </div>
              <div className="network-info">
                <p>
                  Network
                  <br />
                  {parsedDevice.network}
                </p>
              </div>
              <div className="remove-device">
                <button onClick={() => openRemoveModal(parsedDevice.id)}>
                  <img src="/assets/Minus.svg" alt="Remove Device" />
                </button>
              </div>
            </div>
          );
        })}

        {/* "Add New Device" tile */}
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

      {/* Modal for Add/Remove confirmation */}
      {isModalOpen && (
        <Modal
          title={
            modalAction === 'add'
              ? 'Please confirm adding a new device.'
              : 'Please confirm removing this device.'
          }
          message={
            modalAction === 'add'
              ? 'Devices will appear as RecentlyAdded until fully configured.'
              : 'Removed devices will not send parking data. You can re-add them later.'
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
