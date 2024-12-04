import React from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Grid,
} from '@mui/material';
import SImage from './../images/s_image.png';

const HomePage: React.FC = () => {
  return (
    <Container
      maxWidth="md"
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 4,
        paddingTop: 14,
      }}
    >
      <Typography variant="h3" component="h1" gutterBottom>
        PIGI Lab MEDCAP
      </Typography>
      <Typography variant="h4" component="h2" gutterBottom>
        HP-MRI Web Application
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Format and Store, Simulate and Analyze MRI Instrument Data
      </Typography>

      <Grid container spacing={2} justifyContent="center">
        <Grid item>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large">
              Tool Box
            </Button>
          </Link>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            href="https://github.com"
            target="_blank"
          >
            GitHub
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            href="https://pigilab.medcap.com"
            target="_blank"
          >
            PIGLAB
          </Button>
        </Grid>
      </Grid>

      <Box
        component="img"
        src={SImage}
        alt="MRI Machine"
        sx={{
          width: '100%',
          maxWidth: '500px',
          marginTop: 4,
          borderRadius: 2,
          boxShadow: 3,
        }}
      />

      <Paper
        elevation={3}
        sx={{
          padding: 2,
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h5">Guides</Typography>
      </Paper>
    </Container>
  );
};

export default HomePage;
