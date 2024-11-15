// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './../styles/pages.css';
import SImage from './../images/s_image.png';

const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      <h1 className="home-title">PIGI Lab MEDCAP</h1>
      <h1 className="home-title">HP-MRI Web Application</h1>
      <p className="home-subtitle">Format and Store, Simulate and Analyze MRI Instrument Data</p>

      <div className="home-buttons">
        <Link to="/">
          <button className="primary">Tool Box</button>
        </Link>
        <button className="primary">GitHub</button>
        <button className="primary">PIGLAB</button>
      </div>

      <img
        src={SImage}
        alt="MRI Machine"
        className="home-image"
      />
      <h2>Guides</h2>
    </div>
  );
};

export default HomePage;
