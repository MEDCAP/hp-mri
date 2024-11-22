// src/pages/UploadPage.tsx
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/upload.css';
import axios from 'axios';

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Track sidebar state

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length > 0) { // Check if files are selected
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));  // send formdata as files
      try{
        axios
          .post('http://127.0.0.1:5000/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
          .then(response => {
            console.log('Upload successful:', response.data)});
      } catch (error) {
        console.error('Error uploading files:', error);
      }
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
          <form action="http://127.0.0.1:5000/upload" method="post" encType="multipart/form-data">
            <input type="file" accept=".bin, .dat" multiple onChange={handleFileChange} />
            <button className="primary" onClick={handleUpload}>
              Upload
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
