import React, { useState, useEffect } from 'react';
import AddUser from './AddUser';

interface ExistingLot {
  lotID: string;
}

interface User {
  userId: string;
  name: string;
  email: string;
  isDeleted: boolean;
}

interface AddLotProps {
  existingLots: ExistingLot[];
  onClose: () => void;
  onLotAdded: () => void;
}

const AddLot: React.FC<AddLotProps> = ({ existingLots, onClose, onLotAdded }) => {
  // Optionally, you can try to prefill with the current user's email if stored in localStorage.
  const currentUserEmail = localStorage.getItem('userEmail') || '';
  const [showAddUser, setShowAddUser] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('http://localhost:8085/ParkingWithParallel/users/get-all-users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      // Filter out deleted users
      const activeUsers = data.filter((user: User) => !user.isDeleted);
      setUsers(activeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 1) Utility to compute the next numeric lot ID
  const computeNextLotId = () => {
    let maxNum = 0;
    existingLots.forEach((lot) => {
      // e.g. lot.lotID might be "PWP-PL-0000003"
      const match = lot.lotID.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = (maxNum + 1).toString().padStart(6, '0'); // Pad to 6 digits to match DB format
    return nextNum; // Return just the number without any dashes
  };

  // 1) Utility to get the next lot ID from backend
  const getNextLotId = async () => {
    try {
      const response = await fetch('http://localhost:8085/ParkingWithParallel/parkinglots/get-next-id');
      if (!response.ok) {
        throw new Error('Failed to get next lot ID');
      }
      const data = await response.json();
      return data.lotId;
    } catch (error) {
      console.error('Error getting next lot ID:', error);
      // Fallback to computing locally if backend call fails
      return computeNextLotId();
    }
  };

  // 2) Lot data state.
  const [lotData, setLotData] = useState({
    lotId: '',
    companyName: '',
    address: '',
    lotName: 'New Parking Lot',
    ownerEmail: currentUserEmail,
    lotCapacity: 0,
    accountStatus: 'Active',
    registryOn: false,
    createdOn: '',
    createdBy: 'superadmin',
    modifiedOn: null as string | null,
    modifiedBy: null as string | null,
    isDeleted: false,
  });

  // On mount, get next lotId from backend and set current date
  useEffect(() => {
    const initializeLotData = async () => {
      const nextId = await getNextLotId();
      const now = new Date().toISOString();
      setLotData((prev) => ({
        ...prev,
        lotId: nextId,
        createdOn: now,
      }));
    };
    initializeLotData();
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
          alert('Lot Name is already in use. Please choose a different one.');
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

  // Handle user creation from AddUser modal
  const handleUserCreated = (userId: string) => {
    setShowAddUser(false);
    fetchUsers(); // Refresh the users list
    // Get the user's email and set it as owner email
    getOwnerUserIdByEmail(userId).then(email => {
      if (email) {
        setLotData(prev => ({ ...prev, ownerEmail: email }));
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Lot {lotData.lotId}</h2>

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

        <div className="owner-email-section">
          <label>Owner Email:</label><button className="addlot-new-user-button" onClick={() => setShowAddUser(true)}>New User</button>
        </div>
        <select
          value={lotData.ownerEmail}
          onChange={(e) => setLotData({ ...lotData, ownerEmail: e.target.value })}
          disabled={isLoadingUsers}
          className="user-select"
        >
          <option value="">Select an owner...</option>
          {users.map((user) => (
            <option key={user.userId} value={user.email}>
              {user.email} ({user.name})
            </option>
          ))}
        </select>

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
          <button className="confirm-button" onClick={handleSubmit} style={{ marginRight: '10px' }}>
            Save
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>

      {showAddUser && (
        <AddUser
          isOpen={showAddUser}
          onClose={() => setShowAddUser(false)}
          onConfirm={handleUserCreated}
          type="owner"
          currentOwnerId=""
          currentOperators={[]}
          currentStaff={[]}
          startInCreateMode={true}
        />
      )}
    </div>
  );
};

export default AddLot;
