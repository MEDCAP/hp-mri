// src/pages/HomePage.tsx
import React from 'react';
import './../styles/publicationPage.css';
import HeaderHomepage from '../components/HeaderHomepage';
import FooterHomepage from '../components/FooterHomepage';

const PublicationPage: React.FC = () => {
  return (
    <div className="publication-container">
      <HeaderHomepage />
      <h1 className="publication-title">Publication Page</h1>
      <p className="publication-description">Currently Work-in-Progress</p>
      <FooterHomepage />
    </div>
  );
};

export default PublicationPage;
