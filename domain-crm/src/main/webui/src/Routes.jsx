import './styles.css';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CrmDashboard from './pages/Dashboard';

// Mounted by the portal at /crm/*. Uses <Routes> (not <BrowserRouter>) to share
// the portal's router. org prop is provided by the portal shell.
export default function CrmRoutes({ org }) {
  return (
    <Routes>
      <Route index element={<CrmDashboard org={org} />} />
    </Routes>
  );
}
