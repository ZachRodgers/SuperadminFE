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
  startInCreateMode?: boolean;
}

const AddUser: React.FC<AddUserProps> = ({ isOpen, onClose, onConfirm, currentOwnerId, type, currentOperators, currentStaff, startInCreateMode = false }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(startInCreateMode);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phoneNo: '',
    role: 'Operator'
  });
  const [emailError, setEmailError] = useState<string | null>(null);

  const generateTempPassword = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let password = '';

    // Generate 3 random uppercase letters
    for (let i = 0; i < 3; i++) {
      password += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Generate 3 random numbers
    for (let i = 0; i < 3; i++) {
      password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

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
      setIsCreatingNew(startInCreateMode);
      setNewUser({
        name: '',
        email: '',
        password: generateTempPassword(),
        phoneNo: '',
        role: type === 'operator' ? 'Operator' : type === 'staff' ? 'Staff' : 'Owner'
      });
    }
  }, [isOpen, currentOwnerId, type, currentOperators, currentStaff, startInCreateMode]);

  const handleCreateUser = async () => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        setEmailError('Please enter a valid email address');
        return;
      }

      const response = await fetch('http://localhost:8085/ParkingWithParallel/users/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          phoneNo: newUser.phoneNo,
          role: newUser.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (errorData === 'USER00002') {
          setEmailError('A user with this email already exists');
          return;
        }
        throw new Error(`Failed to create user: ${errorData}`);
      }

      const createdUser = await response.json();
      onConfirm(createdUser.userId);
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const getTitle = () => {
    if (startInCreateMode) {
      return 'Create User';
    }
    if (isCreatingNew) {
      return 'New User';
    }
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
    if (startInCreateMode) {
      return 'Create User';
    }
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
        <div className="modal-header">
          <h2>{getTitle()}</h2>
          {!startInCreateMode && (
            <button
              className="new-user-button"
              onClick={() => setIsCreatingNew(!isCreatingNew)}
            >
              {isCreatingNew ? 'Select Existing' : '+ New User'}
            </button>
          )}
        </div>

        {isCreatingNew ? (
          <div className="new-user-form">
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Enter name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => {
                  setNewUser({ ...newUser, email: e.target.value });
                  setEmailError(null);
                }}
                placeholder="Enter email"
                required
              />
              {emailError && <div className="error">{emailError}</div>}
            </div>
            <div className="form-group">
              <label>Temp Password:</label>
              <input
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Enter temp password"
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number:</label>
              <input
                type="tel"
                value={newUser.phoneNo}
                onChange={(e) => setNewUser({ ...newUser, phoneNo: e.target.value })}
                placeholder="Enter phone number (optional)"
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="Operator">Operator</option>
                <option value="SuperAdmin">Super Admin</option>

              </select>
            </div>
          </div>
        ) : (
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
        )}

        {error && <div className="error">{error}</div>}

        <div className="button-container">
          <button
            className="confirm-button"
            onClick={isCreatingNew ? handleCreateUser : () => selectedUserId && onConfirm(selectedUserId)}
            disabled={isCreatingNew ?
              !newUser.name || !newUser.email || !newUser.password :
              !selectedUserId
            }
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