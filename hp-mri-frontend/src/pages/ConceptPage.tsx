import React from 'react';
import { Container, Typography } from '@mui/material';

const ConceptPage: React.FC = () => {
    return (
        <Container maxWidth="md" sx={{ paddingTop: 4 }}>
            <Typography variant="h3" gutterBottom>
                Concept
            </Typography>
            <Typography variant="body1">
                Detailed explanation about the Concept of HP-MRI.
            </Typography>
        </Container>
    );
};

export default ConceptPage;
