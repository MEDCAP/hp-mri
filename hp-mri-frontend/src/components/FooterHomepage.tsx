// src/components/FooterHomepage.tsx
import React from 'react';
import './../styles/footerHomepage.css';
import Medcap from './../images/medcap.png'

const FooterHomepage: React.FC = () => {
  return (
    <footer className="footer-homepage"> 
      <div className="footer-container">
        <img src={Medcap} alt="Footer Logo" className="footer-logo" />
        <div className="footer-text">
          <p>1-125 Smilow Center for Translational Research</p>
          <p>3400 Civic Center Blvd.</p>
          <p>Philadelphia, PA  19104</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterHomepage;