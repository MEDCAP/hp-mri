import { useState } from 'react';
import html2canvas from 'html2canvas';

export function useScreenshot() {
  const [filename, setFilename] = useState("screenshot.png");

  const handleSaveScreenshot = () => {
    const el = document.getElementById('viewer-grid-root');
    if (el) {
      html2canvas(el).then(canvas => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = filename || 'screenshot.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  };

  return { filename, setFilename, handleSaveScreenshot };
}
