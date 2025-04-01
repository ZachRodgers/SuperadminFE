import React from 'react';
import './Notifications.css';

interface Notification {
  id: number;
  message: string;
  type: 'new' | 'old';
}

interface NotificationsProps {
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ onClose }) => {
  const notifications = [
    { id: 1, message: 'Not Implemented', type: 'new' },
    { id: 2, message: 'Not Implemented', type: 'old' },
  ];

  const newNotifications = notifications.filter((n) => n.type === 'new');
  const oldNotifications = notifications.filter((n) => n.type === 'old');

  return (
    <div className="notifications">
      <div className="notifications-content">
        <div className="notifications-section">
          <h5>{newNotifications.length} New Notifications </h5>
          {newNotifications.map((n) => (
            <div key={n.id} className="notification-item new">
              <span className="notification-dot"></span>
              {n.message}
            </div>
          ))}
        </div>
        <div className="notifications-section">
          <h5>Old Notifications</h5>
          {oldNotifications.map((n) => (
            <div key={n.id} className="notification-item">
              {n.message}
            </div>
          ))}
        </div>
        <button
          className="view-more"
          onClick={() => alert('Coming soon...')}
        >
          View More
        </button>
      </div>
    </div>
  );
};

export default Notifications;
