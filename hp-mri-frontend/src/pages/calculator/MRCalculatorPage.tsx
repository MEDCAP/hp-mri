import { useEffect } from 'react';
import React from "react";
import InputForm from "./components/InputForm";
import styles from "./MRCalculator.module.css";

const MRCalculatorPage: React.FC = () => {
    useEffect(() => {
        document.title = "HP-MRI MR Calculator"; // Dynamically updates the tab title
    }, []);

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>MR Coil Component Calculator</h1>
            <InputForm />
        </div>
    );
};

export default MRCalculatorPage;
