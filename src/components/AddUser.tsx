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
  currentOperators: User[];
  currentStaff: User[];
}

const AddUser: React.FC<AddUserProps> = ({ isOpen, onClose, onConfirm, currentOwnerId, type, currentOperators, currentStaff }) => {
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

        // Filter out deleted users, current owner, and existing operators/staff
        const filteredUsers = mappedUsers.filter((user: User) => {
          // Always filter out deleted users
          if (user.isDeleted) return false;

          // Filter out current owner
          if (user.userId === currentOwnerId) return false;

          // Filter out existing operators when adding an operator
          if (type === 'operator' && currentOperators.some(op => op.userId === user.userId)) {
            return false;
          }

          // Filter out existing staff when adding staff
          if (type === 'staff' && currentStaff.some(s => s.userId === user.userId)) {
            return false;
          }

          return true;
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
  }, [isOpen, currentOwnerId, type, currentOperators, currentStaff]);

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
            {users.map((user) => {
              // Format the user ID by removing the prefix
              const formattedUserId = user.userId.replace('PWP-U-', '');
              return (
                <option key={user.userId} value={user.userId}>
                  {formattedUserId} ({user.email}) {user.name}
                  {user.isVerified ? ' ✓' : ''}
                  {user.isBanned ? ' 🚫' : ''}
                </option>
              );
            })}
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