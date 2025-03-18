import React, { useState, useEffect } from 'react';

interface ExistingLot {
  lotID: string;
}

interface AddLotProps {
  existingLots: ExistingLot[];
  onClose: () => void;
  onLotAdded: () => void;
}

const AddLot: React.FC<AddLotProps> = ({ existingLots, onClose, onLotAdded }) => {
  // Optionally, you can try to prefill with the current user's email if stored in localStorage.
  const currentUserEmail = localStorage.getItem('userEmail') || '';

  // 1) Utility to compute the next numeric lot ID
  const computeNextLotId = () => {
    let maxNum = 0;
    existingLots.forEach((lot) => {
      // e.g. lot.lotID might be "0000-0002"
      const match = lot.lotID.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = (maxNum + 1).toString().padStart(4, '0');
    return `0000-${nextNum}`;
  };

  // 2) Lot data state.
  // We now use a field called ownerEmail for input.
  const [lotData, setLotData] = useState({
    lotId: '',
    companyName: '',
    address: '',
    lotName: 'New Parking Lot',
    ownerEmail: currentUserEmail, // user enters the owner’s email here
    lotCapacity: 0,
    accountStatus: 'Active',
    registryOn: false,
    createdOn: '',
    createdBy: 'superadmin',
    modifiedOn: null as string | null,
    modifiedBy: null as string | null,
    isDeleted: false,
  });

  // On mount, compute suggested lotId and set current date.
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
   * Given an email, call the backend endpoint to get the user details.
   * Returns the userId if found, or null otherwise.
   */
  const getOwnerUserIdByEmail = async (email: string): Promise<string | null> => {
    try {
      const response = await fetch(`http://localhost:8085/ParkingWithParallel/users/get-by-email/${email}`);
      if (!response.ok) {
        return null;
      }
      const userListing = await response.json();
      return userListing.userId;
    } catch (error) {
      console.error("Error fetching user by email", error);
      return null;
    }
  };

  // 3) Submit new lot to the backend
  const handleSubmit = async () => {
    // Validate required fields
    if (!lotData.lotId || !lotData.companyName || !lotData.address || !lotData.ownerEmail) {
      alert('Please fill all required fields: Lot ID, Company Name, Address, and Owner Email.');
      return;
    }

    // Check if lotId is already used
    if (existingLots.some((lot) => lot.lotID === lotData.lotId)) {
      alert('That Lot ID is already in use. Please pick another or let the system generate one.');
      return;
    }

    // Look up the owner user ID by the entered email.
    const ownerUserId = await getOwnerUserIdByEmail(lotData.ownerEmail);
    if (!ownerUserId) {
      alert('Owner email does not match any existing user. Please create that user first or use a valid email.');
      return;
    }

    // Build the request body using the retrieved ownerUserId as ownerCustomerId.
    const requestBody = {
      lotId: lotData.lotId,
      companyName: lotData.companyName,
      address: lotData.address,
      lotName: lotData.lotName,
      ownerCustomerId: ownerUserId,
      lotCapacity: lotData.lotCapacity,
      accountStatus: lotData.accountStatus,
      registryOn: lotData.registryOn,
      createdOn: lotData.createdOn,
      createdBy: lotData.createdBy,
      modifiedOn: lotData.modifiedOn,
      modifiedBy: lotData.modifiedBy,
      isDeleted: lotData.isDeleted,
    };

    try {
      const response = await fetch('http://localhost:8085/ParkingWithParallel/parkinglots/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('foreign key')) {
          alert('Owner Customer ID is not present in users. Please create that user first.');
        } else if (errorText.includes('duplicate key value violates unique constraint')) {
          alert('Lot ID or Lot Name is already in use. Please choose a different one.');
        } else {
          alert('Error creating lot:\n' + errorText);
        }
        return;
      }

      // On success, trigger re-fetch of lots.
      onLotAdded();
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
          placeholder='Enter a new valid LotID'
        />

        <label>Company Name:</label>
        <input
          type="text"
          value={lotData.companyName}
          onChange={(e) => setLotData({ ...lotData, companyName: e.target.value })}
          placeholder='Enter the company name'
        />

        <label>Address:</label>
        <input
          type="text"
          value={lotData.address}
          onChange={(e) => setLotData({ ...lotData, address: e.target.value })}
          placeholder='Enter the address'
        />

        <label>Lot Name:</label>
        <input
          type="text"
          value={lotData.lotName}
          onChange={(e) => setLotData({ ...lotData, lotName: e.target.value })}
          placeholder='Enter the lot name'
        />

        <label>Owner Email:</label>
        <input
          type="text"
          value={lotData.ownerEmail}
          onChange={(e) => setLotData({ ...lotData, ownerEmail: e.target.value })}
          placeholder='Enter the owners account email'
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

        <div className="button-group" style={{ marginTop: '20px' }}>
          <button className="submit-button" onClick={handleSubmit} style={{ marginRight: '10px' }}>
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
