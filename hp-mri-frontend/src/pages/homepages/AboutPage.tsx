import { useEffect } from 'react';
import React from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
} from '@mui/material';

const AboutPage: React.FC = () => {
    useEffect(() => {
        document.title = "HP-MRI Web App"; // Dynamically updates the tab title
    }, []);

    const developers = [
        {
            name: 'Ben Yoon',
            role: 'Lead Developer',
            bio: 'Ben is a talented developer specializing in scalable web applications and data visualization.',
            image: '', // Replace with image
        },
        {
            name: 'Kento',
            role: 'Project Manager - Developer',
            bio: 'Kento oversees the development process, ensuring deadlines are met and goals are achieved. He also focuses on development',
            image: '', // Replace with image
        },
        {
            name: 'Zihao',
            role: 'Backend Developer',
            bio: 'Zihao focuses on API development and database management to ensure seamless data handling.',
            image: '', // Replace with image
        },
        {
            name: 'Steve',
            role: 'Faculty Advisor',
            bio: 'TODO - N/A',
            image: '', // Replace with image
        },
        {
            name: 'Terence P. Gade',
            role: 'Co-Director of PIGI Lab',
            bio: 'Assistant Professor of Radiology and Cancer Biology, leading research initiatives in medical imaging.',
            image: '', // Replace with image
        },
        {
            name: 'Alexander "Shurik" Zavriyev',
            role: 'Research Lead',
            bio: 'PhD student focusing on HP imaging applications in clinical models.',
            image: '', // Replace with image
        }
    ];

    return (
        <Container
            maxWidth="lg"
            sx={{
                paddingY: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Typography variant="h3" component="h1" gutterBottom>
                The Metabolic Discovery Center at Penn
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
                The MEDCAP is a research group at the University of Pennsylvania Department of Radiology.
                We work at the interface between medical imaging technology and the biological features that lead to disease.
            </Typography>
            {/* Page Title */}
            <Typography variant="h3" component="h1" gutterBottom>
                About the Software Developer team
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
                Meet the talented team behind the HP-MRI Web Application.
            </Typography>

            {/* Developer Profiles */}
            <Grid container spacing={4} sx={{ marginTop: 4 }}>
                {developers.map((developer, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                padding: 2,
                                boxShadow: 3,
                                height: '100%',
                            }}
                        >
                            <CardMedia
                                component="img"
                                sx={{
                                    width: '100%',
                                    maxWidth: 150,
                                    height: 'auto',
                                    borderRadius: '50%',
                                    marginBottom: 2,
                                    boxShadow: 2,
                                }}
                                image={developer.image}
                                alt={developer.name}
                            />
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {developer.name}
                                </Typography>
                                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                                    {developer.role}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {developer.bio}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default AboutPage;
