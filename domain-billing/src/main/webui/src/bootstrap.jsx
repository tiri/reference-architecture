import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import BillingRoutes from './Routes';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <div style={{ padding: '2rem' }}>
      <BillingRoutes />
    </div>
  </BrowserRouter>
);
