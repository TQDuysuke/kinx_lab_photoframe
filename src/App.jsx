import React, { useState } from 'react';
import Upload from './components/Upload';
import TemplateSelector from './components/TemplateSelector';
import FrameCanvas from './components/FrameCanvas';
import { extractExif } from './utils/extractExif';
import { iphoneFrame } from './templates/iphoneFrame';
import { Image as ImageIcon } from 'lucide-react';

// Import logos
import appleLogo from './assets/Apple_logo_black.svg.png';
import fujiLogo from './assets/Fujifilm_logo.svg.png';
import sonyLogo from './assets/Sony_logo.svg.png';
import canonLogo from './assets/Canon_wordmark.svg.png';

const templates = [iphoneFrame];

export default function App() {
  const [imageSrc, setImageSrc] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  
  // New customization state
  const [fontSizeScale, setFontSizeScale] = useState(143);
  const [customLogo, setCustomLogo] = useState(null);

  const handleUpload = async (file) => {
    const exifData = await extractExif(file);
    setMetadata(exifData || {});

    // Auto select camera logo based on EXIF
    if (exifData && exifData.make) {
      const make = exifData.make.toLowerCase();
      if (make.includes('apple')) {
        setCustomLogo(appleLogo);
      } else if (make.includes('fujifilm') || make.includes('fuji')) {
        setCustomLogo(fujiLogo);
      } else if (make.includes('sony')) {
        setCustomLogo(sonyLogo);
      } else if (make.includes('canon')) {
        setCustomLogo(canonLogo);
      } else {
        setCustomLogo(null);
      }
    } else {
      setCustomLogo(null);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('image/svg') || file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) {
      const reader = new FileReader();
      reader.onload = (e) => setCustomLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setMetadata(null);
    setCustomLogo(null);
    setFontSizeScale(143);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Photo Metadata Frame Generator</h1>
        <p>Turn your photos into professional showcases</p>
      </header>

      <main className="app-main">
        {!imageSrc ? (
          <Upload onUpload={handleUpload} />
        ) : (
          <div className="editor-container">
            <div className="editor-controls">
              <TemplateSelector
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelect={setSelectedTemplate}
              />
              
              <div className="customization-panel">
                <div className="control-group">
                  <label htmlFor="fontSizeSlider" className="control-label">
                    Text Size: {fontSizeScale}%
                  </label>
                  <input
                    id="fontSizeSlider"
                    type="range"
                    min="50"
                    max="200"
                    value={fontSizeScale}
                    onChange={(e) => setFontSizeScale(Number(e.target.value))}
                    className="slider"
                  />
                </div>
                
                <div className="control-group">
                  <span className="control-label">Custom Logo (PNG/SVG)</span>
                  <button className="upload-logo-btn" onClick={() => document.getElementById('logo-upload').click()}>
                    <ImageIcon size={16} /> Select Logo
                  </button>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png, image/svg+xml, image/jpeg"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />
                  {customLogo && (
                    <button className="clear-logo-btn" onClick={() => setCustomLogo(null)}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <button className="reset-btn" onClick={reset}>
                Upload Another Photo
              </button>
            </div>
            
            <FrameCanvas
              imageSrc={imageSrc}
              metadata={metadata}
              template={selectedTemplate}
              fontSizeScale={fontSizeScale}
              customLogo={customLogo}
            />
          </div>
        )}
      </main>
    </div>
  );
}
