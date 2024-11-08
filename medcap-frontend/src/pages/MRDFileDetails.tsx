// src/pages/MRDFileDetails.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import { FaSyncAlt } from 'react-icons/fa'; // Import refresh icon
import './../styles/mrdDetails.css';
import axios from 'axios'

const MRDFileDetails: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("Files");
    const [activeSubTab, setActiveSubTab] = useState("MRD");
    const [images, setImages] = useState<any[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<number | null>(null); // State to track selected image ID
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

    // Fetch images when the "Image" tab is selected
    const fetchImages = () => {
        axios.get(`http://127.0.0.1:5000/api/images/${fileId}`)
            .then(response => setImages(response.data))
            .catch(error => console.error("Error fetching images:", error));
    };

    useEffect(() => {
        if (activeTab === "Image") {
            fetchImages();
        }
    }, [activeTab, fileId]);

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

    // Handle image selection (only one selection allowed)
    const handleImageSelection = (imageId: number) => {
        setSelectedImageId(prevId => (prevId === imageId ? null : imageId)); // Toggle selection
    };

    // Handle delete action
    const handleDeleteImage = () => {
        // // API Call for delete, commented so that we don't accidentally delete during dev
        // // TODO: Uncomment, eventually
        // if (selectedImageId !== null) {
        //     axios.delete(`http://127.0.0.1:5000/api/images/${selectedImageId}/delete`)
        //         .then(() => {
        //             // Remove deleted image from local state
        //             setImages(images.filter(image => image.id !== selectedImageId));
        //             setSelectedImageId(null); // Reset selection
        //         })
        //         .catch(error => console.error("Error deleting image:", error));
        // }
    };

    if (!fileDetails) return <div>Loading...</div>;

    return (
        <div className="page-container">
            <HeaderAccount />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {activeTab === "Files" && (
                <div className="top-right-details">
                    <button className="button-retrieve-details">Download</button>
                    <button className="button-retrieve-details" onClick={() => setIsEditing(!isEditing)}>Edit tags</button>
                    <button className="button-retrieve-details">Recon</button>
                </div>
            )}

            {activeTab === "Image" && (
                <div className="top-right-details">
                    <button className="button-retrieve-details" onClick={fetchImages}>
                        <FaSyncAlt /> {/* Refresh Icon */}
                    </button>
                    <button className="button-retrieve-details" disabled={!selectedImageId}>Download Image file</button>
                    <button className="button-retrieve-details" disabled={!selectedImageId} onClick={handleDeleteImage}>Delete</button>
                </div>
            )}

            <div className={`details-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <h1>MRD filename {fileDetails.name || "Loading..."}</h1>
                <div className="details-tabs">
                    <span className={`tab ${activeTab === "Files" ? "active" : ""}`} onClick={() => setActiveTab("Files")}>Files</span>
                    <span className={`tab ${activeTab === "Image" ? "active" : ""}`} onClick={() => setActiveTab("Image")}>Image</span>
                </div>

                {activeTab === "Files" && (
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
                )}
                {activeTab === "Files" && (
                    <div className="details-content-section">
                        <div className="file-tabs">
                            <span className={`file-tab ${activeSubTab === "MRD" ? "active" : ""}`} onClick={() => setActiveSubTab("MRD")}>MRD file</span>
                            {fileDetails.aux && <span className={`file-tab ${activeSubTab === "Aux" ? "active" : ""}`} onClick={() => setActiveSubTab("Aux")}>Aux data</span>}
                            {fileDetails.raw && <span className={`file-tab ${activeSubTab === "Raw" ? "active" : ""}`} onClick={() => setActiveSubTab("Raw")}>Raw data</span>}
                        </div>
                        <div className="file-display">
                            {activeSubTab === "MRD" && <p>[Display MRD file data here]</p>}
                            {activeSubTab === "Aux" && <p>[Display Aux data here]</p>}
                            {activeSubTab === "Raw" && (
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
                )}

                {activeTab === "Image" && (
                    <div className="details-section">
                        <h2>Images details</h2>
                        <div className="grid-container">
                            {images.map((image, index) => (
                                <div key={index} className="grid-row">
                                    <input
                                        type="checkbox"
                                        checked={selectedImageId === image.id}
                                        onChange={() => handleImageSelection(image.id)}
                                    />
                                    <span>{image.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MRDFileDetails;
