import React, { useState, useEffect } from 'react';
import './AddUser.css';

interface UserResponse {
  userId: string;
  name: string;
  email: string;
  phoneNo?: string;
  role?: string;
  isVerified?: boolean;
  isBanned?: boolean;
  isDeleted?: boolean;
}

interface User {
  userId: string;
  name: string;
  email: string;
  phoneNo: string;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
  isDeleted: boolean;
}

interface AddUserProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  currentOwnerId: string;
  type: 'operator' | 'staff' | 'owner';
}

const AddUser: React.FC<AddUserProps> = ({ isOpen, onClose, onConfirm, currentOwnerId, type }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:8085/ParkingWithParallel/users/get-all-users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        console.log('Raw response:', data);
        
        // Map the backend response to our User interface
        const mappedUsers = data.map((user: UserResponse) => {
          console.log('Processing user:', user);
          return {
            userId: user.userId || '',
            name: user.name || '',
            email: user.email || '',
            phoneNo: user.phoneNo || '',
            role: user.role || '',
            isVerified: Boolean(user.isVerified),
            isBanned: Boolean(user.isBanned),
            isDeleted: Boolean(user.isDeleted)
          };
        });

        // Filter out deleted users and the current owner
        const filteredUsers = mappedUsers.filter((user: User) => {
          const shouldInclude = !user.isDeleted && user.userId !== currentOwnerId;
          console.log(`User ${user.userId}: deleted=${user.isDeleted}, currentOwner=${user.userId === currentOwnerId}, included=${shouldInclude}`);
          return shouldInclude;
        });
        
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();
      setSelectedUserId('');
    }
  }, [isOpen, currentOwnerId]);

  const getTitle = () => {
    switch (type) {
      case 'operator':
        return 'Add Operator';
      case 'staff':
        return 'Add Staff';
      case 'owner':
        return 'Change Owner';
      default:
        return 'Add User';
    }
  };

  const getConfirmButtonText = () => {
    switch (type) {
      case 'operator':
        return 'Add Operator';
      case 'staff':
        return 'Add Staff';
      case 'owner':
        return 'Change Owner';
      default:
        return 'Confirm';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{getTitle()}</h2>
        
        <div className="select-container">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="user-select"
          >
            <option value="">Select a user...</option>
            {users.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.name} ({user.email}) - {user.role}
                {user.isVerified ? ' ✓' : ''}
                {user.isBanned ? ' 🚫' : ''}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error">{error}</div>}
        
        <div className="button-container">
          <button 
            className="confirm-button"
            onClick={() => selectedUserId && onConfirm(selectedUserId)}
            disabled={!selectedUserId}
          >
            {getConfirmButtonText()}
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUser; 