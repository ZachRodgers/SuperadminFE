import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import "./Sidebar.css";

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lotId } = useParams<{ lotId: string }>(); // get lotId from URL

  // Format the lot ID by removing the prefix "PWP-PL-" if present
  const formatLotId = (rawId: string): string => {
    const prefix = "PWP-PL-";
    if (rawId.startsWith(prefix)) {
      return rawId.substring(prefix.length);
    }
    return rawId;
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
          onClick={() => {
            const token = localStorage.getItem('token');
            if (token && lotId) {
              // Encode the token to make it URL-safe
              const encodedToken = encodeURIComponent(token);
              window.open(
                `https://operator.parkwithparallel.com/lot/${lotId}/revenue-dashboard?superadmin=true&token=${encodedToken}`,
                "_blank"
              );
            } else {
              alert("Your session has expired or lot ID is missing.");
            }
          }}
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
