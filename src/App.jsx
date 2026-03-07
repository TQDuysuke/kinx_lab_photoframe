import React, { useState, useEffect } from 'react';
import Upload from './components/Upload';
import TemplateSelector from './components/TemplateSelector';
import FrameCanvas from './components/FrameCanvas';
import { extractExif } from './utils/extractExif';
import { iphoneFrame } from './templates/iphoneFrame';
import { Image as ImageIcon, Download, X, Moon, Sun, LayoutTemplate, SlidersHorizontal, Type, ArrowDownToLine } from 'lucide-react';
import { generateFrameUrl } from './utils/generateFrame';

// Import logos
import appleLogo from './assets/Apple_logo_black.svg.png';
import fujiLogo from './assets/Fujifilm_logo.svg.png';
import fujiLogoWhite from './assets/Fujifilm-Logo-WHITE.png';
import sonyLogo from './assets/Sony_logo.svg.png';
import canonLogo from './assets/Canon_wordmark.svg.png';
import { generateDisplayUrl } from './utils/imageOptimization';
import { blurFrame } from './templates/blurFrame';
import { liveViewFrame } from './templates/liveViewFrame';
import { filmFrame } from './templates/filmFrame';
import { glassFrame } from './templates/glassFrame';

const templates = [iphoneFrame, blurFrame, liveViewFrame, filmFrame, glassFrame];

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [activePhotoId, setActivePhotoId] = useState(null);
  const [activeMobileTab, setActiveMobileTab] = useState(null); // 'templates', 'text', 'frame', 'logo'
  const [photoToDelete, setPhotoToDelete] = useState(null); // Custom popup state
  const [deferredPrompt, setDeferredPrompt] = useState(null); // PWA Install state


  // Dark mode state: initialize from localStorage or system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('photoframe-theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Fallback to system preference if no saved preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync dark mode preference to localStorage and listen for system changes
  useEffect(() => {
    localStorage.setItem('photoframe-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('photoframe-theme')) {
        setIsDarkMode(e.matches);
      }
    };
    
    // Add event listener for system theme changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };


  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);


  // New customization state
  const [fontSizeScale, setFontSizeScale] = useState(145);
  const [logoSizeScale, setLogoSizeScale] = useState(245);

  // Advanced template parameters
  const [framePadding, setFramePadding] = useState(6); // % width
  const [blurRadius, setBlurRadius] = useState(17); // px
  const [blurBrightness, setBlurBrightness] = useState(100); // %
  const [shadowOpacity, setShadowOpacity] = useState(55); // %
  const [focusX, setFocusX] = useState(50); // %
  const [focusY, setFocusY] = useState(50); // %

  const [userUploadedLogo, setUserUploadedLogo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Helper to determine logo based on EXIF
  const getLogoForMake = (makeStr, styleName) => {
    if (!makeStr) return null;
    const make = makeStr.toLowerCase();
    if (make.includes('apple')) return appleLogo;
    if (make.includes('fujifilm') || make.includes('fuji')) {
      return (styleName === 'blur_style' || styleName === 'glass_style') ? fujiLogoWhite : fujiLogo;
    }
    if (make.includes('sony')) return sonyLogo;
    if (make.includes('canon')) return canonLogo;
    return null;
  };

  // Apple logo is much larger in the asset — default it to 100%, others use slider
  const getEffectiveLogoSize = (makeStr, sliderValue) => {
    if (!makeStr) return sliderValue;
    return makeStr.toLowerCase().includes('apple') ? 100 : sliderValue;
  };

  const handleUpload = async (files) => {
    setIsProcessingUpload(true);
    try {
      const newPhotos = await Promise.all(
        files.map(async (file) => {
          const id = Math.random().toString(36).substr(2, 9);

          let exifData = {};
          let displayUrl = '';

          try {
            exifData = await extractExif(file);
          } catch (err) { console.warn("Failed EXIF:", err); }

          try {
            // Downscale to 1920 immediately for real-time UI switching
            displayUrl = await generateDisplayUrl(file, 1920);
          } catch (err) {
            console.warn("Failed display resize:", err);
            displayUrl = URL.createObjectURL(file);
          }

          return {
            id,
            file,
            displayUrl,
            metadata: exifData || {}
          };
        })
      );

      setPhotos((prev) => {
        let combined = [...prev, ...newPhotos];
        if (combined.length > 20) {
          alert("Maximum 20 photos allowed. Slicing the latest additions.");
          // Free memory for discarded files
          const discarded = combined.slice(20);
          discarded.forEach(p => { if (p.displayUrl) URL.revokeObjectURL(p.displayUrl); });
          combined = combined.slice(0, 20);
        }

        if (!activePhotoId && combined.length > 0) {
          setActivePhotoId(combined[0].id);
        }
        return combined;
      });
    } catch (error) {
      console.error("Error during upload generation:", error);
      alert("Encountered an error while preparing previews.");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const activePhoto = photos.find((p) => p.id === activePhotoId);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type.startsWith('image/svg') || file.type.startsWith('image/png') || file.type.startsWith('image/jpeg'))) {
      const reader = new FileReader();
      reader.onload = (e) => setUserUploadedLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (id, e) => {
    e.stopPropagation();
    setPhotos(prev => {
      const p = prev.find(photo => photo.id === id);
      if (p && p.displayUrl) URL.revokeObjectURL(p.displayUrl);
      const newPhotos = prev.filter(photo => photo.id !== id);

      if (activePhotoId === id) {
        setActivePhotoId(newPhotos.length > 0 ? newPhotos[0].id : null);
      }
      return newPhotos;
    });
  };

  const reset = () => {
    photos.forEach(photo => {
      // Free browser memory
      if (photo.displayUrl) URL.revokeObjectURL(photo.displayUrl);
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
          userUploadedLogo,
          getLogoForMake(photo.metadata?.make, selectedTemplate?.name),
          getEffectiveLogoSize(photo.metadata?.make, logoSizeScale),
          { framePadding, blurRadius, shadowOpacity, blurBrightness, focusX, focusY }
        );

        // Get original photo name for the fallback or the shared file
        const oName = photo.file?.name ? photo.file.name.replace(/\.[^/.]+$/, '') : `photo-${i + 1}`;

        // Strict iOS detection (iPhone, iPad, iPod) - handling both old and new iPads
        const isIOS = [
          'iPad Simulator',
          'iPhone Simulator',
          'iPod Simulator',
          'iPad',
          'iPhone',
          'iPod',
        ].includes(navigator.platform)
        // iPad on iOS 13+ detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

        if (isIOS && navigator.share && navigator.canShare) {
          // Convert dataURL to Blob for iOS native Share Sheet
          try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], `framed-${oName}.jpg`, { type: 'image/jpeg' });
            
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Photo Frame',
              });
              continue; // Successfully shared/saved natively, skip the <a> tag
            }
          } catch (shareErr) {
            console.log("Web Share API failed or cancelled", shareErr);
            // Fallback to <a> tag if it fails
          }
        }

        const a = document.createElement('a');
        a.href = dataUrl;
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

  // --- Mobile Long Press to Delete Logic ---
  let pressTimer = null;

  const handleThumbnailTouchStart = (photoId) => {
    pressTimer = setTimeout(() => {
      setPhotoToDelete(photoId); // Show custom modal
    }, 600); // 600ms long press
  };

  const handleThumbnailTouchEnd = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  // --- Reusable Control Components for Desktop & Mobile ---
  
  const renderTemplateSelector = () => (
    <div className="settings-section">
      <h3 className="template-heading" style={{ marginBottom: '0.75rem' }}>Layout Style</h3>
      <TemplateSelector
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelect={setSelectedTemplate}
      />
    </div>
  );

  const renderTypographySettings = () => (
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
  );

  const renderLogoSettings = () => (
    <>
      {!['film_style', 'live_view_style', 'glass_style'].includes(selectedTemplate.name) && (
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
      )}
      {!['film_style', 'live_view_style', 'glass_style'].includes(selectedTemplate.name) && (
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
      )}
    </>
  );

  const renderFrameSettings = () => (
    <>
      <div className="settings-section">
        <div className="control-group">
          <label htmlFor="framePaddingSlider" className="control-label">
            Frame Margin: {framePadding}%
          </label>
          <input
            id="framePaddingSlider"
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={framePadding}
            onChange={(e) => setFramePadding(Number(e.target.value))}
            className="slider"
          />
        </div>
      </div>

      {selectedTemplate.name === 'blur_style' && (
        <>
          <div className="settings-section">
            <div className="control-group">
              <label htmlFor="blurRadiusSlider" className="control-label">
                Background Blur: {blurRadius}px
              </label>
              <input
                id="blurRadiusSlider"
                type="range"
                min="0"
                max="100"
                value={blurRadius}
                onChange={(e) => setBlurRadius(Number(e.target.value))}
                className="slider"
              />
            </div>
          </div>
          <div className="settings-section">
            <div className="control-group">
              <label htmlFor="blurBrightnessSlider" className="control-label">
                Background Brightness: {blurBrightness}%
              </label>
              <input
                id="blurBrightnessSlider"
                type="range"
                min="10"
                max="150"
                value={blurBrightness}
                onChange={(e) => setBlurBrightness(Number(e.target.value))}
                className="slider"
              />
            </div>
          </div>
          <div className="settings-section">
            <div className="control-group">
              <label htmlFor="shadowSlider" className="control-label">
                Drop Shadow: {shadowOpacity}%
              </label>
              <input
                id="shadowSlider"
                type="range"
                min="0"
                max="100"
                value={shadowOpacity}
                onChange={(e) => setShadowOpacity(Number(e.target.value))}
                className="slider"
              />
            </div>
          </div>
        </>
      )}

      {selectedTemplate.name === 'live_view_style' && (
        <>
          <div className="settings-section">
            <div className="control-group">
              <label htmlFor="focusXSlider" className="control-label">
                Focus Point X: {focusX}%
              </label>
              <input
                id="focusXSlider"
                type="range"
                min="10"
                max="90"
                value={focusX}
                onChange={(e) => setFocusX(Number(e.target.value))}
                className="slider"
              />
            </div>
          </div>
          <div className="settings-section">
            <div className="control-group">
              <label htmlFor="focusYSlider" className="control-label">
                Focus Point Y: {focusY}%
              </label>
              <input
                id="focusYSlider"
                type="range"
                min="10"
                max="90"
                value={focusY}
                onChange={(e) => setFocusY(Number(e.target.value))}
                className="slider"
              />
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className={`app-container${isDarkMode ? ' dark-theme' : ''}`}>
      {isProcessingUpload && (
        <div className="global-loading-overlay">
          <div className="spinner"></div>
          <h2>Optimizing Previews...</h2>
          <p>Please wait, preparing frames for instant viewing.</p>
        </div>
      )}
      <header className={`app-header ${photos.length > 0 ? 'header-hidden-mobile' : ''}`}>
        <button
          className="theme-toggle-btn"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {deferredPrompt && (
          <button 
            className="install-app-btn" 
            onClick={handleInstallClick}
            title="Install SOJI Studio to your device"
          >
            <ArrowDownToLine size={16} /> Install App
          </button>
        )}
        <h1>Kinx's Lab | SOJI Studio</h1>
        <p>Photo Frame Generator</p>
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
                      <img src={photo.displayUrl} alt="Thumbnail" />
                      <button className="remove-photo-btn" onClick={(e) => removePhoto(photo.id, e)} title="Remove photo">
                        <X size={14} />
                      </button>
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
                      if (photos.length >= 20) {
                        alert("You have reached the maximum limit of 20 photos. Please clear some before adding more.");
                        return;
                      }
                      if (files.length > 0) handleUpload(files);
                      e.target.value = null; // reset input
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
                  imageSrc={activePhoto.displayUrl}
                  metadata={activePhoto.metadata}
                  template={selectedTemplate}
                  fontSizeScale={fontSizeScale}
                  userUploadedLogo={userUploadedLogo}
                  detectedLogo={getLogoForMake(activePhoto?.metadata?.make, selectedTemplate?.name)}
                  originalFile={activePhoto.file}
                  logoSizeScale={getEffectiveLogoSize(activePhoto?.metadata?.make, logoSizeScale)}
                  advancedParams={{ framePadding, blurRadius, shadowOpacity, blurBrightness, focusX, focusY }}
                />
              )}
            </section>

            {/* RIGHT COLUMN: Settings Panel */}
            <aside className="column-right">
              <div className="panel-box">
                <h2 className="panel-title">Settings</h2>
                {renderTemplateSelector()}
                {renderTypographySettings()}
                {renderFrameSettings()}
                {renderLogoSettings()}

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

      {/* MOBILE BOTTOM NAVIGATION BAR & POPUP */}
      {photos.length > 0 && (
        <>
          <div className="mobile-thumbnail-strip">
            {photos.map((photo) => (
              <div
                key={`mobile-${photo.id}`}
                className={`thumbnail-item ${photo.id === activePhotoId ? 'active' : ''}`}
                onClick={() => setActivePhotoId(photo.id)}
                onTouchStart={() => handleThumbnailTouchStart(photo.id)}
                onTouchEnd={handleThumbnailTouchEnd}
                onTouchMove={handleThumbnailTouchEnd}
              >
                <img src={photo.displayUrl} alt="Thumbnail" style={{ pointerEvents: 'none' }} />
                <button className="remove-photo-btn mobile-hide" onClick={(e) => removePhoto(photo.id, e)} title="Remove photo">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <nav className="mobile-bottom-bar">
            <button className={`mobile-tab-btn ${activeMobileTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'templates' ? null : 'templates')}>
              <LayoutTemplate size={22} />
              <span>Layout</span>
            </button>
            <button className={`mobile-tab-btn ${activeMobileTab === 'text' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'text' ? null : 'text')}>
              <Type size={22} />
              <span>Text</span>
            </button>
            <button className={`mobile-tab-btn ${activeMobileTab === 'frame' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'frame' ? null : 'frame')}>
              <SlidersHorizontal size={22} />
              <span>Frame</span>
            </button>
            <button className={`mobile-tab-btn ${activeMobileTab === 'logo' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'logo' ? null : 'logo')}>
              <ImageIcon size={22} />
              <span>Logo</span>
            </button>
            <button className="mobile-tab-btn" onClick={handleBatchDownload} disabled={isDownloading} style={{ color: isDownloading ? 'var(--text-muted)' : 'var(--accent)' }}>
              <ArrowDownToLine size={22} />
              <span>{isDownloading ? 'Wait' : 'Save'}</span>
            </button>
          </nav>

          {/* MOBILE BOTTOM SHEET FOR ACTIVE TAB */}
          <div className={`mobile-bottom-sheet ${activeMobileTab ? 'open' : ''}`}>
            <div className="sheet-header">
              <h3 className="sheet-title">
                {activeMobileTab === 'templates' && 'Layout Style'}
                {activeMobileTab === 'text' && 'Typography Options'}
                {activeMobileTab === 'frame' && 'Frame Settings'}
                {activeMobileTab === 'logo' && 'Logo & Branding'}
              </h3>
              <button className="close-sheet-btn" onClick={() => setActiveMobileTab(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-content">
              {activeMobileTab === 'templates' && renderTemplateSelector()}
              {activeMobileTab === 'text' && renderTypographySettings()}
              {activeMobileTab === 'frame' && renderFrameSettings()}
              {activeMobileTab === 'logo' && renderLogoSettings()}
            </div>
          </div>
          {/* DELETE CONFIRMATION MODAL */}
          {photoToDelete && (
            <div className="delete-confirm-overlay">
              <div className="delete-confirm-modal">
                <h3>Remove Photo?</h3>
                <p>Are you sure you want to remove this photo from your workspace?</p>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setPhotoToDelete(null)}>Cancel</button>
                  <button className="btn-delete" onClick={(e) => {
                    removePhoto(photoToDelete, e);
                    setPhotoToDelete(null);
                  }}>Remove</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <footer className="app-footer">
        <div className="footer-brand">
          <img src="/logo.svg" alt="Kinx's Lab Logo" className="footer-logo" />
          <span className="footer-brand-name">Kinx's Lab</span>
        </div>
        <p className="footer-tagline">Professional Photo Frame Generator — powered by HTML Canvas & EXIF</p>
        <p className="footer-copy">© {new Date().getFullYear()} Kinx's Lab · All rights reserved</p>
      </footer>
    </div>
  );
}
