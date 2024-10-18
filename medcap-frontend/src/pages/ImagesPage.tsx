// src/pages/ImagesPage.tsx
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom'; // Importing Link to handle navigation
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/retrieve.css';
import axios from 'axios';

interface MRDFile {
  name: string;
  date: string;
  owner: string;
  sequence: string;
  isSelected: boolean;
}

const ImagesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar state

  // Fetch data from backend on component mount
  useEffect(() => {
    // TEMPORARY, SHOULD BE SENT FROM BACKEND
    setFiles([
      {
        "name": "Image 1",
        "date": "2024-10-18",
        "owner": "MEDCAP",
        "sequence": "Sequence 1",
        "isSelected": false,
      },
      {
        "name": "Image 2",
        "date": "2024-10-17",
        "owner": "Ben Yoon",
        "sequence": "Sequence 2",
        "isSelected": false,
      },
      {
        "name": "Image 3",
        "date": "2024-10-16",
        "owner": "Kento",
        "sequence": "Sequence 3",
        "isSelected": false,
      },
      {
        "name": "Image 4",
        "date": "2024-10-16",
        "owner": "Zihao",
        "sequence": "Sequence 4",
        "isSelected": false,
      },
    ])
    axios.get('http://localhost:5000/api/mrd-files')
      .then(response => {
        setFiles(response.data);
      })
      .catch(error => {
        console.error('Error fetching MRD files:', error);
      });
  }, []);

  // Filter the files based on search input
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(search.toLowerCase())
  );

  // Handle checkbox selection (only one file selected at a time)
  const handleSelection = (index: number) => {
    const updatedFiles = files.map((file, i) => ({
      ...file,
      isSelected: i === index, // Set the selected file to true, others to false
    }));
    setFiles(updatedFiles);
  };

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} /> {/* Pass state to sidebar */}
      <div className={`retrieve-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Upload button on the top right */}
        <div className="top-right">
        <button className="primary">Analyze</button>
          <button className="primary">Download</button>
          <button className="primary">Delete</button>
          <Link to="/upload">
            <button className="primary">Upload</button>
          </Link>
        </div>
        <div className="retrieve-container">
          <h1>Images</h1>
          <input
            type="text"
            className="search-bar"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Table Headers */}
          <div className="grid-header">
            <span>Name</span>
            <span>Date</span>
            <span>Owner</span>
            <span>Sequence</span>
          </div>

          {/* List of Files */}
          <div className="grid-container">
            {filteredFiles.map((file, index) => (
              <div key={index} className="grid-row" onClick={() => handleSelection(index)}>
                <input
                  type="checkbox"
                  checked={file.isSelected}
                  onChange={() => handleSelection(index)}
                />
                <span>{file.name}</span>
                <span>{file.date}</span>
                <span>{file.owner}</span>
                <span>{file.sequence}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagesPage;
