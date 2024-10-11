// src/pages/RetrievePage.tsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom'; // Importing Link to handle navigation
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/retrieve.css';

const RetrievePage: React.FC = () => {
  const [search, setSearch] = useState('');

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
      <Sidebar />
      <div className="retrieve-content">
        {/* Upload button on the top right */}
        <div className="top-right">
          <Link to="/upload">
            <button className="button primary">Upload</button>
          </Link>
        </div>
        <div className="retrieve-container">
          <h1>Retrieve Data</h1>
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
