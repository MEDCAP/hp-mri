import { useEffect } from 'react';
import React from 'react';
import { Container, Typography } from '@mui/material';

const ConvertStorePage: React.FC = () => {
    useEffect(() => {
        document.title = "HP-MRI Web App"; // Dynamically updates the tab title
    }, []);

    return (
        <Container maxWidth="md" sx={{ paddingTop: 4 }}>
            <Typography variant="h3" gutterBottom>
                Coming Soon... Fall 2025
            </Typography>
            <Typography variant="h3" gutterBottom>
                Convert and Store Data
            </Typography>
            <Typography variant="body1">
                Detailed explanation about converting and storing data.
            </Typography>
        </Container>
    );
};

export default ConvertStorePage;
