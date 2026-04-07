import React, { useState, useCallback, useRef, useEffect } from 'react';
import DoublePrintCanvas from '../components/DoublePrintCanvas';
import { generateDisplayUrl } from '../utils/imageOptimization';
import {
  Upload as UploadIcon,
  Download,
  X,
  LayoutTemplate,
  Type,
  ImageIcon,
  Printer,
  Trash2,
  Settings2
} from 'lucide-react';

const FONT_OPTIONS = [
  { id: '1FTV-Blushing-Rose', label: 'Blushing Rose' },
  { id: 'Inter', label: 'Inter' },
  { id: 'Dancing Script', label: 'Dancing Script' }
];

export default function DoublePrintPage({ isDarkMode }) {
  const [photo, setPhoto] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Layout Controls
  const [orientation, setOrientation] = useState('landscape'); // 'portrait' | 'landscape'
  const [splitMode, setSplitMode] = useState('vertical'); // 'vertical' | 'horizontal'
  const [printerProfile, setPrinterProfile] = useState(() => localStorage.getItem('dp_printerProfile') || 'cp1000');

  // Custom Content
  const [customNames, setCustomNames] = useState(() => localStorage.getItem('dp_customNames') || 'Trung Hiếu & Hồng Hạnh');
  const [customDate, setCustomDate] = useState(() => localStorage.getItem('dp_customDate') || '12 tháng 04 năm 2026');

  // Style and Adjustments
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('dp_fontFamily') || '1FTV-Blushing-Rose');
  const [fontWeight, setFontWeight] = useState(() => localStorage.getItem('dp_fontWeight') || 'normal');
  const [fontSizeScale, setFontSizeScale] = useState(() => Number(localStorage.getItem('dp_fontSizeScale')) || 100);
  const [customFontUrl, setCustomFontUrl] = useState(null);
  const [showDashedLine, setShowDashedLine] = useState(() => {
    const saved = localStorage.getItem('dp_showDashedLine');
    return saved !== null ? saved === 'true' : true;
  });

  const [imageMargin, setImageMargin] = useState(() => {
    const v = localStorage.getItem('dp_imageMargin');
    return v !== null ? Number(v) : 3;
  });
  const [textAreaHeight, setTextAreaHeight] = useState(() => {
    const v = localStorage.getItem('dp_textAreaHeight');
    return v !== null ? Number(v) : 23;
  });
  const [textMargin, setTextMargin] = useState(() => {
    const v = localStorage.getItem('dp_textMargin');
    return v !== null ? Number(v) : 5;
  });

  // Save settings to LocalStorage when they change
  useEffect(() => {
    localStorage.setItem('dp_printerProfile', printerProfile);
    localStorage.setItem('dp_customNames', customNames);
    localStorage.setItem('dp_customDate', customDate);
    localStorage.setItem('dp_showDashedLine', showDashedLine.toString());
    localStorage.setItem('dp_fontWeight', fontWeight);
    localStorage.setItem('dp_fontSizeScale', fontSizeScale.toString());
    localStorage.setItem('dp_imageMargin', imageMargin.toString());
    localStorage.setItem('dp_textAreaHeight', textAreaHeight.toString());
    localStorage.setItem('dp_textMargin', textMargin.toString());

    // Only persist built-in fonts (CustomFont_ URLs expire upon reload)
    if (!fontFamily.startsWith('CustomFont_')) {
      localStorage.setItem('dp_fontFamily', fontFamily);
    }
  }, [printerProfile, customNames, customDate, fontFamily, showDashedLine, fontWeight, fontSizeScale, imageMargin, textAreaHeight, textMargin]);

  const [imageZoom, setImageZoom] = useState(80);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);

  const [isDownloading, setIsDownloading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState(null);

  const canvasDataRef = useRef(null);

  const handleFilesInput = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const file = files[0];
      const id = Math.random().toString(36).substr(2, 9);
      let displayUrl = '';
      try {
        displayUrl = await generateDisplayUrl(file, 2000);
      } catch {
        displayUrl = URL.createObjectURL(file);
      }
      setPhoto({ id, file, displayUrl });
      setImageZoom(100); // reset zoom on new photo
      setImageOffsetX(0);
      setImageOffsetY(0);

      // Analyze image to set optimal layout defaults
      const img = new Image();
      img.onload = () => {
        const isLandscapePhoto = img.width > img.height;
        if (isLandscapePhoto) {
          setOrientation('portrait');
          setSplitMode('horizontal'); // Top/Bottom split for landscape photos
        } else {
          setOrientation('landscape');
          setSplitMode('vertical'); // Left/Right split for portrait photos
        }
      };
      img.src = displayUrl;

    } finally {
      setIsUploading(false);
    }
  }, []);

  const handlePanChange = useCallback((dx, dy) => {
    setImageOffsetX(prev => Math.min(100, Math.max(-100, prev + dx)));
    setImageOffsetY(prev => Math.min(100, Math.max(-100, prev + dy)));
  }, []);

  const handleZoomChange = useCallback((delta) => {
    setImageZoom(prev => Math.min(200, Math.max(50, prev + delta)));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFilesInput(e.dataTransfer.files);
  }, [handleFilesInput]);

  const handleReset = () => {
    if (photo && photo.displayUrl) URL.revokeObjectURL(photo.displayUrl);
    setPhoto(null);
  };

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const customFontName = `CustomFont_${Math.random().toString(36).substring(2, 8)}`;

      const newFont = new FontFace(customFontName, `url(${url})`);
      newFont.load().then((loadedFont) => {
        document.fonts.add(loadedFont);
        setCustomFontUrl(url);
        setFontFamily(customFontName);
      }).catch(err => {
        console.error("Failed to load custom font", err);
        alert("Failed to load custom font file.");
      });
    }
    e.target.value = null;
  };

  const executePrint = () => {
    const isCP1000 = printerProfile === 'cp1000';
    const needsRotation = isCP1000 && orientation === 'portrait';

    if (!canvasDataRef.current) return;
    const imgData = canvasDataRef.current;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Vui lòng cho phép mở Popup (Pop-ups) để tính năng in hoạt động.");
      return;
    }

    const writeToPrintWindow = (imgSrc, isLandscape) => {
      printWindow.document.write(`
        <html>
          <head>
            <title>SOJI Studio - Print</title>
            <style>
              @page { 
                margin: 0; 
                size: ${isLandscape ? '6in 4in' : '4in 6in'}; 
              }
              body { 
                margin: 0; 
                padding: 0;
                display: flex; 
                justify-content: center; 
                align-items: center; 
                background: white; 
                width: 100vw;
                height: 100vh;
                overflow: hidden;
              }
              /* 0.15in ensures safe margin for borderless printers */
              img { 
                max-width: calc(100% - 0.3in); 
                max-height: calc(100% - 0.3in); 
                object-fit: contain; 
              }
            </style>
          </head>
          <body>
            <img src="${imgSrc}" onload="setTimeout(() => { window.print(); window.close(); }, 200);" />
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    if (needsRotation) {
      // Physically rotate the image using Canvas before sending to print
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.height;
        offCanvas.height = img.width;
        const ctx = offCanvas.getContext('2d');

        ctx.translate(offCanvas.width / 2, offCanvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotatedDataUrl = offCanvas.toDataURL('image/jpeg', 1.0);
        writeToPrintWindow(rotatedDataUrl, true);
      };
      img.src = imgData;
    } else {
      writeToPrintWindow(imgData, orientation === 'landscape' || isCP1000);
    }
  };

  const handleDownload = async () => {
    if (!canvasDataRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = canvasDataRef.current;
      const fileName = `double-print-${customNames.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderLayoutPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading" style={{ marginTop: '1rem' }}>Target Printer</h3>
      <div className="template-options">
        <button className={`template-btn ${printerProfile === 'cp1000' ? 'active' : ''}`} onClick={() => setPrinterProfile('cp1000')}>
          Canon CP1000
        </button>
        <button className={`template-btn ${printerProfile === 'standard' ? 'active' : ''}`} onClick={() => setPrinterProfile('standard')}>
          Standard (Any)
        </button>
      </div>

      <h3 className="template-heading" style={{ marginTop: '1rem' }}>Paper Orientation</h3>
      <div className="template-options">
        <button className={`template-btn ${orientation === 'portrait' ? 'active' : ''}`} onClick={() => setOrientation('portrait')}>
          Portrait (4x6)
        </button>
        <button className={`template-btn ${orientation === 'landscape' ? 'active' : ''}`} onClick={() => setOrientation('landscape')}>
          Landscape (6x4)
        </button>
      </div>

      <h3 className="template-heading" style={{ marginTop: '1rem' }}>Split Mode</h3>
      <div className="template-options">
        <button className={`template-btn ${splitMode === 'vertical' ? 'active' : ''}`} onClick={() => setSplitMode('vertical')}>
          Left / Right
        </button>
        <button className={`template-btn ${splitMode === 'horizontal' ? 'active' : ''}`} onClick={() => setSplitMode('horizontal')}>
          Top / Bottom
        </button>
      </div>
    </div>
  );

  const renderTextPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading">Content</h3>
      <div className="control-group">
        <label className="control-label">Names / Title</label>
        <input
          className="yearbook-input" // Reuse styling 
          type="text"
          value={customNames}
          onChange={(e) => setCustomNames(e.target.value)}
        />
      </div>
      <div className="control-group">
        <label className="control-label">Date / Subtitle</label>
        <input
          className="yearbook-input"
          type="text"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
        />
      </div>
    </div>
  );

  const renderStylePanel = () => (
    <div className="settings-section">
      <h3 className="template-heading">Typography</h3>
      <div className="yearbook-pill-row">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.id}
            className={`yearbook-pill ${fontFamily === f.id ? 'active' : ''}`}
            onClick={() => setFontFamily(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="control-group" style={{ marginTop: '1rem' }}>
        <label className="control-label">Font Weight</label>
        <select
          className="yearbook-input"
          value={fontWeight}
          onChange={(e) => setFontWeight(e.target.value)}
        >
          <option value="300">Light (300)</option>
          <option value="normal">Normal (400)</option>
          <option value="500">Medium (500)</option>
          <option value="600">Semi Bold (600)</option>
          <option value="bold">Bold (700)</option>
        </select>
      </div>

      <div className="control-group" style={{ marginTop: '0.75rem' }}>
        <label className="control-label">Text Scale: {fontSizeScale}%</label>
        <input
          type="range"
          min="50"
          max="200"
          value={fontSizeScale}
          onChange={(e) => setFontSizeScale(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="control-group" style={{ marginTop: '1rem' }}>
        <button className="upload-logo-btn" onClick={() => document.getElementById('font-upload').click()}>
          Upload Custom Font (.ttf, .otf)
        </button>
        <input
          id="font-upload"
          type="file"
          accept=".ttf,.otf,.woff"
          style={{ display: 'none' }}
          onChange={handleFontUpload}
        />
        {fontFamily !== 'Inter' && fontFamily !== 'Dancing Script' && fontFamily !== '1FTV-Blushing-Rose' && (
          <p className="upload-hint" style={{ marginTop: '0.25rem' }}>Custom font loaded.</p>
        )}
      </div>

      <h3 className="template-heading" style={{ marginTop: '1.5rem' }}>Options</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
        <input
          type="checkbox"
          checked={showDashedLine}
          onChange={(e) => setShowDashedLine(e.target.checked)}
        />
        Show Dashed Cutting Line
      </label>
    </div>
  );

  const renderImageSettings = () => (
    <div className="settings-section">
      <h3 className="template-heading">Image Fit & Pan</h3>
      <div className="control-group">
        <label className="control-label">Image Margin: {imageMargin}%</label>
        <input
          type="range"
          min="0"
          max="15"
          step="0.5"
          value={imageMargin}
          onChange={(e) => setImageMargin(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="control-group" style={{ marginTop: '0.75rem' }}>
        <label className="control-label">Text Area Height: {textAreaHeight}%</label>
        <input
          type="range"
          min="5"
          max="40"
          step="0.5"
          value={textAreaHeight}
          onChange={(e) => setTextAreaHeight(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="control-group" style={{ marginTop: '0.75rem' }}>
        <label className="control-label">Text Padding: {textMargin}%</label>
        <input
          type="range"
          min="0"
          max="15"
          step="0.5"
          value={textMargin}
          onChange={(e) => setTextMargin(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="control-group" style={{ marginTop: '0.75rem' }}>
        <label className="control-label">Zoom Scale: {imageZoom}%</label>
        <input
          type="range"
          min="50"
          max="200"
          value={imageZoom}
          onChange={(e) => setImageZoom(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="control-group" style={{ marginTop: '0.75rem' }}>
        <label className="control-label">Pan Horizontal (X): {imageOffsetX}%</label>
        <input
          type="range"
          min="-100"
          max="100"
          value={imageOffsetX}
          onChange={(e) => setImageOffsetX(Number(e.target.value))}
          className="slider"
        />
      </div>
      <div className="control-group" style={{ marginTop: '0.75rem' }}>
        <label className="control-label">Pan Vertical (Y): {imageOffsetY}%</label>
        <input
          type="range"
          min="-100"
          max="100"
          value={imageOffsetY}
          onChange={(e) => setImageOffsetY(Number(e.target.value))}
          className="slider"
        />
      </div>
      <button
        className="template-btn"
        style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
        onClick={() => { setImageOffsetX(0); setImageOffsetY(0); }}
      >
        Reset Pan to Center
      </button>
    </div>
  );

  const UploadZone = () => (
    <div
      className="yearbook-upload-zone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => document.getElementById('doubleprint-file-input').click()}
    >
      <input
        id="doubleprint-file-input"
        type="file"
        accept="image/jpeg,image/png,image/heic"
        style={{ display: 'none' }}
        onChange={(e) => handleFilesInput(e.target.files)}
      />
      {isUploading ? (
        <>
          <div className="spinner" />
          <p>Optimizing image...</p>
        </>
      ) : (
        <>
          <Printer size={52} strokeWidth={1.2} className="yearbook-upload-icon" />
          <h2 className="yearbook-upload-title">Double Print (4x6)</h2>
          <p className="yearbook-upload-desc">
            Upload a photo to automatically duplicate<br />
            <span>and layout for 4x6 printing</span>
          </p>
        </>
      )}
    </div>
  );

  return (
    <div className="yearbook-page double-print-page">
      {!photo ? (
        <UploadZone />
      ) : (
        <div className="yearbook-layout-wrapper">
          <aside className="yearbook-sidebar">
            <div className="panel-box">
              <div className="yearbook-sidebar-photos" style={{ marginBottom: '1.5rem' }}>
                <h2 className="panel-title">Source Photo</h2>
                <div className="thumbnail-strip" style={{ maxHeight: '180px' }}>
                  <div className="thumbnail-item active">
                    <img src={photo.displayUrl} alt="Source" />
                    <button className="remove-photo-btn" onClick={handleReset} title="Remove">
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {renderImageSettings()}
              </div>

              <div className="yearbook-sidebar-controls" style={{ flex: 1, maxHeight: 'none', overflowY: 'visible' }}>
                {renderLayoutPanel()}
              </div>
            </div>
          </aside>

          <section className="yearbook-canvas-section print-canvas-section">
            <DoublePrintCanvas
              photo={photo}
              orientation={orientation}
              splitMode={splitMode}
              customNames={customNames}
              customDate={customDate}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              fontSizeScale={fontSizeScale}
              showDashedLine={showDashedLine}
              imageZoom={imageZoom}
              imageOffsetX={imageOffsetX}
              imageOffsetY={imageOffsetY}
              imageMargin={imageMargin}
              textAreaHeight={textAreaHeight}
              textMargin={textMargin}
              onPanChange={handlePanChange}
              onZoomChange={handleZoomChange}
              onCanvasReady={(dataUrl) => { canvasDataRef.current = dataUrl; }}
            />
          </section>

          <aside className="yearbook-sidebar">
            <div className="panel-box">
              <div className="yearbook-sidebar-controls" style={{ flex: 1, maxHeight: 'none', overflowY: 'visible' }}>
                {renderTextPanel()}
                {renderStylePanel()}

                <div className="settings-section" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button className="app-button" onClick={executePrint}>
                    <Printer size={18} /> Print
                  </button>
                  <button
                    className="download-btn"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    style={{ opacity: isDownloading ? 0.7 : 1, width: '100%', margin: 0 }}
                  >
                    <Download size={18} />
                    {isDownloading ? 'Saving…' : 'Download JPG'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* MOBILE BOTTOM BAR */}
      {photo && (
        <>
          <nav className="mobile-bottom-bar yearbook-mobile-bar print-hide">
            <button className={`mobile-tab-btn ${activeMobileTab === 'layout' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'layout' ? null : 'layout')}>
              <LayoutTemplate size={22} /><span>Layout</span>
            </button>
            <button className={`mobile-tab-btn ${activeMobileTab === 'text' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'text' ? null : 'text')}>
              <Type size={22} /><span>Text</span>
            </button>
            <button className={`mobile-tab-btn ${activeMobileTab === 'image' ? 'active' : ''}`} onClick={() => setActiveMobileTab(activeMobileTab === 'image' ? null : 'image')}>
              <ImageIcon size={22} /><span>Image</span>
            </button>
            <button className="mobile-tab-btn" style={{ color: 'var(--accent)' }} onClick={executePrint}>
              <Printer size={22} /><span>Print</span>
            </button>
          </nav>

          <div className={`mobile-bottom-sheet ${activeMobileTab ? 'open' : ''} print-hide`}>
            <div className="sheet-header">
              <h3 className="sheet-title">
                {activeMobileTab === 'layout' && 'Layout settings'}
                {activeMobileTab === 'text' && 'Text & Font'}
                {activeMobileTab === 'image' && 'Image Options'}
              </h3>
              <button className="close-sheet-btn" onClick={() => setActiveMobileTab(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-content">
              {activeMobileTab === 'layout' && renderLayoutPanel()}
              {activeMobileTab === 'text' && (
                <>
                  {renderTextPanel()}
                  {renderStylePanel()}
                </>
              )}
              {activeMobileTab === 'image' && (
                <>
                  {renderImageSettings()}
                  <button className="reset-btn" onClick={() => { handleReset(); setActiveMobileTab(null); }} style={{ width: '100%', marginTop: '1rem' }}>
                    Remove Photo
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
