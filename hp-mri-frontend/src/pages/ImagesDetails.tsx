// src/pages/ImagesDetails.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import './../styles/mrdDetails.css';
import axios from 'axios'

const ImagesDetails: React.FC = () => {
    const { imageId, fileId } = useParams();
    const [imageDetails, setImageDetails] = useState<any>(null);
    const [fileDetails, setFileDetails] = useState<any>(null);
    // const [image, setImage] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        axios.get(`http://127.0.0.1:5000/api/image-details/${imageId}`)
            .then(response => {
                setImageDetails(response.data);
            })
            .catch(error => console.error("Error fetching image details:", error));

        axios.get(`http://127.0.0.1:5000/api/mrd-files/${fileId}`)
            .then(response => {
                setFileDetails(response.data);
            })
            .catch(error => console.error("Error fetching file details:", error));

        // // TODO: This should get the actual image from the S3 bucket associated with image ID and this
        // // should be set to the image to be displayed
        // // TODO: Uncomment once backend implemented
        // axios.get(`http://127.0.0.1:5000/api/image/${imageId}`)
        //     .then(response => {
        //         setImage(response.data);
        //         setEditedTags({ parameter: response.data.parameter, raw: response.data.raw?.description });
        //     })
        //     .catch(error => console.error("Error fetching image:", error));
    }, [imageId]);

    if (!imageDetails || !fileDetails) return <div>Loading...</div>;

    return (
        <div className="page-container">
            <HeaderAccount />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="top-right-details">
                <button className="button-retrieve-details">Analyze</button>
            </div>

            <div className={`details-content ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <h1>MRD filename {fileDetails.name || "Loading..."} {">"} Image filename {imageDetails.name || "Loading..."}</h1>

                <div className="details-section">
                    <h2>Image Details</h2>
                    {/* TODO: This should display the actual image once we have mock
                    image data and the backend is implemented and frontend get is 
                    working */}
                    <p><strong>TODO:</strong> [Display Image here]</p>
                </div>
            </div>
        </div>
    );
};

export default ImagesDetails;
