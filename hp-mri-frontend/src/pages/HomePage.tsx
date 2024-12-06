// src/pages/HomePage.tsx
import React from 'react';
import './../styles/homepage.css';
import HeaderHomepage from '../components/HeaderHomepage';
import FooterHomepage from '../components/FooterHomepage';
import MedcapTop from './../images/medcap_top_image.png';

const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      <HeaderHomepage />
      <h1 className="top-title">Welcome to the MEDCAP</h1>
      {/* Top image of Medcap goal */}
      <img src={MedcapTop} alt="top-image" className="homepage-top-image" />

      <FooterHomepage />
    </div>
  );
};

export default HomePage;
