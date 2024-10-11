// src/components/HeaderAccount.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaBell, FaCog, FaUserCircle } from 'react-icons/fa';
import './../styles/headeraccount.css';
import PigiLogo from './../images/pigi-logo.png';

const HeaderAccount: React.FC = () => {
  return (
    <header className="header-account">
      {/* App Logo as an image that links to the root page */}
      <div className="header-left">
        <Link to="/">
          <img src={PigiLogo} alt="App Logo" className="app-logo" />
        </Link>
      </div>

      {/* Search bar */}
      {/* <div className="header-search">
        <FaSearch className="search-icon" />
        <input type="text" placeholder="Search..." className="search-input" />
      </div> */}

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
