// src/pages/ImagesPage.tsx

// Import necessary libraries
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import './../styles/pages.css';
import './../styles/retrieve.css';
import axios from 'axios';

interface Image {
  id: number;
  name: string;
  date: string;
  owner: string;
  sequence_id: number;
  sequence: string;
  isSelected: boolean;
}

const ImagesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<Image[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Image; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  const navigate = useNavigate();

  // Fetch data from backend on component mount
  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/images')
      .then(response => {
        setFiles(response.data);
      })
      .catch(error => {
        console.error('Error fetching Images:', error);
      });
  }, []);

  // Filter the files based on search input
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(search.toLowerCase()) ||
    file.date.toLowerCase().includes(search.toLowerCase()) ||
    file.owner.toLowerCase().includes(search.toLowerCase()) ||
    file.sequence.toLowerCase().includes(search.toLowerCase())
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
  const handleSort = (key: keyof Image) => {
    setSortConfig(prevState => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const isAnyFileSelected = files.some(file => file.isSelected);

  const handleDelete = () => {
    // // API Call for delete, commented so that we don't accidentally delete during dev
    // // TODO: Uncomment, eventually
    // const selectedFile = files.find(file => file.isSelected);
    // if (!selectedFile) return;

    // axios
    //   axios.delete(`http://127.0.0.1:5000/api/images/${selectedFile.id}/delete`)
    //   .then(() => {
    //     // Remove the deleted file from the local state
    //     setFiles(files.filter(file => file.id !== selectedFile.id));
    //   })
    //   .catch(error => console.error("Error deleting file:", error));
  };

  const handleSelection = (fileId: number) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId ? { ...file, isSelected: !file.isSelected } : { ...file, isSelected: false }
      )
    );
  };

  // Navigate to MRDFileDetails with activeTab and selectedImageId state
  const goToDetails = (file: Image) => {
    navigate(`/file-details/${file.sequence_id}`, {
      state: { activeTab: "Image", selectedImageId: file.id }
    });
  };

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
          <div className="grid-header-images">
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
          </div>

          {/* List of Files */}
          <div className="grid-container">
            {sortedFiles.map((file, index) => (
              <div key={index} className="grid-row-images">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagesPage;
