import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import HeaderAccount from '../../components/HeaderAccount';
import {
    Button,
    Container,
    Grid,
    Typography,
    Tooltip,
} from '@mui/material';
import { Refresh, PlayArrow } from '@mui/icons-material';

const NewSimulatorPage: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const fetchNewSimulator = () => {
        // TODO
        // Fetch new simulator logic here
    };

    useEffect(() => {
        fetchNewSimulator();
        document.title = "New Simulator - HP";
    }, []);

    return (
        <div
            style={{
                marginLeft: isSidebarOpen ? '260px' : '80px',
                width: isSidebarOpen ? 'calc(100% - 260px)' : 'calc(100% - 80px)',
                transition: 'margin-left 0.3s, width 0.3s',
            }}
        >
            <HeaderAccount />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <Container maxWidth="lg" sx={{ paddingTop: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Simulator
                </Typography>

                <Grid container spacing={2} alignItems="center" sx={{ marginBottom: 2 }}>
                    {/* Search Field */}
                    <Grid item xs={8}>
                    </Grid>

                    {/* Buttons */}
                    <Grid item xs={4} textAlign="right">
                        <Tooltip title="Run to viewer">
                            <Button
                                variant="contained"
                                startIcon={<PlayArrow />}
                                // onClick={() => TODO - Run logic function called here}
                                sx={{
                                    marginLeft: 1,
                                    marginTop: '-8px',
                                }}
                            >
                                Run
                            </Button>
                        </Tooltip>
                        <Tooltip title="Refresh new simulator">
                            <Button
                                variant="outlined"
                                startIcon={<Refresh />}
                                onClick={fetchNewSimulator}
                                sx={{
                                    marginLeft: 1,
                                    marginTop: '-8px',
                                }}
                            >
                                Refresh
                            </Button>
                        </Tooltip>
                    </Grid>
                </Grid>

            </Container>
        </div>
    );
};

export default NewSimulatorPage;
