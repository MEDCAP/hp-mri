import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
} from '@mui/material';
import PigiLogo from '../../assets/pigi_optblue_transparentexceptpennlogo.png';
import MRCalculatorImage from '../../assets/mr_calc_thumbnail.png';
import MRIRecon from '../../assets/mri_recon.png';
import ImageAnalysis from '../../assets/image_analysis.png';
import MRISim from '../../assets/mri_simulator.png';
// import MRIHardware from '../../assets/mri_hardware.png';
// import MetaModel from '../../assets/metabolic_model.png';
// import MoleModel from '../../assets/molecular_model.png';


interface ResearchProject {
  title: string;
  subtitle: string;
  content: string;
  image: string;
  link: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const researchProjects: ResearchProject[] = [
    {
      title: 'MR Coil Component Calculator',
      subtitle: 'A calculator for tuning and matching capacitance values.',
      content: 'A calculator for tuning and matching capacitance values.',
      image: MRCalculatorImage,
      link: '/mr-coil-calculator',
    },
    {
      title: 'MRI Reconstruction Tools',
      subtitle: 'Standard MRI reconstruction methods based on MRD format',
      content: 'Along with the motivation to develop standard data structure to store MRI data, the MRD working group developed the Gadgetron, an interface to program reconstruction algorithm based on MRD format and integrate as a workflow in MRI console.',
      image: MRIRecon,
      link: '/reconstruction-tools',
    },
    {
      title: 'MRI Image Analysis',
      subtitle: 'Image analysis tools for images produced from MRD format',
      content: 'As the standard for MRI data become established, we also need a consistent interface to analyze the images. The proposed tools provide researchers with commonly used analysis methods.',
      image: ImageAnalysis,
      link: '/concept', // Update with actual route when available
    },
    {
      title: 'MRI Simulator',
      subtitle: 'MRI simulation based on Bloch Equation to test reconstruction methods',
      content: 'The challenge with MRI reconstruction is that the quality of images depends on the adjustment of reconstruction parameters. The optimization of these variables require try and errors of reconstruction algorithms, which can be tested on a simulator.',
      image: MRISim,
      link: '/simulate',
    },
    // {
    //   title: 'MRI Hardware',
    //   subtitle: 'MRI coil customization to target metabolites of interest',
    //   content: 'Customizing the surface coil allows us to excite specific metabolite at a time, producing clear signals.',
    //   image: MRIHardware,
    //   link: '/mr-coil-calculator',
    // },
    // {
    //   title: 'Metabolic Modeling',
    //   subtitle: 'Metabolic models to estimate the conversion rate between each metabolites',
    //   content: 'Modeling the metabolite interactions reveal the characteristics of the tissues we are scanning.',
    //   image: MetaModel,
    //   link: '/concept', // Update with actual route when available
    // },
    // {
    //   title: 'Molecular Modeling',
    //   subtitle: 'Molecular models to understand metabolite behavior',
    //   content: 'Modeling the metabolite interactions reveal the characteristics of the tissues we are scanning.',
    //   image: MoleModel,
    //   link: '/concept', // Update with actual route when available
    // },
  ];

  const handleCardClick = (link: string) => {
    navigate(link);
  };

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
      {/* Logo Section */}
      <Box
        component="a"
        href="https://www.pigilab.com/"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          marginTop: 2,
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
          color: '#4a4a4a',
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
          color: '#4a4a4a',
        }}
      >
        HP-MRI Web Application
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Format and Store, Simulate and Analyze MRI Instrument Data
      </Typography>

      {/* Research Projects */}
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {researchProjects.map((project, index) => (
          <Card
            key={index}
            onClick={() => handleCardClick(project.link)}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
              },
            }}
          >
            {/* Image on the left */}
            <CardMedia
              component="img"
              sx={{
                width: { xs: '100%', md: '300px' },
                height: { xs: 'auto', md: '220px' },
                objectFit: 'cover',
              }}
              image={project.image}
              alt={project.title}
            />

            {/* Content on the right */}
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, color: '#011F5B' }}>
                {project.title}
              </Typography>
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 400, color: '#555' }}>
                {project.subtitle}
              </Typography>
              <Typography variant="body1" color="textSecondary" sx={{ marginTop: 1 }}>
                {project.content}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Container>
  );
};

export default HomePage;
