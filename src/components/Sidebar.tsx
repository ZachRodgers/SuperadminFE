import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lotId } = useParams<{ lotId: string }>(); // get lotId from URL

  // Format the lot ID by:
  // 1) Removing the prefix "PWP-PL-" if present.
  // 2) Zero-padding the numeric part to 8 digits if shorter.
  // 3) Splitting into two groups of 4 digits with a dash.
  const formatLotId = (rawId: string): string => {
    const prefix = "PWP-PL-";
    let numericPart = rawId;

    // 1) Remove prefix if it exists
    if (numericPart.startsWith(prefix)) {
      numericPart = numericPart.substring(prefix.length);
    }

    // 2) Pad to 8 digits if needed
    if (numericPart.length < 8) {
      numericPart = numericPart.padStart(8, '0');
    }

    // 3) Insert dash between the first 4 and next 4
    //    (assuming numericPart is at least 8 chars now)
    return numericPart.slice(0, 4) + '-' + numericPart.slice(4, 8);
  };

  // Determine active page
  const getActivePage = (): string | null => {
    if (location.pathname.includes("device-manager")) return "device-manager";
    if (location.pathname.includes("vehicle-log")) return "vehicle-log";
    if (location.pathname.includes("transaction-log")) return "transaction-log";
    if (location.pathname.includes("customer")) return "customer";
    return null;
  };

  const activePage = getActivePage();

  return (
    <div className="sidebar">
      <div className="logo">
        <img src="/assets/LogotypeSuperadmin.svg" alt="Parallel Superadmin Logo" />
      </div>

      <div className="device-id">
        {/* Only format if we actually have a lotId */}
        {lotId ? formatLotId(lotId) : ""}
      </div>

      <div className="back-button" onClick={() => navigate("/dashboard")}>
        <img src="/assets/BackArrow.svg" alt="Back Arrow" />
        <span>Back</span>
      </div>

      <ul className="menu">
        <li
          className={activePage === "device-manager" ? "active" : ""}
          onClick={() => navigate(`/lot/${lotId}/device-manager`)}
        >
          <button>Device Manager</button>
        </li>
        <li
          className={activePage === "vehicle-log" ? "active" : ""}
          onClick={() => navigate(`/lot/${lotId}/vehicle-log`)}
        >
          <button>Vehicle Log</button>
        </li>
        <li
          className={activePage === "transaction-log" ? "active" : ""}
          onClick={() => navigate(`/lot/${lotId}/transaction-log`)}
        >
          <button>Transaction Log</button>
        </li>
        <li
          className={activePage === "customer" ? "active" : ""}
          onClick={() => navigate(`/lot/${lotId}/customer`)}
        >
          <button>Customer</button>
        </li>
      </ul>

      <div className="footer">
        <button
          className="link-button"
          onClick={() => window.open("https://google.com", "_blank")}
        >
          🡥 Admin Portal
        </button>
        <button
          className="link-button"
          onClick={() => alert("Messaging Functionality coming soon...")}
        >
          Send Message
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
