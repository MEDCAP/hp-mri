# **HP-MRI Web App**  

**Author(s):** The MEDCAP computing (Ben Yoon, Yamada, Kadlecek, Zhou)  
**Date:** Fri Feb 28, 2025  
**Version:** 2.0.1

A **full-stack web application** designed to streamline the **visualization, simulation, shareability, and conversion** of **Hyperpolarized MRI (HP MRI) data**. Built with **React (Vite)** on the **frontend** and **Flask** on the **backend**, this application provides an intuitive UI for managing MRI workflows, sharing (storing and retrieving) data, and visualizing MRI images in an **interactive and scalable** way.

---

## **Table of Contents**
- [Key Features](#key-features)
- [Technologies Used](#technologies-used)
- [Project Setup](#project-setup)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Application Overview](#application-overview)
- [Upcoming Enhancements](#upcoming-enhancements)

---

## **Key Features**

### **🔬 MRI Data Management & Visualization**
- **Upload MRI Data**: Drag-and-drop file uploads with real-time validation.
- **Retrieve & Search**: View, filter, and sort MRI data with an interactive **data table**.
- **Image Analysis & Visualization**: Overlay **HP-MRI spectral data** on MRI images with adjustable contrast, slice selection, and dataset switching.
- **Grid-based Spectral Display**: Dynamic grid overlay ensuring spectral data is displayed properly aligned to MRI scans.

### **🎛️ Advanced Simulation & Processing**
- **Custom HP-MRI Simulations**: Adjust and simulate MRI parameters with real-time feedback.
- **Spectral Data Adjustments**: Modify MRI visualization using **sliders** for contrast, dataset selection, and image slices.
- **Plot Manipulation**: Shift and reset the HP-MRI plot with a built-in **plot shift UI**.
- **Toggle HP-MRI Data**: Easily enable or disable HP-MRI plot overlays.

---

## **Technologies Used**

### **Frontend (React)**
- **React (Vite)** – Fast, modular, and optimized UI.
- **Material-UI (MUI)** – Sleek UI components styled for usability.
- **React Router** – Efficient routing for multiple pages.
- **HTML2Canvas** – Capture in-app screenshots.

### **Backend (Flask)**
- **Flask** – Python-based backend API for MRI data processing.
- **Flask-RESTful** – Organized API architecture.
- **CORS** – Secure communication between frontend and backend.

---

## **Project Setup**

### **Frontend Setup**
To set up and run the frontend (React + Vite):

1. **Clone the repository and navigate to the frontend directory**:
   ```bash
   cd hp-mri-frontend
2. **Install dependencies**:
   ```bash
   npm install
3. **Start the development server**:
   ```bash
   npm run dev
4. **Access the frontend at**:
   👉 http://localhost:5173

### **Backend Setup**
To set up and run the backend (Flask):

1. **Navigate to the backend directory**:
   ```bash
   cd server
2. **Create a virtual environment**:
   ```bash
   python3 -m venv venv
3. **Activate the virtual environment**:
   - **Mac/Linux**:
     ```bash 
     source venv/bin/activate
   - **Windows**:
     ```bash
     .\venv\Scripts\activate
4. **Install backend dependencies**:
   ```bash
   pip install -r requirements.txt
5. **Start the Flask server**:
   ```bash
   python app.py
6. **Access the backend at**:
   👉 http://localhost:5000

## **Application Overview**

### **📌 Core Pages & Components**
1. **MRI Visualization Page (`/visualize`)**
- Displays **MRI images** with spectral data overlay.
- **Three sliders** (Dataset, Image Slice, Contrast) for fine-tuning visualizations.
- **Plot shift buttons** for precise MRI data adjustments.
- **HP-MRI toggle switch** to enable/disable spectral overlays.
2. **MRI Data Management (`/mrd-files`)**
- Searchable, sortable MRI file list with **Upload, Refresh, Delete, Download** buttons.
3. **Simulation Page (`/simulate`)**
- Tools for MRI data reconstruction and parameter simulations.

For more details, bug reports, or feature requests, feel free to reach out! 🚀

📧 **Contact**: [yoonb@seas.upenn.edu](mailto:yoonb@seas.upenn.edu)  
💻 **MEDCAP Project & GitHub Repository**: [github.com/MEDCAP/hpmri-app](https://github.com/MEDCAP)  

We appreciate your feedback and contributions! 🚀
