import React from 'react';
import './Modal.css';

const Modal = ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="confirm" onClick={onConfirm}>{confirmText}</button>
          <button className="cancel" onClick={onCancel}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
