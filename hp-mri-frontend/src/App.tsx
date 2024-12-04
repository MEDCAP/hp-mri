// src/App.tsx
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

import HeaderAccount from './components/HeaderAccount';
import UploadPage from './pages/UploadPage';
import RetrievePage from './pages/RetrievePage';
import MRDFileDetails from './pages/MRDFileDetails';
import HomePage from './pages/HomePage';
import ImagesPage from './pages/ImagesPage';
import SimulatorPage from './pages/SimulatorPage';
import AccountPage from './pages/AccountPage';
import ImagesDetails from './pages/ImagesDetails';

const AppContent: React.FC = () => {
  const location = useLocation();

  // Define pages where HeaderAccount should not appear
  const hideHeaderRoutes = ['/about', '/account'];

  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <div>
      {shouldShowHeader && <HeaderAccount />}
      <div style={{ display: 'flex', marginTop: 74 }}>
          <Routes>
            <Route path="/about" element={<HomePage />} />
            <Route path="/" element={<RetrievePage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/file-details/:fileId" element={<MRDFileDetails />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/images-details/:imageId/:fileId" element={<ImagesDetails />} />
          </Routes>
        </div>
      </div>
  );
};

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;
