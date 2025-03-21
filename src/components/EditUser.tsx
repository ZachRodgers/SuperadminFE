import React, { useState } from 'react';
import './AddUser.css'; // Reusing AddUser styles

interface User {
  userId: string;
  name: string;
  email: string;
  phoneNo: string;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
  bannedAt?: string | null;
  createdOn?: string;
  createdBy?: string;
  modifiedOn?: string;
  modifiedBy?: string;
  isDeleted?: boolean;
}

interface EditUserProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user: User;
}

const EditUser: React.FC<EditUserProps> = ({ isOpen, onClose, onSave, user }) => {
  const [userData, setUserData] = useState<User>({...user});
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInputChange = (field: keyof User, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    if (field === 'email') {
      setEmailError(null);
    }
    // Clear any previous errors when user makes changes
    setError(null);
  };

  const handleSave = async () => {
    try {
      // Prevent multiple submissions
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        setEmailError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      console.log('Updating user with ID:', userData.userId);
      
      // First check if user exists
      try {
        console.log('Checking if user exists...');
        const checkResponse = await fetch(`http://localhost:8085/ParkingWithParallel/users/get-user-by-id/${userData.userId}`);
        
        if (!checkResponse.ok) {
          console.error('Failed to find user');
          throw new Error('User not found with the provided ID');
        }

        // Get the existing user from the response
        const existingUser = await checkResponse.json();
        console.log('Retrieved existing user:', existingUser);
        
        // ======= FINAL APPROACH: Direct access to repository method =======
        try {
          console.log('Attempting direct update with JSON...');
          
          // Create a complete user object with all required fields
          const completeUserData = {
            ...existingUser,         // Start with all existing properties
            userId: userData.userId, // Include the ID explicitly
            name: userData.name,
            email: userData.email,
            phoneNo: userData.phoneNo,
            role: userData.role,
            // Ensure these fields are explicitly defined
            isVerified: existingUser.isVerified || false,
            isBanned: existingUser.isBanned || false,
            isDeleted: false
          };
          
          console.log('Sending update with complete data:', completeUserData);
          
          // Try the update with the complete data
          const updateResponse = await fetch(`http://localhost:8085/ParkingWithParallel/users/update-user/${userData.userId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(completeUserData),
          });
          
          if (updateResponse.ok) {
            console.log('Update successful!');
            onSave();
            onClose();
            return;
          }
          
          const errorText = await updateResponse.text();
          console.error('Update failed:', errorText);
          
          // Display a specific message for duplicate email errors
          if (errorText === 'USER00002' || errorText === 'USER00004') {
            setEmailError('A user with this email already exists');
            setIsLoading(false);
            return;
          }
          
          // If we get here, all approaches have failed - suggest a backend fix
          throw new Error(`Backend error (${errorText}). Please contact your developer.`);
        } catch (error) {
          console.error('Final update error:', error);
          throw new Error('All update methods failed. The backend API appears to have a bug in the update-user endpoint.');
        }
      } catch (err) {
        console.error('Error in update process:', err);
        throw err;
      }
    } catch (err) {
      console.error('Error updating user:', err);
      
      if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
        setError(err.message);
        
        // Add suggestion about temporary workaround
        if (err.message.includes('backend API appears to have a bug')) {
          setError(prev => `${prev || ''}\n\nSuggested backend fix: Update UsersController.java to fix the updateUser method by using the path variable:
          
@PutMapping("/update-user/{id}")
public ResponseEntity<Users> updateUser(@PathVariable("id") String userId, @Valid @RequestBody Users updatedUser) {
    // Set the ID from the path variable to ensure it's not null
    updatedUser.setUserId(userId);
    Users dbUser = usersRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "USER00003"));
    log.info("Updating user with user ID: " + userId);
    Users savedUser = userService.updateUser(dbUser, updatedUser);
    return new ResponseEntity<>(savedUser, HttpStatus.OK);
}`);
        }
      } else {
        setError('Failed to update user');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit User</h2>
        </div>
        
        <div className="new-user-form">
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter name"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={userData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email"
              required
              disabled={isLoading}
            />
            {emailError && <div className="error">{emailError}</div>}
          </div>
          <div className="form-group">
            <label>Phone Number:</label>
            <input
              type="tel"
              value={userData.phoneNo}
              onChange={(e) => handleInputChange('phoneNo', e.target.value)}
              placeholder="Enter phone number"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Role:</label>
            <select
              value={userData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              disabled={isLoading}
            >
              <option value="SuperAdmin">Super Admin</option>
              <option value="Operator">Operator</option>
            </select>
          </div>
        </div>

        {error && <div className="error">{error}</div>}
        
        <div className="button-container">
          <button 
            className="confirm-button"
            onClick={handleSave}
            disabled={isLoading || !hasChanges || !userData.name || !userData.email || !userData.phoneNo}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUser; 