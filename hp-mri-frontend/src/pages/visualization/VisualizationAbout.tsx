/**
 * @fileoverview VisualizationAbout.tsx renders the About Page for the HP MRI Web Application.
 * Provides details about the Penn Image-Guided Interventions (PIGI) Lab and introduces the development team.
 * Uses Material UI for a polished and user-friendly UI.
 *
 * @version 2.0
 * @author Benjamin Yoon
 * @date 2025-03-03
 */

import React from 'react';
import { Box, Typography, Link as MuiLink, Paper, Divider, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const VisualizationAbout: React.FC = () => {
    useEffect(() => {
        document.title = "HP-MRI Web App"; // Dynamically updates the tab title
    }, []);

    return (
        <Box
            sx={{
                maxWidth: 800,
                margin: 'auto',
                padding: 4,
                color: '#333',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Typography variant="h3" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                About
            </Typography>

            {/* Team Section */}
            <Paper elevation={3} sx={{ padding: 3, width: '100%', marginBottom: 3 }}>
                <Typography variant="h5" sx={{ color: '#0056b3', fontWeight: 'bold' }}>
                    <MuiLink
                        href="https://github.com/MEDCAP"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ color: '#0056b3' }}
                    >
                        The MEDCAP computing
                    </MuiLink>
                </Typography>

                <Divider sx={{ marginY: 2 }} />

                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Terence P. Gade, MD, PhD</Typography>
                <Typography variant="body2">Co-Director of PIGI Lab, Assistant Professor of Radiology and Cancer Biology</Typography>

                <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: 2 }}>Alexander “Shurik” Zavriyev, MS</Typography>
                <Typography variant="body2">PhD student, focusing on HP imaging applications in clinical models</Typography>

                <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: 2 }}>Team Lead Developer: Benjamin Yoon</Typography>
                <Typography variant="body2">
                    B.S.E. student at the University of Pennsylvania, developing impactful software solutions.
                    Benjamin's work showcases his commitment to leveraging technology for transformative purposes.
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: 2 }}>Manager project | Software architect: Kento Yamada</Typography>
                <Typography variant="body2">
                    Software project management @ The MEDCAP computing, PIGI Lab
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: 2 }}>Steve Kadlecek</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Zihao Zhou</Typography>
                {/* <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: 2 }}>Jiangsheng Yu</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', marginTop: 2 }}>Yohan Kim</Typography> */}
            </Paper>

            {/* Back to Application Button */}
            <Button
                component={Link}
                to="/visualize"
                variant="contained"
                sx={{
                    backgroundColor: '#0056b3',
                    color: 'white',
                    '&:hover': { backgroundColor: '#003d80' },
                    marginTop: 3,
                    marginBottom: 3,
                }}
            >
                Back to HP-MRI Web Application Visualization Component
            </Button>

            {/* PIGI Lab Section */}
            <Paper elevation={3} sx={{ padding: 3, width: '100%', marginBottom: 3 }}>
                <Typography variant="h5" sx={{ color: '#0056b3', fontWeight: 'bold' }}>
                    <MuiLink
                        href="https://www.pigilab.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{ color: '#0056b3' }}
                    >
                        PIGI Lab
                    </MuiLink>
                </Typography>
                <Typography variant="body1" sx={{ textAlign: 'justify', marginTop: 1 }}>
                    The Penn Image-Guided Interventions Lab, part of the Departments of Radiology and Cancer Biology
                    at the Perelman School of Medicine, University of Pennsylvania, focuses on translational research
                    that develops novel imaging approaches and advanced therapeutics in interventional radiology,
                    bridging gaps from bench-to-bedside in diagnosis and treatment.
                </Typography>
            </Paper>
        </Box>
    );
};

export default VisualizationAbout;
