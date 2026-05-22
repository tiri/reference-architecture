import './styles.css';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BillingDashboard from './pages/Dashboard';

export default function BillingRoutes({ org }) {
  return (
    <Routes>
      <Route index element={<BillingDashboard org={org} />} />
    </Routes>
  );
}
