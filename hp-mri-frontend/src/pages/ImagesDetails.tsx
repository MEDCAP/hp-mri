import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeaderAccount from '../components/HeaderAccount';
import {
    Box,
    Button,
    Card,
    CardContent,
    CardMedia,
    Container,
    Divider,
    Grid,
    Typography,
} from '@mui/material';
import axios from 'axios';

const ImagesDetails: React.FC = () => {
    const { imageId, fileId } = useParams();
    const navigate = useNavigate();
    const [imageDetails, setImageDetails] = useState<any>(null);
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [image, setImage] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        axios
            .get(`http://127.0.0.1:5000/api/image-details/${imageId}`)
            .then((response) => {
                setImageDetails(response.data);
            })
            .catch((error) => console.error('Error fetching image details:', error));

        axios
            .get(`http://127.0.0.1:5000/api/mrd-files/${fileId}`)
            .then((response) => {
                setFileDetails(response.data);
            })
            .catch((error) => console.error('Error fetching file details:', error));

        // // TODO: This should get the actual image from the S3 bucket associated with image ID and this
        // // should be set to the image to be displayed
        // // TODO: Uncomment once backend implemented
        // axios.get(`http://127.0.0.1:5000/api/image/${imageId}`)
        //     .then(response => {
        //         setImage(response.data);
        //         setEditedTags({ parameter: response.data.parameter, raw: response.data.raw?.description });
        //     })
        //     .catch(error => console.error("Error fetching image:", error));
        // Fetch the generated image from the backend
        axios
            .get(`http://127.0.0.1:5000/api/plot-image`, { responseType: 'blob' })
            .then((response) => {
                const imageUrl = URL.createObjectURL(response.data);
                setImageUrl(imageUrl);
            })
            .catch((error) => console.error('Error fetching plot image:', error));
    }, [imageId, fileId]);

    if (!imageDetails || !fileDetails) return <Typography variant="h5">Loading...</Typography>;

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
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 3,
                    }}
                >
                    <Typography variant="h4" fontWeight="bold">
                        MRD File: {fileDetails.name} &gt; Image: {imageDetails.name}
                    </Typography>
                    {/* Redirect to the visualize page */}
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={() => navigate("/visualize")}
                    >
                        Visualize
                    </Button>
                </Box>
                <Divider sx={{ marginBottom: 3 }} />
                <Grid container justifyContent="center">
                    <Grid item xs={12} md={8}>
                        <Card elevation={3} sx={{ borderRadius: 2 }}>
                            <CardMedia
                                component="img"
                                image={imageUrl || 'https://via.placeholder.com/600'} // Show fetched plot or placeholder
                                alt={imageDetails.name || 'Image'}
                                sx={{
                                    height: '400px',
                                    objectFit: 'contain',
                                    borderBottom: '1px solid #ddd',
                                }}
                            />
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Image Details
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Name:</strong> {imageDetails.name}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Date:</strong> {imageDetails.date}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Owner:</strong> {imageDetails.owner}
                                </Typography>
                                <Typography variant="body1">
                                    <strong>Resolution:</strong> {imageDetails.resolution || 'Unknown'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>
        </div>
    );
};

export default ImagesDetails;