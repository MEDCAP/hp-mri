// src/App.tsx
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import theme from './theme'; // './theme' exports MUI theme object
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

import HeaderAccount from './components/HeaderAccount';
// All page imports
import UploadPage from './pages/mrdpages/UploadPage';
import RetrievePage from './pages/mrdpages/RetrievePage';
import MRDFileDetails from './pages/mrdpages/MRDFileDetails';
import HomePage from './pages/homepages/HomePage';
import AboutPage from './pages/homepages/AboutPage';
import ConceptPage from './pages/homepages/ConceptPage';
import ConvertStorePage from './pages/homepages/ConvertStorePage';
import ReconstructionToolsPage from './pages/homepages/ReconstructionToolsPage';
import SimulatePage from './pages/homepages/SimulatePage';
import ImagesPage from './pages/imagepages/ImagesPage';
import SimulatorPage from './pages/simulatorpages/SimulatorPage';
import AccountPage from './pages/loginpages/AccountPage';
import ImagesDetails from './pages/imagepages/ImagesDetails';
import PublicationPage from './pages/homepages/PublicationPage';
import ResearchPage from './pages/homepages/ResearchPage';
import NewSimulatorPage from './pages/simulatorpages/NewSimulatorPage';
import VisualizationPage from './pages/viewerpages/VisualizationPage';
import MRCalculatorPage from './pages/calculator/MRCalculatorPage';

const APP_VERSION = 'BY: ' + 'v2.0.5';

const AppContent: React.FC = () => {
  const location = useLocation();

  // Define pages where HeaderAccount should not appear
  const hideHeaderRoutes = ['/', '/account', '/about-devs', '/reconstruction-tools', '/concept', '/convert-store', '/simulate', '/visualize', '/mr-coil-calculator'];

  // Determine if header should be shown
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    // Using a React Fragment to avoid adding an unnecessary extra div wrapper
    <>
      {/* Conditional Header rendering */}
      {shouldShowHeader && <HeaderAccount />}

      {/* Main content container */}
      <div style={{ display: 'flex', marginTop: location.pathname !== '/visualize' ? 74 : 0 }}>
        <Routes>
          {/* Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/mrd-files" element={<RetrievePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/file-details/:fileId" element={<MRDFileDetails />} />
          <Route path="/about-devs" element={<AboutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/reconstruction-tools" element={<ReconstructionToolsPage />} />
          <Route path="/concept" element={<ConceptPage />} />
          <Route path="/convert-store" element={<ConvertStorePage />} />
          <Route path="/simulate" element={<SimulatePage />} />
          <Route path="/images" element={<ImagesPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/images-details/:imageId/:fileId" element={<ImagesDetails />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/publication" element={<PublicationPage />} />
          <Route path="/new-simulator" element={<NewSimulatorPage />} />
          <Route path="/visualize" element={<VisualizationPage />} />
          <Route path="/mr-coil-calculator" element={<MRCalculatorPage />} />
        </Routes>
      </div>

      {/* Version Display - Using Box component for the sx prop */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          padding: '4px 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          color: theme?.palette?.text?.secondary || '#888',
          fontSize: '0.7rem',
          lineHeight: 1,
          borderTopLeftRadius: theme?.shape?.borderRadius || 4,
          zIndex: theme?.zIndex?.tooltip ? theme.zIndex.tooltip + 1 : 1301,
          userSelect: 'none',
        }}
      >
        {APP_VERSION}
      </Box>
    </> // Close the React Fragment
  );
};

// App component
const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <AppContent />
    </Router>
  </ThemeProvider>
);

// Export
export default App;
