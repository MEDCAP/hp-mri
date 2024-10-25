// src/components/Sidebar.tsx
import React from 'react';
import { FaBars, FaCube, FaFile, FaImages } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './../styles/sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      {/* Hamburger button for expanding/retracting */}
      <div className="toggle-btn-wrapper">
        <button className="toggle-btn" onClick={toggleSidebar}>
          <FaBars style={{ color: '#011F5B' }}/> {/* Hamburger Icon */}
        </button>
      </div>

      {/* Sidebar links with icons */}
      <div className="sidebar-links">
        <Link to="/" className="sidebar-link">
          <FaFile style={{ color: '#011F5B' }} className="sidebar-icon" />
          {isOpen && <span className="link-text">MRD Files</span>}
        </Link>
        <Link to="/images" className="sidebar-link">
          <FaImages style={{ color: '#011F5B' }} className="sidebar-icon" />
          {isOpen && <span className="link-text">Images</span>}
        </Link>
        <Link to="/simulator" className="sidebar-link">
          <FaCube style={{ color: '#011F5B' }} className="sidebar-icon" />
          {isOpen && <span className="link-text">Simulator</span>}
        </Link>
        {/* Add more links as needed */}
      </div>
    </div>
  );
};

export default Sidebar;
