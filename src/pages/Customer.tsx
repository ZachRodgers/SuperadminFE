import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Customer.css";
import lotsData from "../data/Lots.json";
import Modal from "../components/Modal";

interface Lot {
  purchaserName: string;
  companyName: string;
  lotName: string;
  lotID: string;
  address: string;
  location: string;
  purchaseDate: string;
  accountCreated: string;
  lastActivity: string;
  passwordChange: string;
  adminPassword: string;
}

const Customer: React.FC = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const [lot, setLot] = useState<Lot | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editableFields, setEditableFields] = useState<Partial<Lot>>({});
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    const foundLot = lotsData.find((item) => item.lotID === lotId);
    if (foundLot) {
      setLot(foundLot);
      setEditableFields({
        purchaserName: foundLot.purchaserName,
        companyName: foundLot.companyName,
        lotName: foundLot.lotName,
        address: foundLot.address,
        location: foundLot.location,
        adminPassword: foundLot.adminPassword,
      });
    }
  }, [lotId]);

  const handleFieldChange = (field: keyof Lot, value: string) => {
    setEditableFields((prevFields) => ({
      ...prevFields,
      [field]: value,
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

  const saveChangesToServer = async (updatedLots: Lot[]) => {
    try {
      const response = await fetch("http://localhost:5000/update-lots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedLots),
      });

      if (response.ok) {
        console.log("Lots.json updated successfully.");
      } else {
        console.error("Failed to update Lots.json.");
      }
    } catch (error) {
      console.error("Error updating Lots.json:", error);
    }
  };

  const saveChangesToJSON = () => {
    if (lot) {
      const updatedLots = lotsData.map((item) =>
        item.lotID === lotId
          ? { ...item, ...editableFields }
          : item
      );

      saveChangesToServer(updatedLots);

      setLot((prevLot) => ({
        ...prevLot!,
        ...editableFields,
      }));
      setUnsavedChanges(false);
      setEditMode(false);
    }
  };

  const handleSaveChanges = () => {
    saveChangesToJSON();
    setShowModal(false);

    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setPendingNavigation(null);
  };

  const handleCancelChanges = () => {
    setEditableFields({
      purchaserName: lot?.purchaserName,
      companyName: lot?.companyName,
      lotName: lot?.lotName,
      address: lot?.address,
      location: lot?.location,
      adminPassword: lot?.adminPassword,
    });
    setUnsavedChanges(false);
    setEditMode(false);
    setShowModal(false);

    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setPendingNavigation(null);
  };

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

  return (
    <div className="customer-page">
      <h1>Customer</h1>
      <div className="customer-details">
        <div className="customer-column">
          <p>Purchaser Name:</p>
          <p>Company Name:</p>
          <p>Lot Name:</p>
          <p>LotID:</p>
          <p>Address:</p>
          <p>Location:</p>
          <p>Purchase Date:</p>
          <p>Account Created:</p>
          <p>Last Activity:</p>
          <p>Password Change:</p>
          <p>Admin Password:</p>
        </div>

        <div className="customer-column">
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange(
                "purchaserName",
                e.currentTarget.textContent || ""
              )
            }
          >
            {editableFields.purchaserName || lot.purchaserName}
          </p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange(
                "companyName",
                e.currentTarget.textContent || ""
              )
            }
          >
            {editableFields.companyName || lot.companyName}
          </p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("lotName", e.currentTarget.textContent || "")
            }
          >
            {editableFields.lotName || lot.lotName}
          </p>
          <p className={editMode ? "disabled-text" : ""}>{lot.lotID}</p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("address", e.currentTarget.textContent || "")
            }
          >
            {editableFields.address || lot.address}
          </p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange("location", e.currentTarget.textContent || "")
            }
          >
            {editableFields.location || lot.location}
          </p>
          <p className={editMode ? "disabled-text" : ""}>{lot.purchaseDate}</p>
          <p className={editMode ? "disabled-text" : ""}>
            {lot.accountCreated}
          </p>
          <p className={editMode ? "disabled-text" : ""}>{lot.lastActivity}</p>
          <p className={editMode ? "disabled-text" : ""}>{lot.passwordChange}</p>
          <p
            contentEditable={editMode}
            suppressContentEditableWarning={true}
            className={editMode ? "editable-highlight" : ""}
            onBlur={(e) =>
              handleFieldChange(
                "adminPassword",
                e.currentTarget.textContent || ""
              )
            }
          >
            {editableFields.adminPassword || lot.adminPassword}
          </p>
        </div>
      </div>

      <h2>Account</h2>
      <div className="account-actions">
        <button
          className={`action-button ${editMode ? "edit-active" : ""}`}
          onClick={toggleEditMode}
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
        <button
          className="action-button"
          disabled={editMode}
          style={{
            pointerEvents: editMode ? "none" : "auto",
            opacity: editMode ? 0.5 : 1,
          }}
        >
          <img
            className="button-icon"
            src="/assets/Pause.svg"
            alt="Pause Icon"
          />
          <img
            className="button-icon-hover"
            src="/assets/PauseInverted.svg"
            alt="Pause Icon Hover"
          />
          <span>Pause</span>
        </button>
        <button
          className="action-button"
          disabled={editMode}
          style={{
            pointerEvents: editMode ? "none" : "auto",
            opacity: editMode ? 0.5 : 1,
          }}
        >
          <img
            className="button-icon"
            src="/assets/Suspend.svg"
            alt="Suspend Icon"
          />
          <img
            className="button-icon-hover"
            src="/assets/SuspendInverted.svg"
            alt="Suspend Icon Hover"
          />
          <span>Suspend</span>
        </button>
      </div>

      <h2>Log</h2>
      <div className="log-section">
        <div className="log-box">
          <p>Account created on: {lot.accountCreated}</p>
        </div>
      </div>

      {showModal && (
        <Modal
          title="Please confirm changes"
          message="You have made modifications to this customer's profile. Would you like to save changes?"
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
