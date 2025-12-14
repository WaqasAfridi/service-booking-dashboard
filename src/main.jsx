// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// NOTE:
// Theme initialization is intentionally omitted here so the inline script
// in index.html (which runs before React mounts) controls the initial theme.
// This prevents a flash-of-incorrect-theme and avoids race conditions.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
