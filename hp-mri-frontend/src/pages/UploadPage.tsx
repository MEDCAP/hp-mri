import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/upload.css';
import axios from 'axios';

const UploadPage: React.FC = () => {
  const [mriFiles, setMriFiles] = useState<File | null>(null);
  const [auxFile, setAuxFile] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (event.target.files) {
      type === 'MRI' ? setMriFiles(event.target.files[0]) : setAuxFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    console.log("MRI File:", mriFiles);
    console.log("Aux File:", auxFile);
    // Add upload logic here
  };

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className={`upload-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="top-right-upload">
          <button className="upload-button" onClick={handleUpload}>
            Upload
          </button>
        </div>
        <h1>Upload MRD Files</h1>
        <p className="upload-description">Select from local file</p>
        <div className="upload-box">
          <div className="upload-section">
            <label className="drag-drop-box">
              <p>Upload MRI raw data</p>
              <span>drag and drop</span>
              <input type="file" accept=".bin, .dat" multiple onChange={(e) => handleFileChange(e, 'MRI')} />
            </label>
          </div>
          <div className="upload-section">
            <label className="drag-drop-box">
              <p>Upload aux raw data</p>
              <span>drag and drop</span>
              <input type="file" onChange={(e) => handleFileChange(e, 'Aux')} />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
