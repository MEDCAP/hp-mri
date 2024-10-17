// src/pages/RetrievePage.tsx
import React, { useState } from 'react';
import './../styles/pages.css';

const RetrievePage: React.FC = () => {
  const [search, setSearch] = useState('');

  const dataList = [
    'MEDCAP-01 | Sequence 1 | Date',
    'MEDCAP-02 | Sequence 2 | Date',
    'MEDCAP-03 | Sequence 3 | Date',
    // Add more data as needed
  ];

  const filteredData = dataList.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
  );
};

export default RetrievePage;
