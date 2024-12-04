import { createTheme, ThemeOptions } from '@mui/material/styles';

const theme: ThemeOptions = createTheme({
  palette: {
    primary: {
      main: '#4a4a4a', // Neutral gray for primary elements
    },
    secondary: {
      main: '#007bff', // Blue accent color
    },
    background: {
      default: '#f8f9fa', // Light gray background
    },
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif", // Clean, modern font
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#4a4a4a', // Matches primary color for headers
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: '#4a4a4a',
    },
    body1: {
      fontSize: '1rem',
      color: '#4a4a4a',
    },
    button: {
      textTransform: 'none', // Keeps button text case consistent
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Rounded button edges
          padding: '10px 20px', // Consistent padding
          backgroundColor: '#007bff', // Matches secondary color
          color: '#fff', // Ensures high contrast
          '&:hover': {
            backgroundColor: '#0056b3', // Darker blue for hover state
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '20px',
          '& .MuiInputBase-root': {
            borderRadius: 8, // Rounded inputs
            backgroundColor: '#fff', // White background for text fields
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#007bff', // Accent color for inputs
            },
            '&:hover fieldset': {
              borderColor: '#0056b3', // Darker border on hover
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4a4a4a', // Primary color when focused
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16, // Soft rounded edges for cards
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)', // Subtle shadow
          padding: '20px',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#4a4a4a', // Consistent text color across typography
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          backgroundColor: '#f8f9fa', // Match the background default color
          color: '#4a4a4a',
          fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        },
      },
    },
  },
});

export default theme;
