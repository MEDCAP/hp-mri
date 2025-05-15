import { useEffect } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
} from '@mui/material';
import PigiLogo from './../images/pigi-optblue_transparentexceptpennlogo.png';
import ConceptImage from './../images/concept_image.png';
import ConvertStoreImage from './../images/convert_store_image.png';
import SimulateImage from './../images/simulate_image.png';
import AnalyzeV from './../images/analyze_image.png';
import MRCalculatorImage from './../images/mr_calculator_image.png'

const HomePage: React.FC = () => {
  useEffect(() => {
    document.title = "HP-MRI Web App"; // Dynamically updates the tab title
  }, []);

  const sections = [
    {
      heading: 'Concept',
      description: 'A scalable web application for HP-MRI data standardization, visualization, and sharing.',
      image: ConceptImage,
      link: '/concept',
    },
    {
      heading: 'Convert and Store Data',
      description: 'A tool to convert data to the standard ISMRMRD data format and store data.',
      image: ConvertStoreImage,
      link: '/convert-store',
    },
    {
      heading: 'Visualize and Analyze Data',
      description: 'A tool to enable real-time data visualization and analysis.',
      image: AnalyzeV,
      link: '/visualize-analyze',
    },
    {
      heading: 'Simulate Data',
      description: 'A tool to simulate data with sequence design programming.',
      image: SimulateImage,
      link: '/simulate',
    },
    {
      heading: 'MR Coil Component Calculator',
      description: 'A calculator for tuning and matching capacitance values.',
      image: MRCalculatorImage,
      link: '/mr-coil-calculator',
    },
  ];

  return (
    <Container
      maxWidth="lg"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'center',
        paddingY: 4,
        paddingTop: 0, // Remove unnecessary padding
        marginTop: '-60px',
      }}
    >
      {/* Top Buttons */}
      <Grid container spacing={2} justifyContent="space-between" sx={{ width: '100%' }}>
        <Grid item>
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            href="https://github.com/MEDCAP"
            target="_blank"
          >
            GitHub
          </Button>
          <Link to="/about-devs" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large" sx={{ marginLeft: 2 }}>
              About Devs
            </Button>
          </Link>
          <Link to="/mr-coil-calculator" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large" sx={{ marginLeft: 2 }}>
              MR Calculator
            </Button>
          </Link>
        </Grid>
        <Grid item>
          <Link to="/account" style={{ textDecoration: 'none' }}>
            <Button variant="contained" color="primary" size="large">
              Sign in
            </Button>
          </Link>
        </Grid>
      </Grid>

      {/* Logo Section */}
      <Box
        component="a"
        href="https://www.pigilab.com/"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          marginTop: 8,
          display: 'block',
          textAlign: 'center',
        }}
      >
        <Box
          component="img"
          src={PigiLogo}
          alt="PIGI Lab Logo"
          sx={{
            width: '100%',
            maxWidth: '400px', // Dominant size for the logo
            height: 'auto',
            marginX: 'auto',
            boxShadow: 4,
            borderRadius: 2,
          }}
        />
      </Box>

      <Typography
        variant="h3"
        component="h1"
        sx={{
          marginTop: 4,
          fontWeight: 600,
          color: 'primary.main',
        }}
      >
        Welcome to the MEDCAP
      </Typography>
      {/* Heading and Description */}
      <Typography
        variant="h3"
        component="h1"
        sx={{
          marginTop: 4,
          fontWeight: 600,
          color: 'primary.main',
        }}
      >
        HP-MRI Web Application
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Format and Store, Simulate and Analyze MRI Instrument Data
      </Typography>

      {/* Sections */}
      <Box
        sx={{
          marginTop: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          width: '100%',
        }}
      >
        {sections.map((section, index) => (
          <Card
            key={index}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              padding: 2,
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 6,
              },
            }}
            component={Link}
            to={section.link}
          >
            <CardMedia
              component="img"
              sx={{
                width: { xs: '100%', md: '40%' },
                height: 'auto',
                borderRadius: 2,
                boxShadow: 1,
                maxWidth: '250px',
              }}
              image={section.image}
              alt={section.heading}
            />
            <CardContent sx={{ textAlign: 'left', paddingLeft: { md: 3 } }}>
              <Typography variant="h5" gutterBottom>
                {section.heading}
              </Typography>
              <Typography variant="body1" color="textSecondary">
                {section.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
};

export default HomePage;
