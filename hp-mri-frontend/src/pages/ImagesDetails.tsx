import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
    const [imageDetails, setImageDetails] = useState<any>(null);
    const [fileDetails, setFileDetails] = useState<any>(null);
    const [image, setImage] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    }, [imageId, fileId]);

    if (!imageDetails || !fileDetails)
        return <Typography variant="h5">Loading...</Typography>;

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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    MRD File: {fileDetails.name || 'Loading...'} {'>'} Image: {imageDetails.name || 'Loading...'}
                </Typography>
                <Button variant="contained" color="primary">
                    Analyze
                </Button>
            </Box>
            <Divider sx={{ marginY: 2 }} />
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardMedia
                            component="img"
                            height="300"
                            image={image || 'https://via.placeholder.com/600'} // Placeholder image until data loads
                            alt={imageDetails.name || 'Image'}
                        />
                        <CardContent>
                            <Typography variant="h6">Image Details</Typography>
                            <Typography variant="body1">
                                <strong>Name:</strong> {imageDetails.name || 'Loading...'}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Date:</strong> {imageDetails.date || 'Loading...'}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Owner:</strong> {imageDetails.owner || 'Loading...'}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Resolution:</strong> {imageDetails.resolution || 'Unknown'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">File Details</Typography>
                            <Typography variant="body1">
                                <strong>File Name:</strong> {fileDetails.name || 'Loading...'}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Owner:</strong> {fileDetails.owner || 'Loading...'}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Created Date:</strong> {fileDetails.date || 'Loading...'}
                            </Typography>
                            <Typography variant="body1">
                                <strong>Tags:</strong> {fileDetails.tags || 'None'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ImagesDetails;