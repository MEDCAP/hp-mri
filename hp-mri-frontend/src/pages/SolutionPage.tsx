// src/pages/HomePage.tsx
import React from 'react';
import './../styles/solutionPage.css';
import HeaderHomepage from '../components/HeaderHomepage';
import FooterHomepage from '../components/FooterHomepage';

const SolutionPage: React.FC = () => {
  return (
    <div className="solution-container">
      <HeaderHomepage />
      <h1 className="solution-title">Solution Page</h1>
      <p className="solution-description">Currently Work-in-Progress</p>
      <FooterHomepage />
    </div>
  );
};
export default SolutionPage;
