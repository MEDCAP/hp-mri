import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
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
    TextField,
    Typography,
} from '@mui/material';
import { Sync } from '@mui/icons-material';
import axios from 'axios';

const MRDFileDetails: React.FC = () => {
    const { fileId } = useParams<{ fileId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('Files');
    const [activeSubTab, setActiveSubTab] = useState('MRD');
    const [images, setImages] = useState<any[]>([]);
    const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTags, setEditedTags] = useState<{ parameter: string; raw: string }>({
        parameter: '',
        raw: '',
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
            .get(`http://127.0.0.1:5000/api/mrd-files/${fileId}`)
            .then((response) => {
                setFileDetails(response.data);
                setEditedTags({ parameter: response.data.parameter, raw: response.data.raw?.description });
            })
            .catch((error) => console.error('Error fetching file details:', error));
    }, [fileId, location.state]);

    const fetchImages = () => {
        axios
            .get(`http://127.0.0.1:5000/api/images/${fileId}`)
            .then((response) => setImages(response.data))
            .catch((error) => console.error('Error fetching images:', error));
    };

    useEffect(() => {
        if (activeTab === 'Image') fetchImages();
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

    // Handle image selection to allow multiple selections
    const handleImageSelection = (imageId: number) => {
        setSelectedImageIds(prevIds =>
            prevIds.includes(imageId)
                ? prevIds.filter(id => id !== imageId) // Deselect if already selected
                : [...prevIds, imageId] // Select if not already selected
        );
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

    const goToDetails = (image_id: number, file_id: number) => {
        navigate(`/images-details/${image_id}/${file_id}`);
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setActiveTab(newValue);
    };

    if (!fileDetails) return <Typography variant="h5">Loading...</Typography>;

    return (
        <Container
            maxWidth="lg"
            sx={{
                marginLeft: isSidebarOpen ? '260px' : '80px',
                transition: 'margin-left 0.3s',
                paddingTop: 2,
            }}
        >
            <HeaderAccount />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <Typography variant="h4" gutterBottom>
                MRD File Details
            </Typography>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
                <Tab label="Files" value="Files" />
                <Tab label="Images" value="Image" />
            </Tabs>
            <Divider sx={{ marginY: 2 }} />
            {activeTab === 'Files' && (
                <Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="h6">File Details</Typography>
                            <Typography>
                                <strong>Created Date:</strong> {fileDetails.date}
                            </Typography>
                            <Typography>
                                <strong>Owner:</strong> {fileDetails.owner}
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
                                        <strong>Parameter:</strong> {fileDetails.parameter}
                                    </Typography>
                                    <Typography>
                                        <strong>Raw Data Info:</strong> {fileDetails.raw?.description || '[Placeholder]'}
                                    </Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </Box>
            )}
            {activeTab === 'Image' && (
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Button
                            variant="outlined"
                            startIcon={<Sync />}
                            onClick={fetchImages}
                            sx={{ marginRight: 2 }}
                        >
                            Refresh
                        </Button>
                        <Button variant="contained" disabled={selectedImageIds.length === 0}>
                            Download Image File
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            disabled={selectedImageIds.length === 0}
                            onClick={handleDeleteImage}
                        >
                            Delete
                        </Button>
                    </Box>
                    <Grid container spacing={2}>
                        {images.map((image, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        padding: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Checkbox
                                        checked={selectedImageIds.includes(image.id)}
                                        onChange={() => handleImageSelection(image.id)}
                                    />
                                    <Typography
                                        variant="body1"
                                        sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'blue' }}
                                        onClick={() => goToDetails(image.id, image.sequence_id)}
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
    );
};

export default MRDFileDetails;