import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Customer.css";
import Modal from "../components/Modal";

const BASE_URL = "http://localhost:8085/ParkingWithParallel";
const CURRENT_SUPERADMIN = "1";

interface LotData {
  lotId: string;
  companyName: string;
  address: string;
  lotName: string;
  ownerCustomerId: string;
  lotCapacity: number;
  accountStatus: string;
  registryOn: boolean;
  createdOn: string;
  createdBy: string;
  modifiedOn: string;
  modifiedBy: string;
  isDeleted: boolean;
}

interface UserData {
  userId: string;
  name: string;
  email: string;
  phoneNo: string;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
  bannedAt: string | null;
  createdOn: string;
  createdBy: string;
  modifiedOn: string;
  modifiedBy: string;
  isDeleted: boolean;
}

const Customer: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const [lot, setLot] = useState<LotData | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
  const [editableFields, setEditableFields] = useState<Partial<LotData>>({});
  const [editMode, setEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchLot = async (id: string) => {
    try {
      // First get the full lot data
      const fullLotResponse = await fetch(`${BASE_URL}/parkinglots/get-by-id/${id}`);
      if (fullLotResponse.status === 404) {
        setErrorMessage("Parking lot not found.");
        return;
      }
      if (!fullLotResponse.ok) {
        throw new Error(`HTTP error! status: ${fullLotResponse.status}`);
      }
      const fullLotData: LotData = await fullLotResponse.json();
      if (!fullLotData) {
        throw new Error('No data received');
      }
      console.log('Fetched full lot data:', fullLotData);
      setLot(fullLotData);
      setEditableFields({
        companyName: fullLotData.companyName,
        address: fullLotData.address,
        lotName: fullLotData.lotName,
        lotCapacity: fullLotData.lotCapacity,
      });
      
      // Fetch owner data separately with its own error handling
      if (fullLotData.ownerCustomerId) {
        try {
          const ownerResponse = await fetch(`${BASE_URL}/users/get-user-by-id/${fullLotData.ownerCustomerId}`);
          if (ownerResponse.ok) {
            const ownerData: UserData = await ownerResponse.json();
            if (ownerData) {
              setOwner(ownerData);
            }
          } else {
            console.warn(`Failed to fetch owner data: ${ownerResponse.status}`);
          }
        } catch (ownerError) {
          console.warn("Error fetching owner data:", ownerError);
        }
      }
      
      setErrorMessage(null);
    } catch (error) {
      console.error("Error fetching lot:", error);
      if (!lot) {
        setErrorMessage("Failed to load lot data. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (lotId) fetchLot(lotId);
  }, [lotId]);

  const handleFieldChange = (field: keyof LotData, value: string) => {
    setEditableFields((prev) => ({
      ...prev,
      [field]: field === "lotCapacity" ? Number(value) : value,
    }));
    setUnsavedChanges(true);
  };

  const toggleEditMode = () => {
    if (editMode && unsavedChanges) {
      setShowModal(true);
    } else {
      setEditMode(!editMode);
    }
  };

  const checkOwnerExists = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/users/get-user-by-id/${userId}`);
      return response.ok;
    } catch {
      return false;
    }
  };

  const saveChangesToDB = async () => {
    if (!lot) return;
    if (!editableFields.companyName || !editableFields.address || !editableFields.lotName) {
      setErrorMessage("Fill out all required fields: Company Name, Address, Lot Name.");
      return;
    }
    
    // Create updated lot with all required fields
    const updatedLot: LotData = {
      lotId: lot.lotId,
      companyName: editableFields.companyName,
      address: editableFields.address,
      lotName: editableFields.lotName,
      lotCapacity: editableFields.lotCapacity !== undefined ? editableFields.lotCapacity : lot.lotCapacity,
      ownerCustomerId: lot.ownerCustomerId, // Use the original lot's owner ID
      accountStatus: lot.accountStatus,
      registryOn: lot.registryOn,
      createdOn: lot.createdOn,
      createdBy: lot.createdBy,
      modifiedOn: new Date().toISOString(),
      modifiedBy: CURRENT_SUPERADMIN,
      isDeleted: lot.isDeleted,
    };

    // Debug logging
    console.log('Current lot data:', lot);
    console.log('Editable fields:', editableFields);
    console.log('Updated lot being sent:', updatedLot);

    try {
      const response = await fetch(`${BASE_URL}/parkinglots/update/${lot.lotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLot),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        if (response.status === 404) {
          setErrorMessage("Parking lot not found.");
        } else if (errorText.includes("duplicate key value violates unique constraint")) {
          setErrorMessage("Lot name already in use.");
        } else {
          setErrorMessage(`Error updating lot: ${errorText}`);
        }
        return;
      }
      
      const updatedData = await response.json();
      console.log('Success response:', updatedData);
      setLot(updatedData);
      setUnsavedChanges(false);
      setEditMode(false);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error updating lot:", error);
      setErrorMessage("Failed to update lot. Check console for details.");
    }
  };

  const handleSaveChanges = () => {
    saveChangesToDB();
    setShowModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleCancelChanges = () => {
    if (lot) {
      setEditableFields({
        companyName: lot.companyName,
        address: lot.address,
        lotName: lot.lotName,
        ownerCustomerId: lot.ownerCustomerId,
        lotCapacity: lot.lotCapacity,
      });
    }
    setUnsavedChanges(false);
    setEditMode(false);
    setShowModal(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
    setErrorMessage(null);
  };

  const toggleAccountStatus = async (newStatus: "paused" | "archived") => {
    if (!lot) return;
    
    // Determine the new status
    const updatedStatus = lot.accountStatus.toLowerCase() === newStatus ? "active" : newStatus;
    
    // Create updated lot with all required fields
    const updatedLot: LotData = {
      lotId: lot.lotId,
      companyName: lot.companyName,
      address: lot.address,
      lotName: lot.lotName,
      lotCapacity: lot.lotCapacity,
      ownerCustomerId: lot.ownerCustomerId,
      accountStatus: updatedStatus,
      registryOn: lot.registryOn,
      createdOn: lot.createdOn,
      createdBy: lot.createdBy,
      modifiedOn: new Date().toISOString(),
      modifiedBy: CURRENT_SUPERADMIN,
      isDeleted: lot.isDeleted,
    };

    // Debug logging
    console.log('Current lot status:', lot.accountStatus);
    console.log('New status:', updatedStatus);
    console.log('Updated lot being sent:', updatedLot);

    try {
      const response = await fetch(`${BASE_URL}/parkinglots/update/${lot.lotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLot),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        if (response.status === 404) {
          setErrorMessage("Parking lot not found.");
        } else {
          setErrorMessage(`Error updating account status: ${errorText}`);
        }
        return;
      }
      
      const updatedData = await response.json();
      console.log('Success response:', updatedData);
      setLot(updatedData);
      setErrorMessage(null);
    } catch (error) {
      console.error("Error updating account status:", error);
      setErrorMessage("Failed to update account status. Please try again.");
    }
  };

  const handleNavigation = (path: string) => {
    if (editMode && unsavedChanges) {
      setShowModal(true);
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  };

  const formatDate = (isoDate: string) => {
    if (!isoDate) return "N/A";
    return new Date(isoDate).toLocaleString();
  };

  const handleDeleteLot = async () => {
    if (!lot) return;
    
    try {
      const response = await fetch(`${BASE_URL}/parkinglots/delete/${lot.lotId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        if (response.status === 404) {
          setErrorMessage("Parking lot not found.");
        } else {
          setErrorMessage(`Error deleting lot: ${errorText}`);
        }
        return;
      }
      
      // If deletion is successful, navigate to the dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error("Error deleting lot:", error);
      setErrorMessage("Failed to delete lot. Please try again.");
    }
  };

  const confirmDelete = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    handleDeleteLot();
    setShowDeleteModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  if (!lot) {
    return (
      <div className="customer-page">
        <h1>Customer</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <h1>Customer</h1>

      {errorMessage && (
        <div className="error-banner">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="customer-details">
        <div className="customer-column">
          <p>Company Name:</p>
          <p>Lot Name:</p>
          <p>Lot ID:</p>
          <p>Address:</p>
          <p>Lot Capacity:</p>
          <p>Created On:</p>
          <p>Modified On:</p>
        </div>

        <div className="customer-column">
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) => handleFieldChange("companyName", e.currentTarget.textContent || "")}
          >
            {editableFields.companyName ?? lot.companyName}
          </p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) => handleFieldChange("lotName", e.currentTarget.textContent || "")}
          >
            {editableFields.lotName ?? lot.lotName}
          </p>
          <p className={editMode ? "disabled-text" : ""}>{lot.lotId}</p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) => handleFieldChange("address", e.currentTarget.textContent || "")}
          >
            {editableFields.address ?? lot.address}
          </p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) => handleFieldChange("lotCapacity", e.currentTarget.textContent || "")}
          >
            {editableFields.lotCapacity ?? lot.lotCapacity}
          </p>
          <p className={editMode ? "disabled-text" : ""}>{formatDate(lot.createdOn)}</p>
          <p className={editMode ? "disabled-text" : ""}>{formatDate(lot.modifiedOn)}</p>
        </div>
      </div>

      <h2>Account</h2>
      <div className="account-actions">
        <button
          className={`action-button ${editMode ? "edit-active" : ""}`}
          onClick={toggleEditMode}
          disabled={lot.accountStatus === "archived"}
          style={{
            opacity: lot.accountStatus === "archived" ? 0.5 : 1,
            pointerEvents: lot.accountStatus === "archived" ? "none" : "auto",
          }}
        >
          <img
            className="button-icon"
            src={editMode ? "/assets/EditInverted.svg" : "/assets/Edit.svg"}
            alt="Edit Icon"
          />
          <img className="button-icon-hover" src="/assets/EditInverted.svg" alt="Edit Icon Hover" />
          <span>Edit</span>
        </button>
        <button
          className={`action-button ${lot.accountStatus === "paused" ? "edit-active" : ""}`}
          onClick={() => toggleAccountStatus("paused")}
          disabled={editMode || lot.accountStatus === "archived"}
          style={{
            opacity: editMode || lot.accountStatus === "archived" ? 0.5 : 1,
            pointerEvents: editMode || lot.accountStatus === "archived" ? "none" : "auto",
          }}
        >
          <img
            className="button-icon"
            src={lot.accountStatus === "paused" ? "/assets/PauseInverted.svg" : "/assets/Pause.svg"}
            alt="Pause Icon"
          />
          <img className="button-icon-hover" src="/assets/PauseInverted.svg" alt="Pause Icon Hover" />
          <span>{lot.accountStatus === "paused" ? "Paused" : "Pause"}</span>
        </button>
        <button
          className={`action-button ${lot.accountStatus === "archived" ? "edit-active" : ""}`}
          onClick={() => toggleAccountStatus("archived")}
          style={{ opacity: 1, pointerEvents: "auto" }}
        >
          <img
            className="button-icon"
            src={lot.accountStatus === "archived" ? "/assets/ArchiveInverted.svg" : "/assets/Archive.svg"}
            alt="Archive Icon"
          />
          <img className="button-icon-hover" src="/assets/ArchiveInverted.svg" alt="Archive Icon Hover" />
          <span>{lot.accountStatus === "archived" ? "Archived" : "Archive"}</span>
        </button>
        {lot.accountStatus === "archived" && (
          <button
            className="action-button"
            onClick={confirmDelete}
            style={{ opacity: 1, pointerEvents: "auto" }}
          >
            <img
              className="button-icon"
              src="/assets/Delete.svg"
              alt="Delete Icon"
            />
            <img className="button-icon-hover" src="/assets/DeleteInverted.svg" alt="Delete Icon Hover" />
            <span>Delete</span>
          </button>
        )}
      </div>

      {showModal && (
        <Modal
          title="Please confirm changes"
          message="You have unsaved modifications. Save changes?"
          onConfirm={handleSaveChanges}
          onCancel={handleCancelChanges}
          confirmText="Save Changes"
          cancelText="Cancel Changes"
        />
      )}

      {showDeleteModal && (
        <Modal
          title="Confirm Deletion"
          message="Are you sure you want to delete this parking lot? This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default Customer;
