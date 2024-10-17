// src/pages/SimulatorPage.tsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/retrieve.css';

const SimulatorPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar state

  const dataList = [
    'MEDCAP | Simulator 1 | Date | Sequence 1 | Image 1',
    'MEDCAP | Simulator 2 | Date | Sequence 2 | Image 2',
    'MEDCAP | Simulator 3 | Date | Sequence 3 | Image 3',
  ];

  const filteredData = dataList.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} /> {/* Pass state to sidebar */}
      <div className={`retrieve-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="retrieve-container">
          <h1>Simulator</h1>
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

export default SimulatorPage;