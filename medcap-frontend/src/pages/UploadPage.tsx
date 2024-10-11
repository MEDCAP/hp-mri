// src/pages/UploadPage.tsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/upload.css';

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      console.log(file);
      // Add file upload logic here
    }
  };

  return (
    <div className="page-container">
      <HeaderAccount />
      <Sidebar />
      <div className="upload-container">
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
          <button className="button primary" onClick={handleUpload}>
            Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
