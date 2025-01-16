import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import './DeviceManager.css';
import './RefreshBar.css';

const API_URL = 'http://localhost:5000/devices';
const minHeartbeat = 60 * 1000; // 60 seconds (in milliseconds)
const refreshInterval = 10000; // 10 seconds (in milliseconds)

interface ParsedDevice {
  id: string;
  status: string;
  updated: string;
  network: string;
  online: boolean;
}

const DeviceManager: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const [devices, setDevices] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'add' | 'remove' | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [nextDeviceId, setNextDeviceId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) =>
        prev >= 100 ? 0 : prev + (100 / (refreshInterval / 100))
      );

      if (progress >= 100) {
        fetchDevices();
        setProgress(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [progress]);

  const fetchDevices = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      const filteredDevices = data.devices.filter((device: string) =>
        device.startsWith(lotId || '')
      );
      setDevices(filteredDevices);
      calculateNextDeviceId(filteredDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const calculateNextDeviceId = (currentDevices: string[]) => {
    const existingIds = currentDevices.map((device) => device.split('_')[0]);
    const baseId = lotId || '';
    for (let i = 0; i < 26; i++) {
      const potentialId = `${baseId}${String.fromCharCode(97 + i)}`;
      if (!existingIds.includes(potentialId)) {
        setNextDeviceId(potentialId);
        return;
      }
    }
    setNextDeviceId(null);
  };

  const handleManualRefresh = () => {
    fetchDevices();
    setProgress(0);
  };

  const handleAddDevice = async () => {
    if (!nextDeviceId) {
      console.error('No next device ID available.');
      return;
    }

    const newDeviceString = `${nextDeviceId}_na_na_na`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDevice: newDeviceString }),
      });
      if (response.ok) {
        fetchDevices();
      }
    } catch (error) {
      console.error('Error adding device:', error);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const response = await fetch(API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      if (response.ok) {
        fetchDevices();
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error removing device:', error);
    }
  };

  const openAddModal = () => {
    setModalAction('add');
    setIsModalOpen(true);
  };

  const openRemoveModal = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setModalAction('remove');
    setIsModalOpen(true);
  };

  const handleConfirmModal = () => {
    if (modalAction === 'add') {
      handleAddDevice();
    } else if (modalAction === 'remove' && selectedDevice) {
      handleRemoveDevice(selectedDevice);
    }
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
  };

  const parseDevice = (deviceString: string): ParsedDevice => {
    const [id, temp, timestamp, network] = deviceString.split('_');

    const now = new Date();
    const deviceTime = new Date(timestamp);
    const isOnline = timestamp !== 'na' && now.getTime() - deviceTime.getTime() <= minHeartbeat;

    return {
      id,
      status: isOnline ? `Online` : 'Offline',
      updated: getRelativeTime(timestamp),
      network: network !== 'na' ? network : 'N/A',
      online: isOnline,
    };
  };

  const getRelativeTime = (timestamp: string | null): string => {
    if (!timestamp || timestamp === 'na') return 'Recently Added';

    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) return 'Invalid date';

    const now = new Date();
    const diffMs = now.getTime() - parsedDate.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) {
      return `${Math.round(diffSeconds / 10) * 10} seconds ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} mins ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`;
    } else {
      return parsedDate.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  };

  return (
    <div className="device-manager">
      <div className="refresh-bar-wrapper">
        <div className="refresh-bar">
          <div
            className="refresh-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="refresh-text" onClick={handleManualRefresh}>
          Refreshing...
        </div>
      </div>
      <h1>Device Manager</h1>
      <div className="device-list">
        {devices.map((device, index) => {
          const parsedDevice = parseDevice(device);
          return (
            <div
              key={parsedDevice.id}
              className={`device ${parsedDevice.online ? 'online' : 'offline'}`}
              style={{
                backgroundColor: index % 2 === 0 ? '#363941' : '#2B2E35',
              }}
            >
              <div className="device-info">
                <h2>{parsedDevice.id}</h2>
                <p className="status">{parsedDevice.status}</p>
                <p className="updated">{parsedDevice.updated}</p>
              </div>
              <div className="device-actions">
                <div className="action">
                  <button disabled={!parsedDevice.online}>
                    <img src="/assets/power.svg" alt="Shutdown Icon" />
                  </button>
                  <span>Shutdown</span>
                </div>
                <div className="action">
                  <button disabled={!parsedDevice.online}>
                    <img src="/assets/reboot.svg" alt="Reboot Icon" />
                  </button>
                  <span>Reboot</span>
                </div>
              </div>
              <div className="network-info">
                <p>Network<br />{parsedDevice.network}</p>
              </div>
              <div className="remove-device">
                <button onClick={() => openRemoveModal(parsedDevice.id)}>
                  <img src="/assets/Minus.svg" alt="Remove Device" />
                </button>
              </div>
            </div>
          );
        })}
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
              ? 'Please confirm adding a new device.'
              : 'Please confirm removing this device.'
          }
          message={
            modalAction === 'add'
              ? 'Devices should only be added if the Lot owns the device and it needs to be detected. Added devices will show up as offline until detected.'
              : 'Removed devices will not send parking data for processing. If removed, they can be added back to the portal at any time.'
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
