import React from 'react';
import { Container, Typography } from '@mui/material';

const SimulatePage: React.FC = () => {
    return (
        <Container maxWidth="md" sx={{ paddingTop: 4 }}>
            <Typography variant="h3" gutterBottom>
                Simulate Data
            </Typography>
            <Typography variant="body1">
                Detailed explanation about simulating data.
            </Typography>
        </Container>
    );
};

export default SimulatePage;
