import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./Customer.css";
import lotsData from "../data/Lots.json";

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
  const [lot, setLot] = useState<Lot | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const foundLot = lotsData.find((item: any) => item.lotID === lotId);
    if (foundLot) setLot(foundLot);
  }, [lotId]);

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
        {/* Left Column */}
        <div className="customer-column">
          <p>Purchaser Name:</p>
          <p>Company Name:</p>
          <p>Lot Name:</p>
          <p>LotID:</p>
          <p>Address:</p>
          <p>Location:</p>
          <p></p>
          <p></p>
          <p></p>
          <p>Purchase Date:</p>
          <p>Account Created:</p>
          <p>Last Activity:</p>
          <p>Password Change:</p>
          <p>Admin Password:</p>
        </div>

        {/* Right Column */}
        <div className="customer-column">
          <p>{lot.purchaserName}</p>
          <p>{lot.companyName}</p>
          <p>{lot.lotName}</p>
          <p>{lot.lotID}</p>
          <p>{lot.address}</p>
          <p>{lot.location}</p>
          <p></p>
          <p></p>
          <p></p>
          <p>{lot.purchaseDate}</p>
          <p>{lot.accountCreated}</p>
          <p>{lot.lastActivity}</p>
          <p>{lot.passwordChange}</p>
          <p
            className="admin-password"
            onMouseEnter={() => setShowPassword(true)}
            onMouseLeave={() => setShowPassword(false)}
          >
            {showPassword ? lot.adminPassword : "********"}
          </p>
        </div>
      </div>

      <h2>Account</h2>
      <div className="account-actions">
        <button className="action-button">
          <img
            className="button-icon"
            src="/assets/Edit.svg"
            alt="Edit Icon"
          />
          <img
            className="button-icon-hover"
            src="/assets/EditInverted.svg"
            alt="Edit Icon Hover"
          />
          <span>Edit</span>
        </button>
        <button className="action-button">
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
        <button className="action-button">
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
    </div>
  );
};

export default Customer;
