// src/pages/MRDFileDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/mrdDetails.css';
import axios from 'axios'

const MRDFileDetails: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("MRD");
    const [isEditing, setIsEditing] = useState(false);
    const [editedTags, setEditedTags] = useState<{ parameter: string; raw: string }>({ parameter: "", raw: "" });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        // Fetch file details from the backend
        axios.get(`http://127.0.0.1:5000/api/mrd-files/${fileId}`)
            .then(response => {
                setFileDetails(response.data);
                setEditedTags({ parameter: response.data.parameter, raw: response.data.raw?.description });
            })
            .catch(error => console.error("Error fetching file details:", error));
    }, [fileId]);

    const handleSaveTags = () => {
        // // API Call for edit tags, commented so that we don't accidentally edit during dev
        // // TODO: Uncomment, eventually
        // axios.post(`http://127.0.0.1:5000/api/mrd-files/${fileId}/edit-tags`, { tags: editedTags })
        //     .then(response => {
        //         setFileDetails({ ...fileDetails, ...editedTags });
        setIsEditing(false);
        //     })
        //     .catch(error => console.error("Error saving tags:", error));
    };

    if (!fileDetails) return <div>Loading...</div>;

    return (
        <div className="page-container">
            <HeaderAccount />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={`details-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <h1>MRD filename {fileDetails.name}</h1>
                <div className="details-tabs">
                    <span className={`tab ${activeTab === "Files" ? "active" : ""}`} onClick={() => setActiveTab("Files")}>Files</span>
                    <span className={`tab ${activeTab === "Image" ? "active" : ""}`} onClick={() => setActiveTab("Image")}>Image</span>
                </div>
                <div className="details-section">
                    <h2>File Details</h2>
                    <p><strong>Created Date:</strong> {fileDetails.date}</p>
                    <p><strong>Owner:</strong> {fileDetails.owner}</p>
                    {isEditing ? (
                        <>
                            <label>Parameter:</label>
                            <input
                                type="text"
                                value={editedTags.parameter}
                                onChange={(e) => setEditedTags({ ...editedTags, parameter: e.target.value })}
                            />
                            <br />
                            <label>Raw Data Info:</label>
                            <input
                                type="text"
                                value={editedTags.raw}
                                onChange={(e) => setEditedTags({ ...editedTags, raw: e.target.value })}
                            />
                            <br />
                            <button onClick={handleSaveTags}>Save</button>
                        </>
                    ) : (
                        <>
                            <p><strong>Parameter:</strong> {fileDetails.parameter}</p>
                            <p><strong>Raw Data File Info:</strong> {fileDetails.raw?.description || "[Placeholder]"}</p>
                        </>
                    )}
                </div>
                <div className="details-buttons">
                    <button className="button-detail">Download</button>
                    <button className="button-detail" onClick={() => setIsEditing(!isEditing)}>Edit tags</button>
                    <button className="button-detail">Recon</button>
                </div>
                <div className="details-content-section">
                    <div className="file-tabs">
                        <span className={`file-tab ${activeTab === "MRD" ? "active" : ""}`} onClick={() => setActiveTab("MRD")}>MRD file</span>
                        {fileDetails.aux && <span className={`file-tab ${activeTab === "Aux" ? "active" : ""}`} onClick={() => setActiveTab("Aux")}>Aux data</span>}
                        {fileDetails.raw && <span className={`file-tab ${activeTab === "Raw" ? "active" : ""}`} onClick={() => setActiveTab("Raw")}>Raw data</span>}
                    </div>
                    <div className="file-display">
                        {activeTab === "MRD" && <p>[Display MRD file data here]</p>}
                        {activeTab === "Aux" && <p>[Display Aux data here]</p>}
                        {activeTab === "Raw" && (
                            <div>
                                <h3>Raw data description</h3>
                                <ul>
                                    <li><strong>Scanned time/date:</strong> {fileDetails.raw?.scanned_time || "[Placeholder]"}</li>
                                    <li><strong>Institution:</strong> {fileDetails.raw?.institution || "[Placeholder]"}</li>
                                    <li><strong>Machine vendor:</strong> {fileDetails.raw?.machine_vendor || "[Placeholder]"}</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MRDFileDetails;
