// src/pages/HomePage.tsx
import React from 'react';
import '../../styles/researchPage.css';
import HeaderHomepage from '../../components/HeaderHomepage';
import FooterHomepage from '../../components/FooterHomepage';
import MRIRecon from '../../assets/mri_recon.png';
import ImageAnalysis from '../../assets/image_analysis.png';
import MRISim from '../../assets/mri_simulator.png';
import MRIHardware from '../../assets/mri_hardware.png';
import MetaModel from '../../assets/metabolic_model.png';
import MoleModel from '../../assets/molecular_model.png';

const ResearchPage: React.FC = () => {
  return (
    <div className="research-container">
      <HeaderHomepage />
      {/* MRI recon section */}
      <div className="container">
        <div className="image-section">
          <img src={MRIRecon}/>
        </div>
        <div className="text-section">
          <h1 className="title">MRI Reconstruction</h1>
          <h2 className="subtitle">A standard MRI reconstruction methods based on MRD format</h2>
          <p className="content">Along with the motivation to develop standard data structure to store MRI data, the MRD working group developed the Gadgetron,
                                 an interface to program reconstruction algorithm based on MRD format and integrate as a workflow in MRI console.
          </p>
        </div>
      </div>
      {/* MRI image analysis section */}
      <div className="container">
        <div className="image-section">
          <img src={ImageAnalysis}/>
        </div>
        <div className="text-section">
          <h1 className="title">MRI Image Analysis</h1>
          <h2 className="subtitle">Image analysis tools for images produced from MRD format</h2>
          <p className="content">As the standard for MRI data become established, we also need a consistent interface to analyze the images.
                                  The proposed tools provide researchers with commonly used analysis methods.
          </p>
        </div>
      </div>
      {/* MRI simulator section */}
      <div className="container">
        <div className="image-section">
          <img src={MRISim}/>
        </div>
        <div className="text-section">
          <h1 className="title">MRI Simulator</h1>
          <h2 className="subtitle">MRI simulation based on Bloch Equation to test reconstruction methods</h2>
          <p className="content">The challenge with MRI reconstruction is that the quality of images depends on the adjustment of reconstruction parameters.
                                  The optimization of these variables require try and errors of reconstruction algorithms, which can be tested on a simulator.
          </p>
        </div>
      </div>
      {/* MRI hardware section */}
      <div className="container">
        <div className="image-section">
          <img src={MRIHardware}/>
        </div>
        <div className="text-section">
          <h1 className="title">MRI Hardware</h1>
          <h2 className="subtitle">MRI coil customization to target metabolites of interest</h2>
          <p className="content">Customizing the surface coil allows us to excite specific metabolite at a time, producing clear signals.
          </p>
        </div>
      </div>
      {/* Metabolic modeling section */}
      <div className="container">
        <div className="image-section">
          <img src={MetaModel}/>
        </div>
        <div className="text-section">
          <h1 className="title">Metabolic Modeling</h1>
          <h2 className="subtitle">Metabolic models to estimate the conversion rate between each metabolites</h2>
          <p className="content">Modeling the metabolite interactions reveal the characteristics of the tissues we are scanning.
          </p>
        </div>
      </div>
      {/* Molecular modeling section */}
      <div className="container">
        <div className="image-section">
          <img src={MoleModel}/>
        </div>
        <div className="text-section">
          <h1 className="title">Molecular Modeling</h1>
          <h2 className="subtitle">Metabolic models to estimate the conversion rate between each metabolites</h2>
          <p className="content">Modeling the metabolite interactions reveal the characteristics of the tissues we are scanning.
          </p>
        </div>
      </div>
      <FooterHomepage />
    </div>
  );
};
export default ResearchPage;