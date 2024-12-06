// src/pages/HomePage.tsx
import React from 'react';
import './../styles/aboutPage.css';
import HeaderHomepage from '../components/HeaderHomepage';
import FooterHomepage from '../components/FooterHomepage';
import PennBuilding from './../images/penn-building-image.png'

const AboutPage: React.FC = () => {
  return (
    <div className='about-container'>
      <HeaderHomepage />
      <div className='left-column'>
        <h1>The Metabolic Discovery Center at Penn</h1>
        <p>
          The MEDCAP is a research group at the University of Pennsylvania Department of Radiology. 
          We work at the interface between medical imaging technology and the biological features that lead to disease.
        </p>
      </div>
      <div className='right-column'>
        <img src={PennBuilding} alt="Penn Med Building" />
      </div>
      <FooterHomepage />
    </div>
  );
};

export default AboutPage;
