# MEDCAP HP-MRI Web Application

A full-stack web application designed to streamline the management, simulation, and analysis of MRI data. Built with **React** for the frontend and **Flask** for the backend, this application integrates user-friendly interfaces and powerful backend processing to enhance MRI workflows.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Setup](#project-setup)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Development Notes](#development-notes)

---

## Features

### Core Functionality:
- **Upload MRI Data**: Simplified file uploads with error handling and tagging.
- **Retrieve Data**: Organized and sortable list view for managing MRI files.
- **Simulate MRI Data**: Tools to create and simulate MRI file operations with custom parameters.
- **Image Analysis**: Detailed image viewer with metadata display and analysis capabilities.

### User Interface:
- **Modern Design**: Fully styled with Material-UI (MUI) components for a sleek, responsive design.
- **Interactive Tables**: Sortable, searchable, and actionable tables for data management.
- **Sidebar Navigation**: Collapsible navigation with dynamic icons and tooltips.
- **Header Account Management**: Integrated header with user account access and actions.

## Technologies Used

### Frontend:
- **React** (via Vite) for a fast and modular UI.
- **Material-UI (MUI)** for a polished and accessible component library.
- **Axios** for seamless HTTP communication with the backend.
- **React Router** for navigation and dynamic routing.

### Backend:
- **Flask** for API development and routing.
- **CORS** for enabling secure communication between the frontend and backend.
- **Flask-RESTful** for clean and structured API endpoints.

---

## Project Setup

### Frontend Setup

To set up and run the frontend (React/Vite):

1. Clone the repository and navigate to the frontend directory:
   ```bash
   cd hp-mri-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the frontend at `http://localhost:5173`.

### Backend Setup

To set up and run the backend (Flask):

1. Navigate to the backend directory:
    ```bash
    cd server
    ```

2. Create a virtual environment:
    ```bash
    python3 -m venv venv
    ```

3. Activate the virtual environment:
    - On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```
    
    - On Windows:
        ```bash
        .\venv\Scripts\activate
        ```

4. Install backend dependencies:
    ```bash
    pip install -r requirements.txt
    ```

5. Start the Flask server:
    ```bash
    python app.py
    ```

6. Access the backend at `http://localhost:5000`.

## Development Notes

### Pages and Components
- **Retrieve Page**:
  - Search, sort, and filter MRI data with a dynamic table.
  - Integrated buttons for upload, refresh, delete, and download actions.
- **Simulator Page**:
  - Built with a similar design to the Retrieve Page for consistency.
  - Includes a `Create` button to navigate to the `new-simulator` page.
  - Displays columns: `Name`, `Sequence`, and `Image`.
- **Image Details Page**:
  - Enhanced layout with Material-UI cards for image and metadata display.
  - Integrated "Analyze" button for future expansion.
- **Header**:
  - Clean design with a logo, title, and account access.
  - Styled with Material-UI AppBar and Avatar components.
- **Sidebar**:
  - Collapsible sidebar with animated transitions.
  - Interactive icons and tooltips for better user experience.
 
### Upcoming Enhancements:
- **File Reconstruction**: Add support for reconstructing MRI files.
- **Data Analysis**: Expand image and file analysis features.
- **User Authentication**: Secure access with login and session management.
- **Cloud Storage Integration**: Seamless integration with AWS S3 for storing MRI files.
  
For more details or issues, feel free to reach out or open a GitHub issue.
