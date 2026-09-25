// src/App.tsx
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import theme from './theme'; // './theme' exports MUI theme object
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';

// Layout Components
import HomePageLayout from './layouts/HomePageLayout';
import MRDLayout from './layouts/MRDLayout';
import SimpleLayout from './layouts/SimpleLayout';

// Login Pages
import AccountPage from './features/auth/AccountPage';
import SignUpPage from './features/auth/SignUpPage';
import ConfirmSignUpPage from './features/auth/ConfirmSignUpPage';

// Homepage
import HomePage from './features/home/HomePage';
import AboutPage from './features/home/MembersPage';
import ConceptPage from './features/home/ConceptPage';
import ConvertStorePage from './features/home/ConvertStorePage';
import ReconstructionToolsPage from './features/home/ReconstructionToolsPage';
import PublicationPage from './features/home/PublicationPage';
import MRCalculatorPage from './features/calculator/MRCalculatorPage';

// Feature pages
import RetrievePage from './features/files/RetrievePage';
import SimulatorPage from './features/simulator/SimulatorPage';
import ViewerPage from './pages/viewerpages/ViewerPage';

// Group pages
import GroupsPage from './pages/grouppages/GroupsPage';
import GroupDetailPage from './pages/grouppages/GroupDetailPage';

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
          <Route path="/simulate" element={<Navigate to="/simulator" replace />} />

          {/* MRD Files - MRD Layout (HeaderAccount) — accessible to guests (public files only) */}
          <Route path="/mrd-files" element={<MRDLayout><RetrievePage /></MRDLayout>} />

          {/* Groups - MRD Layout */}
          <Route path="/groups" element={<ProtectedRoute><MRDLayout><GroupsPage /></MRDLayout></ProtectedRoute>} />
          <Route path="/groups/:groupName" element={<ProtectedRoute><MRDLayout><GroupDetailPage /></MRDLayout></ProtectedRoute>} />

          {/* Simulator — incomplete, show coming soon within MRD layout */}
          <Route path="/simulator" element={<MRDLayout><SimulatorPage /></MRDLayout>} />
          <Route path="/new-simulator" element={<Navigate to="/simulator" replace />} />
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
