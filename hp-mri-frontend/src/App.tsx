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
import AboutPage from './pages/AboutPage';
import ConceptPage from './pages/ConceptPage';
import ConvertStorePage from './pages/ConvertStorePage';
import VisualizeAnalyzePage from './pages/VisualizeAnalyzePage';
import SimulatePage from './pages/SimulatePage';
import ImagesPage from './pages/ImagesPage';
import SimulatorPage from './pages/SimulatorPage';
import AccountPage from './pages/AccountPage';
import ImagesDetails from './pages/ImagesDetails';
import SolutionPage from './pages/SolutionPage';
import PublicationPage from './pages/PublicationPage';
import ResearchPage from './pages/ResearchPage';
import NewSimulatorPage from './pages/NewSimulatorPage';
import VisualizationPage from './pages/visualization/VisualizationPage'
import VisualizationAbout from './pages/visualization/VisualizationAbout';

const AppContent: React.FC = () => {
  const location = useLocation();

  // Define pages where HeaderAccount should not appear
  const hideHeaderRoutes = ['/', '/account', '/about-devs', '/visualize-analyze', '/concept', '/convert-store', '/simulate', '/visualize'];

  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  return (
    <div>
      {shouldShowHeader && <HeaderAccount />}
      <div style={{ display: 'flex', marginTop: location.pathname !== '/visualize' ? 74 : 0 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mrd-files" element={<RetrievePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/file-details/:fileId" element={<MRDFileDetails />} />
          <Route path="/about-devs" element={<AboutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/visualize-analyze" element={<VisualizeAnalyzePage />} />
          <Route path="/concept" element={<ConceptPage />} />
          <Route path="/convert-store" element={<ConvertStorePage />} />
          <Route path="/simulate" element={<SimulatePage />} />
          <Route path="/images" element={<ImagesPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/images-details/:imageId/:fileId" element={<ImagesDetails />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/solution" element={<SolutionPage />} />
          <Route path="/publication" element={<PublicationPage />} />
          <Route path="/new-simulator" element={<NewSimulatorPage />} />
          <Route path="/visualize" element={<VisualizationPage />} />
          <Route path="/visualize-about" element={<VisualizationAbout />} />
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
