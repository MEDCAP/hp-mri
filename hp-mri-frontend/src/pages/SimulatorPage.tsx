// src/pages/SimulatorPage.tsx

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/retrieve.css';
import axios from 'axios';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface Simulator {
  id: number;
  name: string;
  date: string;
  owner: string;
  sequence: string;
  image: string;
  isSelected: boolean;
}

const SimulatorPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [simulators, setSimulators] = useState<Simulator[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Simulator; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const navigate = useNavigate();

  // Fetch data from backend on component mount
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/simulator')
      .then(response => {
        setSimulators(response.data);
      })
      .catch(error => {
        console.error('Error fetching Simulator:', error);
      });
  }, []);

  // Filter the files based on search input
  const filteredFiles = simulators.filter(file =>
    file.name.toLowerCase().includes(search.toLowerCase()) ||
    file.date.toLowerCase().includes(search.toLowerCase()) ||
    file.owner.toLowerCase().includes(search.toLowerCase())
  );

  // Sort the filtered files based on sortConfig
  const sortedFiles = filteredFiles.sort((a, b) => {
    const key = sortConfig.key;

    const aValue = key === 'date' ? new Date(a[key]) : a[key];
    const bValue = key === 'date' ? new Date(b[key]) : b[key];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Handle column sorting
  const handleSort = (key: keyof Simulator) => {
    setSortConfig(prevState => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelection = (fileId: number) => {
    setSimulators(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId ? { ...file, isSelected: !file.isSelected } : file
      )
    );
  };

  const goToDetails = (simulator: Simulator) => {
  };

  const handleDelete = () => {
    // // API Call for delete, commented so that we don't accidentally delete during dev
    // // TODO: Uncomment, eventually
    // const selectedSimulatorIds = simulators.filter(simulator => simulator.isSelected).map(simulator => simulator.id);
    // if (selectedSimulatorIds.length === 0) return;

    // axios
    //   .delete(`http://127.0.0.1:5000/api/simulators/`, { data: { ids: selectedSimulatorIds } })
    //   .then(() => {
    //     // Remove the deleted simulator from the local state
    //     setSimulators(simulators.filter(file => !file.isSelected));
    //   })
    //   .catch(error => console.error("Error deleting simulator:", error));
  };

  const isAnyFileSelected = simulators.some(file => file.isSelected);

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className={`retrieve-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Upload button on the top right */}
        <div className="top-right">
          <button className="button-retrieve" disabled={!isAnyFileSelected}>Download</button>
          <button
            className="button-retrieve"
            disabled={!isAnyFileSelected}
            onClick={handleDelete}
          >
            Delete
          </button>
          <Link to="/upload">
            <button className="button-retrieve">Upload</button>
          </Link>
        </div>
        <div className="retrieve-container-simulator">
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
            <span></span>
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
              <div key={index} className="grid-row-simulator">
                <input
                  type="checkbox"
                  checked={file.isSelected}
                  onChange={() => handleSelection(file.id)}
                />
                <span
                  className="file-link"
                  onClick={() => goToDetails(file)}
                  style={{ textDecoration: 'underline', color: 'gray', cursor: 'pointer' }}
                  onMouseOver={(e) => (e.currentTarget.style.color = 'blue')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'gray')}
                >
                  {file.name}
                </span>
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
