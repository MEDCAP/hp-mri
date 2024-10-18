import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Link } from 'react-router-dom'; // Importing Link to handle navigation
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/retrieve.css';
import axios from 'axios';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa'; // Icons for sorting

interface MRDFile {
  name: string;
  date: string;
  owner: string;
  sequence: string;
  image: string;
  isSelected: boolean;
}

const SimulatorPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<MRDFile[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar state
  const [sortConfig, setSortConfig] = useState<{ key: keyof MRDFile; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // Fetch data from backend on component mount
  useEffect(() => {
    // TEMPORARY, SHOULD BE SENT FROM BACKEND
    setFiles([
      {
        "name": "Simulator 1",
        "date": "2024-10-18",
        "owner": "MEDCAP",
        "sequence": "Sequence 1",
        "image": "Image 1",
        "isSelected": false,
      },
      {
        "name": "Simulator 2",
        "date": "2024-10-17",
        "owner": "Ben Yoon",
        "sequence": "Sequence 2",
        "image": "Image 2",
        "isSelected": false,
      },
      {
        "name": "Simulator 3",
        "date": "2024-10-16",
        "owner": "Kento",
        "sequence": "Sequence 3",
        "image": "Image 3",
        "isSelected": false,
      },
      {
        "name": "Simulator 4",
        "date": "2024-10-15",
        "owner": "Zihao",
        "sequence": "Sequence 4",
        "image": "Image 4",
        "isSelected": false,
      },
    ]);
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
    file.name.toLowerCase().includes(search.toLowerCase()) ||
    file.date.toLowerCase().includes(search.toLowerCase()) ||
    file.owner.toLowerCase().includes(search.toLowerCase()) ||
    file.sequence.toLowerCase().includes(search.toLowerCase()) ||
    file.image.toLowerCase().includes(search.toLowerCase())
  );

  // Sort the filtered files based on sortConfig
  const sortedFiles = filteredFiles.sort((a, b) => {
    const key = sortConfig.key;
    if (a[key] < b[key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[key] > b[key]) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column sorting
  const handleSort = (key: keyof MRDFile) => {
    setSortConfig(prevState => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle checkbox selection (only one file selected at a time)
  const handleSelection = (index: number) => {
    const updatedFiles = files.map((file, i) => ({
      ...file,
      isSelected: i === index ? !file.isSelected : false, // Toggle the selected file, deselect others
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
          <button className="primary">Download</button>
          <button className="primary">Delete</button>
          <Link to="/upload">
            <button className="primary">Upload</button>
          </Link>
        </div>
        <div className="retrieve-container">
          <h1>Simulator</h1>
          <input
            type="text"
            className="search-bar"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Table Headers */}
          <div className="grid-header-simulator">
            <span></span> {/* Checkbox column */}
            <span onClick={() => handleSort('name')}>
              Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />)}
            </span>
            <span onClick={() => handleSort('date')}>
              Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />)}
            </span>
            <span onClick={() => handleSort('owner')}>
              Owner {sortConfig.key === 'owner' && (sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />)}
            </span>
            <span onClick={() => handleSort('sequence')}>
              Sequence {sortConfig.key === 'sequence' && (sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />)}
            </span>
            <span onClick={() => handleSort('image')}>
              Image {sortConfig.key === 'image' && (sortConfig.direction === 'asc' ? <FaArrowUp /> : <FaArrowDown />)}
            </span>
          </div>

          {/* List of Files */}
          <div className="grid-container">
            {sortedFiles.map((file, index) => (
              <div key={index} className="grid-row-simulator" onClick={() => handleSelection(index)}>
                <input
                  type="checkbox"
                  checked={file.isSelected}
                  onChange={() => handleSelection(index)}
                />
                <span>{file.name}</span>
                <span>{file.date}</span>
                <span>{file.owner}</span>
                <span>{file.sequence}</span>
                <span>{file.image}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatorPage;
