import React, { useState, useEffect } from 'react';

interface ExistingLot {
  lotID: string;
  // any other fields you store in the Dashboard
}

interface AddLotProps {
  existingLots: ExistingLot[]; // array of lots from the Dashboard
  onClose: () => void;
  onLotAdded: () => void;
}

const AddLot: React.FC<AddLotProps> = ({ existingLots, onClose, onLotAdded }) => {
  // 1) Utility to compute the next numeric lot ID
  const computeNextLotId = () => {
    let maxNum = 0;
    existingLots.forEach((lot) => {
      // e.g. lot.lotID = "0000-0002"
      const match = lot.lotID.match(/(\d+)$/); // match trailing digits
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = (maxNum + 1).toString().padStart(4, '0'); // e.g. "0003"
    return `0000-${nextNum}`;
  };

  // 2) Our lot data state
  const [lotData, setLotData] = useState({
    lotId: '',
    companyName: '',
    address: '',
    lotName: 'New Parking Lot',
    ownerCustomerId: '',
    lotCapacity: 0,
    accountStatus: 'active',
    registryOn: false,
    createdOn: '',
    createdBy: 'superadmin',
    modifiedOn: null as string | null,
    modifiedBy: null as string | null,
    isDeleted: false,
  });

  // On mount, compute a suggested lotId & current date
  useEffect(() => {
    const nextId = computeNextLotId();
    const now = new Date().toISOString();
    setLotData((prev) => ({
      ...prev,
      lotId: nextId,
      createdOn: now,
    }));
  }, []);

  /**
   * Check if a user with the given ID actually exists
   * (calls GET /users/{ownerCustomerId})
   * Return true if found, false if not found or error.
   */
  const checkOwnerExists = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `http://localhost:8085/ParkingWithParallel/users/${userId}`
      );
      return response.ok; // 200 => user exists, anything else => no
    } catch {
      return false; // network error => treat as not found
    }
  };

  // 3) Submit new lot to backend
  const handleSubmit = async () => {
    if (
      !lotData.lotId ||
      !lotData.companyName ||
      !lotData.address ||
      !lotData.ownerCustomerId
    ) {
      alert(
        'Please fill all required fields: lotId, companyName, address, ownerCustomerId.'
      );
      return;
    }

    // Check if lotId is already used
    if (existingLots.some((lot) => lot.lotID === lotData.lotId)) {
      alert('That Lot ID is already in use. Please pick another or let the system generate one.');
      return;
    }

    // Check if owner exists
    const ownerExists = await checkOwnerExists(lotData.ownerCustomerId);
    if (!ownerExists) {
      alert('Owner ID does not exist. Please create a user first or use a valid user ID.');
      return;
    }

    try {
      const response = await fetch(
        'http://localhost:8085/ParkingWithParallel/parkinglots',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lotData),
        }
      );

      if (!response.ok) {
        // Attempt to parse error text for constraint issues
        const errorText = await response.text();
        if (errorText.includes('violates foreign key constraint')) {
          alert('Owner Customer ID is not present in users. Please create a user with that ID first.');
        } else if (errorText.includes('duplicate key value violates unique constraint')) {
          alert('Lot ID already in use. Please choose a different ID.');
        } else {
          alert('Error creating lot:\n' + errorText);
        }
        return;
      }

      // success
      onLotAdded(); // triggers a re-fetch in Dashboard
    } catch (error) {
      console.error(error);
      alert('Error creating lot. Check console for details.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add New Lot</h2>

        <label>Lot ID:</label>
        <input
          type="text"
          value={lotData.lotId}
          onChange={(e) => setLotData({ ...lotData, lotId: e.target.value })}
        />

        <label>Company Name:</label>
        <input
          type="text"
          value={lotData.companyName}
          onChange={(e) => setLotData({ ...lotData, companyName: e.target.value })}
        />

        <label>Address:</label>
        <input
          type="text"
          value={lotData.address}
          onChange={(e) => setLotData({ ...lotData, address: e.target.value })}
        />

        <label>Lot Name:</label>
        <input
          type="text"
          value={lotData.lotName}
          onChange={(e) => setLotData({ ...lotData, lotName: e.target.value })}
        />

        <label>Owner Customer ID:</label>
        <input
          type="text"
          value={lotData.ownerCustomerId}
          onChange={(e) =>
            setLotData({ ...lotData, ownerCustomerId: e.target.value })
          }
        />

        <label>Lot Capacity:</label>
        <input
          type="text"
          value={lotData.lotCapacity}
          onChange={(e) => {
            const val = e.target.value;
            if (/^\d*$/.test(val)) {
              setLotData({ ...lotData, lotCapacity: Number(val) });
            }
          }}
        />

        {/* Remaining fields (accountStatus, registryOn, createdOn, etc.) are set automatically */}

        <div className="button-group" style={{ marginTop: '20px' }}>
          <button
            className="submit-button"
            onClick={handleSubmit}
            style={{ marginRight: '10px' }}
          >
            Save
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLot;
