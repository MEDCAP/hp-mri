import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaCube, FaFile, FaImages } from 'react-icons/fa'; // Icons for the sidebar

import './../styles/sidebar.css';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Hamburger button for expanding/retracting */}
      <div className="toggle-btn-wrapper">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <FaBars /> {/* Hamburger Icon */}
        </button>
      </div>

      {/* Sidebar links with icons */}
      <div className="sidebar-links">
        <Link to="/" className="sidebar-link">
          <FaFile className="sidebar-icon" />
          {isOpen && <span className="link-text">MRI Files</span>}
        </Link>
        <Link to="/images" className="sidebar-link">
          <FaImages className="sidebar-icon" />
          {isOpen && <span className="link-text">Images</span>}
        </Link>
        <Link to="/simulator" className="sidebar-link">
          <FaCube className="sidebar-icon" />
          {isOpen && <span className="link-text">Simulator</span>}
        </Link>
        {/* Add more links as needed */}
      </div>
    </div>
  );
};

export default Sidebar;
