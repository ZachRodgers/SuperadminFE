import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // For extracting LotID from route
import Modal from '../components/Modal';
import './DeviceManager.css';

const API_URL = 'http://localhost:5000/devices';

const DeviceManager = () => {
  const { lotId } = useParams(); // Extract LotID from the URL
  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      // Filter devices based on the current LotID
      const filteredDevices = data.devices.filter((device) =>
        device.startsWith(lotId)
      );
      setDevices(filteredDevices);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const getNextLotId = () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < letters.length; i++) {
      const nextId = `${lotId}${letters[i]}`;
      if (!devices.some((device) => device.startsWith(nextId))) {
        return nextId;
      }
    }
    return `${lotId}z`; // Default to 'z' if no available ID
  };

  const parseDate = (timestamp) => {
    if (!timestamp || timestamp === 'na') return 'Recently Added';
    const [date, time] = timestamp.split('T');
    return `${date.slice(0, 2)}/${date.slice(2, 4)}/${date.slice(4)} ${time}`;
  };

  const parseDevice = (deviceString) => {
    const [id, temp, timestamp, network] = deviceString.split('_');
    const isOnline = temp !== 'na';
    return {
      id,
      status: isOnline ? `Online ${temp.replace('C', '°C')}` : 'Offline',
      updated: parseDate(timestamp),
      network: network !== 'na' ? network : 'N/A',
      online: isOnline,
    };
  };

  const handleAddDevice = async () => {
    const newDeviceId = getNextLotId();
    const newDeviceString = `${newDeviceId}_na_na_na`;
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

  const handleRemoveDevice = async (deviceId) => {
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

  const openRemoveModal = (deviceId) => {
    setSelectedDevice(deviceId);
    setModalAction('remove');
    setIsModalOpen(true);
  };

  const handleConfirmModal = () => {
    if (modalAction === 'add') {
      handleAddDevice();
    } else if (modalAction === 'remove') {
      handleRemoveDevice(selectedDevice);
    }
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="device-manager">
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
            <h2>{getNextLotId()}</h2>
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
