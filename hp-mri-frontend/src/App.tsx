// src/App.tsx
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import theme from './theme'; // './theme' exports MUI theme object
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Components
import HeaderAccount from './components/HeaderAccount';
import UnifiedHeader from './components/UnifiedHeader';

// Login Pages
import AccountPage from './pages/loginpages/AccountPage';
import SignUpPage from './pages/loginpages/SignUpPage';
import ConfirmSignUpPage from './pages/loginpages/ConfirmSignUpPage';

// Homepage
import HomePage from './pages/homepages/HomePage';
import AboutPage from './pages/homepages/AboutPage';
import ConceptPage from './pages/homepages/ConceptPage';
import ConvertStorePage from './pages/homepages/ConvertStorePage';
import ReconstructionToolsPage from './pages/homepages/ReconstructionToolsPage';
import SimulatePage from './pages/homepages/SimulatePage';
import PublicationPage from './pages/homepages/PublicationPage';
import ResearchPage from './pages/homepages/ResearchPage';
import MRCalculatorPage from './pages/calculator/MRCalculatorPage';

// Feature pages
import UploadPage from './pages/mrdpages/UploadPage';
import RetrievePage from './pages/mrdpages/RetrievePage';
import SimulatorPage from './pages/simulatorpages/SimulatorPage';
import NewSimulatorPage from './pages/simulatorpages/NewSimulatorPage';
import ViewerPage from './pages/viewerpages/ViewerPage';

const APP_VERSION = 'MEDCAP © 2025';

const AppContent: React.FC = () => {

  // Define pages where no header should appear
  const hideHeaderRoutes = ['/account', '/about-devs', '/reconstruction-tools', '/concept', '/convert-store', '/simulate', '/visualize', '/mr-coil-calculator'];

  // Define pages where HeaderAccount should be used (MRD files pages)
  const mrdFileRoutes = ['/mrd-files', '/upload'];

  // Determine which header should be shown
  const location = useLocation();
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);
  const isMrdFilePage = mrdFileRoutes.some(route => location.pathname.startsWith(route));

  return (
    // Using a React Fragment to avoid adding an unnecessary extra div wrapper
    <>
      {/* Conditional Header rendering */}
      {shouldShowHeader && (
        isMrdFilePage ? <HeaderAccount /> : <UnifiedHeader />
      )}

      {/* Main content container */}
      <div style={{ display: 'flex', marginTop: location.pathname !== '/visualize' ? 74 : 0 }}>
        <Routes>
          {/* Login Pages */}
          <Route path="/account" element={<AccountPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />

          {/* Homepage */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about-devs" element={<AboutPage />} />
          <Route path="/concept" element={<ConceptPage />} />
          <Route path="/convert-store" element={<ConvertStorePage />} />
          <Route path="/reconstruction-tools" element={<ReconstructionToolsPage />} />
          <Route path="/simulate" element={<SimulatePage />} />
          <Route path="/publication" element={<PublicationPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/mr-coil-calculator" element={<MRCalculatorPage />} />
          
          {/* MRD files */}
          <Route path="/mrd-files" element={<ProtectedRoute><RetrievePage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />

          {/* Simulator */}
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/new-simulator" element={<NewSimulatorPage />} />
          <Route path="/viewer" element={<ViewerPage />} />
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
