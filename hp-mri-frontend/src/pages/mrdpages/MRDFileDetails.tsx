import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../components/HeaderAccount';
import {
    Box,
    Button,
    Checkbox,
    Container,
    Divider,
    Grid,
    Paper,
    Tab,
    Tabs,
    Typography,
    TextField,
} from '@mui/material';
import { Sync, Download, Edit, Build } from '@mui/icons-material';
import axios from 'axios';

const MRDFileDetails: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('Files');
    const [images, setImages] = useState<any[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('MRD');
    const [isEditing, setIsEditing] = useState(false);
    const [editedTags, setEditedTags] = useState<{ parameter: string; raw: string }>({
        parameter: '',
        raw: '',
    });

    useEffect(() => {
        if (location.state) {
            const { activeTab, selectedImageId } = location.state as {
                activeTab?: string;
                selectedImageId?: number;
            };
            if (activeTab) setActiveTab(activeTab);
            if (selectedImageId) setSelectedImageIds([selectedImageId]);
        }

        axios
            .get(`/api/mrd-files/${fileId}`)
            .then((response) => {
                setFileDetails(response.data);
                setEditedTags({ parameter: response.data.parameter, raw: response.data.raw?.description });
            })
            .catch((error) => console.error('Error fetching file details:', error));
        document.title = "File Details - HP";
    }, [fileId, location.state]);

    const fetchImages = () => {
        axios
            .get(`/api/images/${fileId}`) 
            .then((response) => setImages(response.data))
            .catch((error) => console.error('Error fetching images:', error));
    };

    useEffect(() => {
        if (activeTab === 'Image') fetchImages();
    }, [activeTab, fileId]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    const handleImageSelection = (imageId: number) => {
        setSelectedImageIds((prevIds) =>
            prevIds.includes(imageId) ? prevIds.filter((id) => id !== imageId) : [...prevIds, imageId]
        );
    };

    if (!fileDetails) return <Typography variant="h5">Loading...</Typography>;

    const goToDetails = (image_id: number, file_id: number) => {
        navigate(`/images-details/${image_id}/${file_id}`);
    };

    const handleSubTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        setActiveSubTab(newValue);
    };

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

    // Handle delete action
    const handleDeleteImage = () => {
        // // API Call for delete, commented so that we don't accidentally delete during dev
        // // TODO: Uncomment, eventually
        // const selectedImagesIds = images.filter(image => image.isSelected).map(image => image.id);
        // if (selectedImagesIds.length === 0) return;

        // axios
        //   .delete(`http://127.0.0.1:5000/api/images/delete`, { data: { ids: selectedImagesIds } })
        //   .then(() => {
        //     setImages(images.filter(image => !image.isSelected));
        //   })
        //   .catch(error => console.error("Error deleting images:", error));
    };

    return (
        <div
            style={{
                marginLeft: isSidebarOpen ? '260px' : '80px',
                width: isSidebarOpen ? 'calc(100% - 260px)' : 'calc(100% - 80px)',
                transition: 'margin-left 0.3s, width 0.3s',
            }}
        >
            <Container maxWidth="lg" sx={{ paddingTop: 2 }}>
                <HeaderAccount />
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                <Typography variant="h4" gutterBottom>
                    MRD File {fileDetails.name}
                </Typography>
                {/* Tabs */}
                <Tabs value={activeTab} onChange={handleTabChange} centered>
                    <Tab label="Files" value="Files" />
                    <Tab label="Images" value="Image" />
                </Tabs>
                <Divider sx={{ marginY: 2 }} />
                {/* Files Tab Content */}
                {activeTab === 'Files' && (
                    <>
                        {/* Action Buttons */}
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: 2,
                                marginBottom: 4,
                            }}
                        >
                            <Button variant="contained" startIcon={<Download />}>
                                Download
                            </Button>
                            <Button variant="contained" startIcon={<Edit />} onClick={() => setIsEditing(!isEditing)}>
                                Edit Tags
                            </Button>
                            <Button variant="contained" startIcon={<Build />} color="secondary">
                                Recon
                            </Button>
                        </Box>
                        {/* File Details */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, padding: 2 }}>
                            <Typography>
                                <strong>Created Date:</strong> {fileDetails.date}
                            </Typography>
                            <Typography>
                                <strong>Owner:</strong> {fileDetails.owner}
                            </Typography>
                            <Typography>
                                <strong>Reconstructed:</strong> {fileDetails.reconstructed ? 'Yes' : 'No'}
                            </Typography>
                            <Typography>
                                <strong>Aux Data Exists:</strong> {fileDetails.aux ? 'Yes' : 'No'}
                            </Typography>
                            {isEditing ? (
                                <Box>
                                    <TextField
                                        fullWidth
                                        label="Parameter"
                                        value={editedTags.parameter}
                                        onChange={(e) => setEditedTags({ ...editedTags, parameter: e.target.value })}
                                        sx={{ marginBottom: 2 }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Raw Data Info"
                                        value={editedTags.raw}
                                        onChange={(e) => setEditedTags({ ...editedTags, raw: e.target.value })}
                                        sx={{ marginBottom: 2 }}
                                    />
                                    <Button variant="contained" onClick={handleSaveTags}>
                                        Save
                                    </Button>
                                </Box>
                            ) : (
                                <Box>
                                    <Typography>
                                        <strong>Parameter:</strong> {fileDetails.parameter || '[Not Set]'}
                                    </Typography>
                                    <Typography>
                                        <strong>Raw Data Info:</strong> {fileDetails.raw?.description || '[Not Set]'}
                                    </Typography>
                                </Box>
                            )}
                            <Tabs
                                value={activeSubTab}
                                onChange={handleSubTabChange}
                                variant="fullWidth"
                                sx={{ marginTop: 2 }}
                            >
                                <Tab label="MRD File" value="MRD" />
                                {fileDetails.aux && <Tab label="Aux Data" value="Aux" />}
                                <Tab label="Raw Data" value="Raw" />
                            </Tabs>
                            <Divider sx={{ marginY: 2 }} />
                            {activeSubTab === 'MRD' && <Typography>[Display MRD file data here]</Typography>}
                            {activeSubTab === 'Aux' && fileDetails.aux && (
                                <Typography>[Display Aux data here]</Typography>
                            )}
                            {activeSubTab === 'Raw' && fileDetails.raw && (
                                <Box sx={{ marginTop: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        Raw Data Details
                                    </Typography>
                                    <Typography>
                                        <strong>Description:</strong> {fileDetails.raw.description}
                                    </Typography>
                                    <Typography>
                                        <strong>Scanned Time/Date:</strong> {new Date(fileDetails.raw.scanned_time).toLocaleString()}
                                    </Typography>
                                    <Typography>
                                        <strong>Institution:</strong> {fileDetails.raw.institution}
                                    </Typography>
                                    <Typography>
                                        <strong>Machine Vendor:</strong> {fileDetails.raw.machine_vendor}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </>
                )}
                {/* Images Tab Content */}
                {activeTab === 'Image' && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={<Sync />}
                                onClick={fetchImages}
                            >
                                Refresh
                            </Button>
                            <Button variant="contained" disabled={selectedImageIds.length === 0}>
                                Download Selected
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                disabled={selectedImageIds.length === 0}
                                onClick={handleDeleteImage}
                            >
                                Delete Selected
                            </Button>
                        </Box>
                        <Grid container spacing={2}>
                            {images.map((image) => (
                                <Grid item xs={12} sm={6} md={4} key={image.id}>
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            padding: 2,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            '&:hover': { backgroundColor: 'action.hover' },
                                        }}
                                        onClick={() => goToDetails(image.id, image.sequence_id)} // Navigate on row click
                                    >
                                        <Checkbox
                                            checked={selectedImageIds.includes(image.id)}
                                            onClick={(e) => e.stopPropagation()} // Prevent row click event
                                            onChange={() => handleImageSelection(image.id)} // Toggle checkbox
                                        />
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                textDecoration: 'underline',
                                                '&:hover': { color: 'primary.main' },
                                            }}
                                        >
                                            {image.name}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}
            </Container>
        </div>
    );
};

export default MRDFileDetails;