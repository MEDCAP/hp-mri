// src/components/HeaderAccount.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import './../styles/headeraccount.css';
import Medcap from './../images/medcap.png'

const HeaderAccount: React.FC = () => {
  return (
    <header className="header-account">
      {/* App Logo as an image that links to the root page */}
      <div className="header-left">
        <Link to="/">
          <img src={Medcap} alt="App Logo" className="app-logo" />
          <h1 className="home-title">MEDCAP</h1>
        </Link>

      </div>

      {/* Title */}
      <div className="header-title">
        <span className="title-input">HP-MRI</span>
      </div>

      {/* Right section with Account and icons */}
      <div className="header-right">
        {/* <FaBell className="header-icon" />
        <FaCog className="header-icon" /> */}

        {/* Account section */}
        <Link to="/account" className="account-box">
          <FaUserCircle className="header-icon profile-icon" />
          <span className="account-text">Account</span>
        </Link>
      </div>
    </header>
  );
};

export default HeaderAccount;
