# PIGI MEDCAP HP-MRI Web Application

A full-stack web application to format, store, simulate, and analyze MRI instrument data. The project includes a **React** frontend and a **Flask** backend.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Project Setup](#project-setup)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)

---

## Features

- **Upload MRI Data**: A user-friendly interface for uploading MRI data files.
- **Retrieve Data**: A list view of uploaded MRI data.
- **Planned Expansion**: Add file simulation and data analysis capabilities.

## Technologies Used

### Frontend:
- **React** (via Vite) for building a fast, interactive UI.
- **Axios** for making HTTP requests to the backend.
- **CSS** for styling the components and layout.

### Backend:
- **Flask** for handling server requests and API routing.
- **CORS** (Cross-Origin Resource Sharing) to enable communication between frontend and backend.

---

## Project Setup

### Frontend Setup

To set up and run the frontend (React/Vite):

1. Clone the repository and navigate to the frontend directory:
   ```bash
   cd medcap-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run at `http://localhost:5173` by default.

### Backend Setup

To set up and run the backend (Flask):

1. Navigate to the `server` directory and create a virtual environment:
    ```bash
    cd server
    python3 -m venv venv
    ```

2. Activate the virtual environment:
    - On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```
    
    - On Windows:
        ```bash
        .\venv\Scripts\activate
        ```

3. Install dependencies
    ```bash
    pip install -r requirements.txt
    ```

4. Run the Flask server:
    ```bash
    python app.py
    ```

The backend will run at `http://localhost:5000`.
