import React from 'react';
import ReactDOM from 'react-dom/client'; // Updated import for React 18
import App from './App';
import './App.css';

const rootElement = document.getElementById('root') as HTMLElement; // Type assertion for TypeScript

// Use ReactDOM.createRoot instead of ReactDOM.render
const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
