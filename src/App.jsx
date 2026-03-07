import React, { useState } from 'react';
import Upload from './components/Upload';
import TemplateSelector from './components/TemplateSelector';
import FrameCanvas from './components/FrameCanvas';
import { extractExif } from './utils/extractExif';
import { iphoneFrame } from './templates/iphoneFrame';
import { Image as ImageIcon, Download } from 'lucide-react';
import { generateFrameUrl } from './utils/generateFrame';

// Import logos
import appleLogo from './assets/Apple_logo_black.svg.png';
import fujiLogo from './assets/Fujifilm_logo.svg.png';
import sonyLogo from './assets/Sony_logo.svg.png';
import canonLogo from './assets/Canon_wordmark.svg.png';

const templates = [iphoneFrame];

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [activePhotoId, setActivePhotoId] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);


  // New customization state
  const [fontSizeScale, setFontSizeScale] = useState(145);
  const [logoSizeScale, setLogoSizeScale] = useState(245);
  const [userUploadedLogo, setUserUploadedLogo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Helper to determine logo based on EXIF
  const getLogoForMake = (makeStr) => {
    if (!makeStr) return null;
    const make = makeStr.toLowerCase();
    if (make.includes('apple')) return appleLogo;
    if (make.includes('fujifilm') || make.includes('fuji')) return fujiLogo;
    if (make.includes('sony')) return sonyLogo;
    if (make.includes('canon')) return canonLogo;
    return null;
  };

  const handleUpload = async (files) => {
    const newPhotos = await Promise.all(
      files.map(async (file) => {
        const id = Math.random().toString(36).substr(2, 9);
        const exifData = await extractExif(file);

        return {
          id,
          file,
          previewUrl: URL.createObjectURL(file), // Memory efficient instead of base64
          metadata: exifData || {}
        };
      })
    );

    setPhotos((prev) => {
      const combined = [...prev, ...newPhotos];
      if (!activePhotoId && combined.length > 0) {
        setActivePhotoId(combined[0].id);
      }
      return combined;
    });
  };

  const activePhoto = photos.find((p) => p.id === activePhotoId);
  const computedLogo = userUploadedLogo || getLogoForMake(activePhoto?.metadata?.make);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('image/svg') || file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) {
      const reader = new FileReader();
      reader.onload = (e) => setUserUploadedLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const reset = () => {
    photos.forEach(photo => {
      // Free browser memory
      if (photo.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    });
    setPhotos([]);
    setActivePhotoId(null);
    setUserUploadedLogo(null);
    setFontSizeScale(145);
  };

  const handleBatchDownload = async () => {
    if (photos.length === 0) return;
    setIsDownloading(true);
    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const dataUrl = await generateFrameUrl(
          photo,
          selectedTemplate,
          fontSizeScale,
          userUploadedLogo || getLogoForMake(photo.metadata?.make),
          logoSizeScale
        );

        const a = document.createElement('a');
        a.href = dataUrl;
        const oName = photo.file?.name ? photo.file.name.replace(/\.[^/.]+$/, '') : `photo-${i + 1}`;
        a.download = `framed-${oName}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Small delay to prevent browser from blocking multiple downloads at once
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err) {
      console.error("Batch download failed:", err);
      alert("Error generating one or more images.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Photo Metadata Frame Generator</h1>
        <p>Turn your photos into professional showcases</p>
      </header>

      <main className="app-main">
        {photos.length === 0 ? (
          <div className="upload-wrapper">
            <Upload onUpload={handleUpload} />
          </div>
        ) : (
          <div className="three-column-layout">
            {/* LEFT COLUMN: Controls & Reset */}
            <aside className="column-left">
              <div className="panel-box">
                <h2 className="panel-title">Photos ({photos.length})</h2>

                <div className="thumbnail-strip">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`thumbnail-item ${photo.id === activePhotoId ? 'active' : ''}`}
                      onClick={() => setActivePhotoId(photo.id)}
                    >
                      <img src={photo.previewUrl} alt="Thumbnail" />
                    </div>
                  ))}
                </div>

                <div className="actions-group">
                  <button className="new-photo-btn" onClick={() => document.getElementById('add-more-upload').click()}>
                    Add More Photos
                  </button>
                  <input
                    id="add-more-upload"
                    type="file"
                    accept="image/jpeg, image/png, image/heic"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      if (files.length > 0) handleUpload(files);
                    }}
                  />
                  <button className="reset-btn" onClick={reset}>
                    Clear All
                  </button>
                </div>
              </div>
            </aside>

            {/* MIDDLE COLUMN: Canvas Preview */}
            <section className="column-middle">
              {activePhoto && (
                <FrameCanvas
                  imageSrc={activePhoto.previewUrl}
                  metadata={activePhoto.metadata}
                  template={selectedTemplate}
                  fontSizeScale={fontSizeScale}
                  customLogo={computedLogo}
                  originalFile={activePhoto.file}
                  logoSizeScale={logoSizeScale}
                />
              )}
            </section>

            {/* RIGHT COLUMN: Settings Panel */}
            <aside className="column-right">
              <div className="panel-box">
                <h2 className="panel-title">Settings</h2>

                <div className="settings-section">
                  <TemplateSelector
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    onSelect={setSelectedTemplate}
                  />
                </div>

                <div className="settings-section">
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
                </div>

                <div className="settings-section">
                  <div className="control-group">
                    <label htmlFor="logoSizeSlider" className="control-label">
                      Logo Size: {logoSizeScale}%
                    </label>
                    <input
                      id="logoSizeSlider"
                      type="range"
                      min="50"
                      max="400"
                      value={logoSizeScale}
                      onChange={(e) => setLogoSizeScale(Number(e.target.value))}
                      className="slider"
                    />
                  </div>
                </div>

                <div className="settings-section">
                  <span className="control-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Custom Logo</span>
                  <div className="logo-upload-group">
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
                    {userUploadedLogo && (
                      <button className="clear-logo-btn" onClick={() => setUserUploadedLogo(null)}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="settings-section" style={{ marginTop: '2rem' }}>
                  <button
                    className="download-btn"
                    onClick={handleBatchDownload}
                    disabled={isDownloading || photos.length === 0}
                    style={{ opacity: isDownloading ? 0.7 : 1, cursor: isDownloading ? 'wait' : 'pointer' }}
                  >
                    <Download size={20} />
                    {isDownloading ? 'Generating...' : `Download All (${photos.length})`}
                  </button>
                </div>

              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
