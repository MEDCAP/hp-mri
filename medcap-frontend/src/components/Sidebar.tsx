// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';

import './../styles/sidebar.css';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <button className="toggle-btn" onClick={toggleSidebar}>
        <FaBars /> {/* Hamburger Icon */}
      </button>
      {isOpen && (
        <div className="sidebar-links">
          <Link to="/">MRD Files</Link>
          <Link to="/images">Images</Link>
          <Link to="/simulator">Simulator</Link>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
