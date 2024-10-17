// src/pages/RetrievePage.tsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom'; // Importing Link to handle navigation
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/retrieve.css';

const RetrievePage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar state

  const dataList = [
    'MEDCAP | Sequence 1 | Date',
    'MEDCAP | Sequence 2 | Date',
    'MEDCAP | Sequence 3 | Date',
  ];

  const filteredData = dataList.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} /> {/* Pass state to sidebar */}
      <div className={`retrieve-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Upload button on the top right */}
        <div className="top-right">
          <Link to="/upload">
            <button className="primary">Upload</button>
          </Link>
        </div>
        <div className="retrieve-container">
          <h1>MRD Files</h1>
          <input
            type="text"
            className="search-bar"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="data-list">
            {filteredData.map((item, index) => (
              <li key={index} className="data-item">{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RetrievePage;
