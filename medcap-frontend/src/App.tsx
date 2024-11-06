// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import RetrievePage from './pages/RetrievePage';
import MRDFileDetails from './pages/MRDFileDetails'
import HomePage from './pages/HomePage';
import UploadPage from './pages/UploadPage';
import ImagesPage from './pages/ImagesPage';
import SimulatorPage from './pages/SimulatorPage';
import AccountPage from './pages/AccountPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/about" element={<HomePage />} />
        <Route path="/" element={<RetrievePage />} />
        <Route path="/file-details/:fileName" element={<MRDFileDetails />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/simulator" element={<SimulatorPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Routes>
    </Router>
  );
};

export default App;
