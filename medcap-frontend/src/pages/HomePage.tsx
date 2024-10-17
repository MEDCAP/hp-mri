// src/pages/HomePage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './../styles/pages.css';

const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      <h1 className="home-title">MEDCAP</h1>
      <p className="home-subtitle">Format and Store, Simulate and Analyze MRI Instrument Data</p>

      <div className="home-buttons">
        <Link to="/retrieve">
          <button className="button primary">Retrieve</button>
        </Link>
        <Link to="/upload">
          <button className="button primary">Upload</button>
        </Link>
        <button className="button secondary">Guides</button>
        <button className="button secondary">PIGLAB</button>
      </div>

      <img
        src="mri_machine_image_url"
        alt="MRI Machine"
        className="home-image"
      />
    </div>
  );
};

export default HomePage;
