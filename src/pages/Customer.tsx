import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Customer.css";
import Modal from "../components/Modal";

const BASE_URL = "http://localhost:8085/ParkingWithParallel/parkinglots";
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

const Customer: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const [lot, setLot] = useState<LotData | null>(null);
  const [editableFields, setEditableFields] = useState<Partial<LotData>>({});
  const [editMode, setEditMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLot = async (id: string) => {
    try {
      const response = await fetch(`${BASE_URL}/${id}`);
      if (!response.ok) return;
      const data: LotData = await response.json();
      setLot(data);
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
      const response = await fetch(`${BASE_URL.replace("parkinglots", "users")}/${userId}`);
      return response.ok;
    } catch {
      return false;
    }
  };

  const saveChangesToDB = async () => {
    if (!lot) return;
    if (!editableFields.companyName || !editableFields.address || !editableFields.lotName || !editableFields.ownerCustomerId) {
      setErrorMessage("Fill out all required fields: Company Name, Address, Lot Name, Owner Customer ID.");
      return;
    }
    const ownerExists = await checkOwnerExists(editableFields.ownerCustomerId);
    if (!ownerExists) {
      setErrorMessage("Owner Customer ID does not exist. Please create the user first.");
      return;
    }
    const updatedLot: LotData = {
      ...lot,
      companyName: editableFields.companyName ?? lot.companyName,
      address: editableFields.address ?? lot.address,
      lotName: editableFields.lotName ?? lot.lotName,
      ownerCustomerId: editableFields.ownerCustomerId ?? lot.ownerCustomerId,
      lotCapacity: editableFields.lotCapacity !== undefined ? editableFields.lotCapacity : lot.lotCapacity,
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
        const errorText = await response.text();
        if (errorText.includes("violates foreign key constraint")) {
          setErrorMessage("Invalid Owner Customer ID. Create the user first.");
        } else if (errorText.includes("duplicate key value violates unique constraint")) {
          setErrorMessage("Lot ID already in use.");
        } else {
          setErrorMessage(`Error updating lot: ${errorText}`);
        }
        return;
      }
      setLot(updatedLot);
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

  const toggleAccountStatus = async (newStatus: "paused" | "suspended") => {
    if (!lot) return;
    const updatedStatus = lot.accountStatus === newStatus ? "active" : newStatus;
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
      if (!response.ok) return;
      setLot(updatedLot);
    } catch (error) {
      console.error("Error updating account status:", error);
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
          <p>Owner Customer ID:</p>
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
            onBlur={(e) => handleFieldChange("ownerCustomerId", e.currentTarget.textContent || "")}
          >
            {editableFields.ownerCustomerId ?? lot.ownerCustomerId}
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
          <img className="button-icon-hover" src="/assets/EditInverted.svg" alt="Edit Icon Hover" />
          <span>Edit</span>
        </button>
        <button
          className={`action-button ${lot.accountStatus === "paused" ? "edit-active" : ""}`}
          onClick={() => toggleAccountStatus("paused")}
          disabled={editMode || lot.accountStatus === "suspended"}
          style={{
            opacity: editMode || lot.accountStatus === "suspended" ? 0.5 : 1,
            pointerEvents: editMode || lot.accountStatus === "suspended" ? "none" : "auto",
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
          className={`action-button ${lot.accountStatus === "suspended" ? "edit-active" : ""}`}
          onClick={() => toggleAccountStatus("suspended")}
          style={{ opacity: 1, pointerEvents: "auto" }}
        >
          <img
            className="button-icon"
            src={lot.accountStatus === "suspended" ? "/assets/SuspendInverted.svg" : "/assets/Suspend.svg"}
            alt="Suspend Icon"
          />
          <img className="button-icon-hover" src="/assets/SuspendInverted.svg" alt="Suspend Icon Hover" />
          <span>{lot.accountStatus === "suspended" ? "Suspended" : "Suspend"}</span>
        </button>
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
    </div>
  );
};

export default Customer;
