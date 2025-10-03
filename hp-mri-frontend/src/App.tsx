// src/App.tsx
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import theme from './theme'; // './theme' exports MUI theme object
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// Layout Components
import HomePageLayout from './layouts/HomePageLayout';
import MRDLayout from './layouts/MRDLayout';
import SimpleLayout from './layouts/SimpleLayout';

// Login Pages
import AccountPage from './pages/loginpages/AccountPage';
import SignUpPage from './pages/loginpages/SignUpPage';
import ConfirmSignUpPage from './pages/loginpages/ConfirmSignUpPage';

// Homepage
import HomePage from './pages/homepages/HomePage';
import AboutPage from './pages/homepages/MembersPage';
import ConceptPage from './pages/homepages/ConceptPage';
import ConvertStorePage from './pages/homepages/ConvertStorePage';
import ReconstructionToolsPage from './pages/homepages/ReconstructionToolsPage';
import SimulatePage from './pages/homepages/SimulatePage';
import PublicationPage from './pages/homepages/PublicationPage';
import MRCalculatorPage from './pages/calculator/MRCalculatorPage';

// Feature pages
import RetrievePage from './pages/mrdpages/RetrievePage';
import SimulatorPage from './pages/simulatorpages/SimulatorPage';
import NewSimulatorPage from './pages/simulatorpages/NewSimulatorPage';
import ViewerPage from './pages/viewerpages/ViewerPage';

const APP_VERSION = 'MEDCAP © 2025';

const AppContent: React.FC = () => {
  return (
    <>
      {/* Routes with appropriate layout wrappers */}
      <Routes>
          {/* Login Pages - Simple Layout (no header/footer) */}
          <Route path="/account" element={<SimpleLayout><AccountPage /></SimpleLayout>} />
          <Route path="/signup" element={<SimpleLayout><SignUpPage /></SimpleLayout>} />
          <Route path="/confirm-signup" element={<SimpleLayout><ConfirmSignUpPage /></SimpleLayout>} />

          {/* Homepage Pages - Home Layout (Homepage Header + Footer) */}
          <Route path="/" element={<HomePageLayout><HomePage /></HomePageLayout>} />
          <Route path="/members" element={<HomePageLayout><AboutPage /></HomePageLayout>} />
          <Route path="/publication" element={<HomePageLayout><PublicationPage /></HomePageLayout>} />
          <Route path="/mr-coil-calculator" element={<HomePageLayout><MRCalculatorPage /></HomePageLayout>} />
          <Route path="/concept" element={<HomePageLayout><ConceptPage /></HomePageLayout>} />
          <Route path="/convert-store" element={<HomePageLayout><ConvertStorePage /></HomePageLayout>} />
          <Route path="/reconstruction-tools" element={<HomePageLayout><ReconstructionToolsPage /></HomePageLayout>} />
          <Route path="/simulate" element={<HomePageLayout><SimulatePage /></HomePageLayout>} />

          {/* MRD Files - MRD Layout (HeaderAccount) */}
          <Route path="/mrd-files" element={<ProtectedRoute><MRDLayout><RetrievePage /></MRDLayout></ProtectedRoute>} />

          {/* Simulator & Viewer - MRD Layout */}
          <Route path="/simulator" element={<MRDLayout><SimulatorPage /></MRDLayout>} />
          <Route path="/new-simulator" element={<MRDLayout><NewSimulatorPage /></MRDLayout>} />
          <Route path="/viewer" element={<SimpleLayout><ViewerPage /></SimpleLayout>} />

      </Routes>

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
