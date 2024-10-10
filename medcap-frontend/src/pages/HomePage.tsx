// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './../styles/pages.css';
import S_Image from './../images/s_image.png';

const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      <h1 className="home-title">MEDCAP</h1>
      <p className="home-subtitle">Format and Store, Simulate and Analyze MRI Instrument Data</p>

      <div className="home-buttons">
        <Link to="/">
          <button className="button primary">Tool Box</button>
        </Link>
        <button className="button secondary">GitHub</button>
        <button className="button secondary">PIGLAB</button>
      </div>

      <img
        src={S_Image}
        alt="MRI Machine"
        className="home-image"
      />
      <h2>Guides</h2>
    </div>
  );
};

export default HomePage;
