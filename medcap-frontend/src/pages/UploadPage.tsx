// src/pages/UploadPage.tsx
import React, { useState } from 'react';
import './../styles/pages.css';

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
      // Add your file upload logic here
    }
  };

  return (
    <div className="upload-container">
      <h1>Upload MRI Instrument Data</h1>
      <div className="file-browser">
        <input type="file" onChange={handleFileChange} />
        <button className="button primary" onClick={handleUpload}>Upload</button>
      </div>
    </div>
  );
};

export default UploadPage;
