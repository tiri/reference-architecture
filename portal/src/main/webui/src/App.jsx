import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Notification from './components/Notification';

const CrmApp     = lazy(() => import('crmApp/Routes'));
const BillingApp = lazy(() => import('billingApp/Routes'));

function Loading({ name }) {
  return (
    <div className="flex items-center gap-3 p-8 text-slate-400">
      <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />
      Loading {name}…
    </div>
  );
}

class RemoteError extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="m-6 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
          {this.props.name} failed to load. Make sure the domain service is running.
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedPage({ children }) {
  const { pathname } = useLocation();
  return <div key={pathname} className="animate-fade-up">{children}</div>;
}

export default function App() {
  const [user, setUser]           = useState(null);
  const [apps, setApps]           = useState([]);
  const [orgs, setOrgs]           = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);

  useEffect(() => {
    fetch('/api/portal/user').then(r => r.ok ? r.json() : null).then(setUser).catch(() => null);
    fetch('/api/portal/apps').then(r => r.ok ? r.json() : []).then(setApps).catch(() => []);
    fetch('/api/portal/orgs')
      .then(r => r.ok ? r.json() : [])
      .then(list => { setOrgs(list); if (list.length > 0) setSelectedOrg(list[0]); })
      .catch(() => []);
  }, []);

  // Domain apps receive the key string — they use it in query params only.
  const orgKey = selectedOrg?.key ?? null;

  return (
    <BrowserRouter>
      <Header user={user} apps={apps} orgs={orgs} selectedOrg={selectedOrg} onOrgChange={setSelectedOrg} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={
            <AnimatedPage><Dashboard apps={apps} org={selectedOrg} /></AnimatedPage>
          } />
          <Route path="/crm/*" element={
            <AnimatedPage>
              <RemoteError name="CRM">
                <Suspense fallback={<Loading name="CRM" />}>
                  <CrmApp org={orgKey} />
                </Suspense>
              </RemoteError>
            </AnimatedPage>
          } />
          <Route path="/billing/*" element={
            <AnimatedPage>
              <RemoteError name="Billing">
                <Suspense fallback={<Loading name="Billing" />}>
                  <BillingApp org={orgKey} />
                </Suspense>
              </RemoteError>
            </AnimatedPage>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Notification />
    </BrowserRouter>
  );
}
