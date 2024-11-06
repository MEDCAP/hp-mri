// src/pages/MRDFileDetails.tsx
import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/mrdDetails.css';

interface LocationState {
    owner: string;
    date: string;
}

const MRDFileDetails: React.FC = () => {
    const { fileName } = useParams<{ fileName: string }>();
    const location = useLocation();
    const { owner, date } = (location.state || {}) as LocationState;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="page-container">
            <HeaderAccount />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={`details-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <h1>MRD filename {fileName}</h1>
                <div className="details-tabs">
                    <span className="tab active">Files</span>
                    <span className="tab">Image</span>
                </div>
                <div className="details-section">
                    <h2>File Details</h2>
                    <p><strong>Created Date:</strong> {date}</p>
                    <p><strong>Owner:</strong> {owner}</p>
                    <p><strong>Parameter:</strong> [Add Parameter Info]</p>
                    <p><strong>Raw Data File Info:</strong> [Add Raw Data Info]</p>
                    <p><strong>Image Status:</strong> [Reconstructed or Not]</p>
                    <p><strong>Aux Data Status:</strong> [Exists or Not]</p>
                </div>
                <div className="details-buttons">
                    <button className="button-detail">Download</button>
                    <button className="button-detail">Edit tags</button>
                    <button className="button-detail">Recon</button>
                </div>
                <div className="details-content-section">
                    <div className="file-tabs">
                        <span className="file-tab active">MRD file</span>
                        <span className="file-tab">Aux data</span>
                        <span className="file-tab">Raw data</span>
                    </div>
                    <div className="file-display">
                        {/* Placeholder for file display area */}
                        <p>[Display MRD file data here]</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MRDFileDetails;
