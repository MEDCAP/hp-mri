// src/pages/UploadPage.tsx
import React, { useState } from 'react';
import './../styles/pages.css';

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar state

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      console.log(file);
      // Add your file upload logic here
    }
  };

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} /> {/* Pass state to sidebar */}
      <div className={`upload-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <h1>Upload MRD Files</h1>
        <div className="file-select">
          <p>Select from local file</p>
          <ul>
            <li>MRI scanner raw data</li>
            <li>aux data</li>
          </ul>
        </div>
        <div className="file-browser">
          <input type="file" onChange={handleFileChange} />
          <button className="primary" onClick={handleUpload}>
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
