import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CrmRoutes from './Routes';

// Standalone mode for local development — the portal provides BrowserRouter in prod.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <div style={{ padding: '2rem' }}>
      <CrmRoutes />
    </div>
  </BrowserRouter>
);
