import React, { useState, useEffect } from 'react';
import AddUser from './AddUser';
import { BASE_URL } from '../config/api';

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
      const response = await fetch(`${BASE_URL}/users/get-all-users`);
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

  // Lot data state WITHOUT lot ID (will be generated by backend only at creation time)
  const [lotData, setLotData] = useState({
    companyName: '',
    address: '',
    lotName: 'New Parking Lot',
    ownerEmail: currentUserEmail,
    lotCapacity: 0,
    accountStatus: 'Active',
    registryOn: false,
    createdOn: new Date().toISOString(),
    createdBy: 'superadmin',
    modifiedOn: new Date().toISOString(),
    modifiedBy: 'superadmin',
    isDeleted: false,
  });

  /**
   * Given an email, call the backend endpoint to get the user details.
   * Returns the userId if found, or null otherwise.
   */
  const getOwnerUserIdByEmail = async (email: string): Promise<string | null> => {
    try {
      const response = await fetch(`${BASE_URL}/users/get-by-email/${email}`);
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

  // Submit new lot to the backend
  const handleSubmit = async () => {
    // Validate required fields
    if (!lotData.companyName || !lotData.address || !lotData.ownerEmail) {
      alert('Please fill all required fields: Company Name, Address, and Owner Email.');
      return;
    }

    // Look up the owner user ID by the entered email.
    const ownerUserId = await getOwnerUserIdByEmail(lotData.ownerEmail);
    if (!ownerUserId) {
      alert('Owner email does not match any existing user. Please create that user first or use a valid email.');
      return;
    }

    // Set current timestamp for both creation and modification
    const currentTime = new Date().toISOString();

    // Build the request body WITHOUT lotId - backend will generate it
    const requestBody = {
      companyName: lotData.companyName,
      address: lotData.address,
      lotName: lotData.lotName,
      ownerCustomerId: ownerUserId,
      lotCapacity: lotData.lotCapacity,
      accountStatus: lotData.accountStatus,
      registryOn: lotData.registryOn,
      createdOn: currentTime,
      createdBy: lotData.createdBy,
      modifiedOn: currentTime,
      modifiedBy: lotData.createdBy,
      isDeleted: lotData.isDeleted,
    };

    try {
      const response = await fetch(`${BASE_URL}/parkinglots/create`, {
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
        <h2>Add New Parking Lot</h2>

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
          type="number"
          value={lotData.lotCapacity}
          onChange={(e) => setLotData({ ...lotData, lotCapacity: Number(e.target.value) })}
          min="0"
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
