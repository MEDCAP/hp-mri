// src/components/HeaderAccount.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './../styles/headerHomepage.css';
import Medcap from './../assets/medcap.png'

const HeaderHomepage: React.FC = () => {
  return (
    <header className="header-homepage">
      {/* App Logo and title MEDCAP as an image that links to the root page */}
      <div className="header-left">
        <Link to="/">
          <img src={Medcap} alt="App Logo" className="app-logo" />
          <h1 className="home-title">MEDCAP</h1>
        </Link>
      </div>

      {/* Right section with About and icons */}
      <div className="header-right">
        {/* AboutUs */}
        <Link to="/research" className="header-link">Research</Link>
        {/* About */}
        <Link to="/about" className="header-link">About</Link>
        {/* Solutions section */}
        <Link to="/solution" className="header-link">Solutions</Link>
        {/* Publications */}
        <Link to="/publication" className="header-link">Publications</Link>
        {/* App login section */}
        <Link to="/mrd-files" className="sign-in-box">
          <span className="sign-in-text">Go to Tool</span>
        </Link>
      </div>
    </header>
  );
};

export default HeaderHomepage;``