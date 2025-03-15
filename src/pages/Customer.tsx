import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Customer.css";
import Modal from "../components/Modal";

// Adjust to your actual endpoint base
const BASE_URL = "http://localhost:8085/ParkingWithParallel/parkinglots";

interface LotData {
  lotId: string;
  companyName: string;
  address: string;
  lotName: string;
  ownerCustomerId: string;
  lotCapacity: number;
  accountStatus: string;
  registryOn: boolean;
  createdOn: string;   // ISO string
  createdBy: string;
  modifiedOn: string;  // ISO string
  modifiedBy: string;
  isDeleted: boolean;
}

const CURRENT_SUPERADMIN = "1"; // Or "superadmin" / from context

const Customer: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  // The loaded lot data from DB
  const [lot, setLot] = useState<LotData | null>(null);

  // Fields we can edit in “Edit” mode
  const [editableFields, setEditableFields] = useState<Partial<LotData>>({});
  const [editMode, setEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Show/hide “unsaved changes” modal
  const [showModal, setShowModal] = useState(false);
  // If user tries to navigate away with unsaved changes
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Fetch single lot from DB
  const fetchLot = async (id: string) => {
    try {
      const response = await fetch(`${BASE_URL}/${id}`);
      if (!response.ok) {
        console.error("Error fetching lot:", response.status);
        return;
      }
      const data: LotData = await response.json();
      setLot(data);

      // Initialize editable fields with the DB values
      setEditableFields({
        companyName: data.companyName,
        address: data.address,
        lotName: data.lotName,
        ownerCustomerId: data.ownerCustomerId,
        lotCapacity: data.lotCapacity,
      });
    } catch (error) {
      console.error("Error fetching lot:", error);
    }
  };

  useEffect(() => {
    if (lotId) {
      fetchLot(lotId);
    }
  }, [lotId]);

  // Called when user modifies an editable field
  const handleFieldChange = (field: keyof LotData, value: string) => {
    setEditableFields((prev) => ({
      ...prev,
      [field]: field === "lotCapacity" ? Number(value) : value,
    }));
    setUnsavedChanges(true);
  };

  // Toggle “Edit” button
  const toggleEditMode = () => {
    if (editMode && unsavedChanges) {
      setShowModal(true); // Prompt to save/cancel changes
    } else {
      setEditMode(!editMode);
    }
  };

  // Update the DB with the new field values
  const saveChangesToDB = async () => {
    if (!lot) return;

    const updatedLot: LotData = {
      ...lot,
      // Overwrite only the editable fields
      companyName: editableFields.companyName ?? lot.companyName,
      address: editableFields.address ?? lot.address,
      lotName: editableFields.lotName ?? lot.lotName,
      ownerCustomerId: editableFields.ownerCustomerId ?? lot.ownerCustomerId,
      lotCapacity:
        editableFields.lotCapacity !== undefined
          ? editableFields.lotCapacity
          : lot.lotCapacity,
      // Force updated “modifiedOn” & “modifiedBy”
      modifiedOn: new Date().toISOString(),
      modifiedBy: CURRENT_SUPERADMIN,
    };

    try {
      const response = await fetch(`${BASE_URL}/${lot.lotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLot),
      });
      if (!response.ok) {
        console.error("Failed to update lot in DB. Status:", response.status);
        return;
      }
      // If success, update local state
      setLot(updatedLot);
      setUnsavedChanges(false);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating lot:", error);
    }
  };

  // Called when user clicks “Save” in the unsaved changes modal
  const handleSaveChanges = () => {
    saveChangesToDB();
    setShowModal(false);

    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  // Called when user cancels the unsaved changes
  const handleCancelChanges = () => {
    // Reset fields to original
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
  };

  // Toggle account status between newStatus and “active”
  const toggleAccountStatus = async (newStatus: "paused" | "suspended") => {
    if (!lot) return;

    // If the lot’s current status is newStatus, revert to “active”
    const updatedStatus =
      lot.accountStatus === newStatus ? "active" : newStatus;

    const updatedLot: LotData = {
      ...lot,
      accountStatus: updatedStatus,
      modifiedOn: new Date().toISOString(),
      modifiedBy: CURRENT_SUPERADMIN,
    };

    try {
      const response = await fetch(`${BASE_URL}/${lot.lotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedLot),
      });
      if (!response.ok) {
        console.error("Failed to update account status. Status:", response.status);
        return;
      }
      // If success, update local state
      setLot(updatedLot);
    } catch (error) {
      console.error("Error updating account status:", error);
    }
  };

  // If user tries to navigate away while editing
  const handleNavigation = (path: string) => {
    if (editMode && unsavedChanges) {
      setShowModal(true);
      setPendingNavigation(path);
    } else {
      navigate(path);
    }
  };

  if (!lot) {
    return (
      <div className="customer-page">
        <h1>Customer</h1>
        <p>Loading...</p>
      </div>
    );
  }

  // Helper to format date strings
  const formatDate = (isoDate: string) => {
    if (!isoDate) return "N/A";
    const d = new Date(isoDate);
    return d.toLocaleString(); // Or toLocaleDateString() if you prefer
  };

  return (
    <div className="customer-page">
      <h1>Customer</h1>

      <div className="customer-details">
        <div className="customer-column">
          <p>Company Name:</p>
          <p>Lot Name:</p>
          <p>Lot ID:</p>
          <p>Address:</p>
          <p>Owner Customer ID:</p>
          <p>Lot Capacity:</p>
          <p>Created On:</p>
          <p>Modified On:</p>
        </div>

        <div className="customer-column">
          {/* Company Name (editable) */}
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("companyName", e.currentTarget.textContent || "")
            }
          >
            {editableFields.companyName ?? lot.companyName}
          </p>

          {/* Lot Name (editable) */}
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("lotName", e.currentTarget.textContent || "")
            }
          >
            {editableFields.lotName ?? lot.lotName}
          </p>

          {/* Lot ID (NOT editable) */}
          <p className={editMode ? "disabled-text" : ""}>{lot.lotId}</p>

          {/* Address (editable) */}
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("address", e.currentTarget.textContent || "")
            }
          >
            {editableFields.address ?? lot.address}
          </p>

          {/* Owner Customer ID (editable) */}
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("ownerCustomerId", e.currentTarget.textContent || "")
            }
          >
            {editableFields.ownerCustomerId ?? lot.ownerCustomerId}
          </p>

          {/* Lot Capacity (editable) */}
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("lotCapacity", e.currentTarget.textContent || "")
            }
          >
            {editableFields.lotCapacity ?? lot.lotCapacity}
          </p>

          {/* Created On (NOT editable) */}
          <p className={editMode ? "disabled-text" : ""}>
            {formatDate(lot.createdOn)}
          </p>

          {/* Modified On (NOT editable) */}
          <p className={editMode ? "disabled-text" : ""}>
            {formatDate(lot.modifiedOn)}
          </p>
        </div>
      </div>

      <h1>Account</h1>
      <div className="account-actions">
        {/* Edit button (disabled if suspended) */}
        <button
          className={`action-button ${editMode ? "edit-active" : ""}`}
          onClick={toggleEditMode}
          disabled={lot.accountStatus === "suspended"}
          style={{
            opacity: lot.accountStatus === "suspended" ? 0.5 : 1,
            pointerEvents: lot.accountStatus === "suspended" ? "none" : "auto",
          }}
        >
          <img
            className="button-icon"
            src={editMode ? "/assets/EditInverted.svg" : "/assets/Edit.svg"}
            alt="Edit Icon"
          />
          <img
            className="button-icon-hover"
            src="/assets/EditInverted.svg"
            alt="Edit Icon Hover"
          />
          <span>Edit</span>
        </button>

        {/* Pause button toggles paused/active */}
        <button
          className={`action-button ${
            lot.accountStatus === "paused" ? "edit-active" : ""
          }`}
          onClick={() => toggleAccountStatus("paused")}
          disabled={editMode || lot.accountStatus === "suspended"}
          style={{
            opacity:
              editMode || lot.accountStatus === "suspended" ? 0.5 : 1,
            pointerEvents:
              editMode || lot.accountStatus === "suspended"
                ? "none"
                : "auto",
          }}
        >
          <img
            className="button-icon"
            src={
              lot.accountStatus === "paused"
                ? "/assets/PauseInverted.svg"
                : "/assets/Pause.svg"
            }
            alt="Pause Icon"
          />
          <img
            className="button-icon-hover"
            src="/assets/PauseInverted.svg"
            alt="Pause Icon Hover"
          />
          <span>{lot.accountStatus === "paused" ? "Paused" : "Pause"}</span>
        </button>

        {/* Suspend button toggles suspended/active */}
        <button
          className={`action-button ${
            lot.accountStatus === "suspended" ? "edit-active" : ""
          }`}
          onClick={() => toggleAccountStatus("suspended")}
          style={{
            opacity: 1,
            pointerEvents: "auto",
          }}
        >
          <img
            className="button-icon"
            src={
              lot.accountStatus === "suspended"
                ? "/assets/SuspendInverted.svg"
                : "/assets/Suspend.svg"
            }
            alt="Suspend Icon"
          />
          <img
            className="button-icon-hover"
            src="/assets/SuspendInverted.svg"
            alt="Suspend Icon Hover"
          />
          <span>
            {lot.accountStatus === "suspended" ? "Suspended" : "Suspend"}
          </span>
        </button>
      </div>

      {/* (Optional) Log section – commented out for now
      <h2>Log</h2>
      <div className="log-section">
        <div className="log-box">
          <p>Account created on: {formatDate(lot.createdOn)}</p>
        </div>
      </div>
      */}

      {/* Unsaved changes modal */}
      {showModal && (
        <Modal
          title="Please confirm changes"
          message="You have made modifications to this lot. Would you like to save changes?"
          onConfirm={handleSaveChanges}
          onCancel={handleCancelChanges}
          confirmText="Save Changes"
          cancelText="Cancel Changes"
        />
      )}
    </div>
  );
};

export default Customer;
