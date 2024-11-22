import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/pages.css';
import './../styles/upload.css';
import axios from 'axios';

const UploadPage: React.FC = () => {
  const [mriFile, setMriFile] = useState<FileList | null>(null);
  const [auxFile, setAuxFile] = useState<FileList | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (event.target.files) {
      type === 'MRI' ? setMriFile(event.target.files) : setAuxFile(event.target.files);
    }
  };

  const handleUpload = async () => {
    if (mriFile && mriFile.length > 0) { // Check if files are selected
      const formData = new FormData();
      [...mriFile].forEach(file => formData.append('files', file));  // send formdata as files
      try{
        axios
          .post('http://127.0.0.1:5000/api/upload', formData, {
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
              <input type="file" accept='.bin, .dat' multiple onChange={(e) => handleFileChange(e, 'MRI')} />
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
