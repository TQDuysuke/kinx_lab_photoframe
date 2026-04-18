import React, { useState, useCallback, useRef, useEffect } from 'react';
import DualPrintCanvas from '../components/DualPrintCanvas';
import { generateDisplayUrl } from '../utils/imageOptimization';
import {
  Download,
  X,
  Printer,
  ImageIcon,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const FONT_OPTIONS = [
  { id: '1FTV-Blushing-Rose', label: 'Blushing Rose' },
  { id: 'Inter', label: 'Inter' },
  { id: 'Dancing Script', label: 'Dancing Script' },
];

export default function DualPrintPage({ isDarkMode, onBack }) {
  // --- Photos ---
  const [photoA, setPhotoA] = useState(null);
  const [photoB, setPhotoB] = useState(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);

  // --- Layout ---
  const [orientation, setOrientation] = useState(() => localStorage.getItem('du_orientation') || 'landscape');
  const [splitMode, setSplitMode] = useState(() => localStorage.getItem('du_splitMode') || 'vertical');
  const [printerProfile, setPrinterProfile] = useState(
    () => localStorage.getItem('du_printerProfile') || 'cp1000'
  );

  // --- Shared Text ---
  const [customNames, setCustomNames] = useState(
    () => localStorage.getItem('du_customNames') || 'Trung Hiếu & Hồng Hạnh'
  );
  const [customDate, setCustomDate] = useState(
    () => localStorage.getItem('du_customDate') || '12 tháng 04 năm 2026'
  );

  // --- Shared Style ---
  const [fontFamily, setFontFamily] = useState(
    () => localStorage.getItem('du_fontFamily') || '1FTV-Blushing-Rose'
  );
  const [fontWeight, setFontWeight] = useState(
    () => localStorage.getItem('du_fontWeight') || 'normal'
  );
  const [fontSizeScale, setFontSizeScale] = useState(
    () => Number(localStorage.getItem('du_fontSizeScale')) || 100
  );
  const [showDashedLine, setShowDashedLine] = useState(() => {
    const saved = localStorage.getItem('du_showDashedLine');
    return saved !== null ? saved === 'true' : true;
  });

  // --- Shared Frame ---
  const [imageMargin, setImageMargin] = useState(() => {
    const v = localStorage.getItem('du_imageMargin');
    return v !== null ? Number(v) : 3;
  });
  const [textAreaHeight, setTextAreaHeight] = useState(() => {
    const v = localStorage.getItem('du_textAreaHeight');
    return v !== null ? Number(v) : 23;
  });

  // UI state
  const [isFitAExpanded, setIsFitAExpanded] = useState(false);
  const [isFitBExpanded, setIsFitBExpanded] = useState(false);
  const [isPrinterExpanded, setIsPrinterExpanded] = useState(false);
  const [isTypographyExpanded, setIsTypographyExpanded] = useState(false);
  const [textMargin, setTextMargin] = useState(() => {
    const v = localStorage.getItem('du_textMargin');
    return v !== null ? Number(v) : 5;
  });

  // --- Per-photo Image Controls ---
  const [imageZoomA, setImageZoomA] = useState(() => Number(localStorage.getItem('du_imageZoomA')) || 80);
  const [imageOffsetXA, setImageOffsetXA] = useState(() => Number(localStorage.getItem('du_imageOffsetXA')) || 0);
  const [imageOffsetYA, setImageOffsetYA] = useState(() => Number(localStorage.getItem('du_imageOffsetYA')) || 0);
  const [imageZoomB, setImageZoomB] = useState(() => Number(localStorage.getItem('du_imageZoomB')) || 80);
  const [imageOffsetXB, setImageOffsetXB] = useState(() => Number(localStorage.getItem('du_imageOffsetXB')) || 0);
  const [imageOffsetYB, setImageOffsetYB] = useState(() => Number(localStorage.getItem('du_imageOffsetYB')) || 0);

  const [isDownloading, setIsDownloading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState(null);
  const canvasDataRef = useRef(null);

  // --- Persist to localStorage ---
  useEffect(() => {
    localStorage.setItem('du_printerProfile', printerProfile);
    localStorage.setItem('du_customNames', customNames);
    localStorage.setItem('du_customDate', customDate);
    localStorage.setItem('du_fontWeight', fontWeight);
    localStorage.setItem('du_fontSizeScale', fontSizeScale.toString());
    localStorage.setItem('du_showDashedLine', showDashedLine.toString());
    localStorage.setItem('du_imageMargin', imageMargin.toString());
    localStorage.setItem('du_textAreaHeight', textAreaHeight.toString());
    localStorage.setItem('du_textMargin', textMargin.toString());
    localStorage.setItem('du_orientation', orientation);
    localStorage.setItem('du_splitMode', splitMode);
    localStorage.setItem('du_imageZoomA', imageZoomA.toString());
    localStorage.setItem('du_imageOffsetXA', imageOffsetXA.toString());
    localStorage.setItem('du_imageOffsetYA', imageOffsetYA.toString());
    localStorage.setItem('du_imageZoomB', imageZoomB.toString());
    localStorage.setItem('du_imageOffsetXB', imageOffsetXB.toString());
    localStorage.setItem('du_imageOffsetYB', imageOffsetYB.toString());
    if (!fontFamily.startsWith('CustomFont_')) {
      localStorage.setItem('du_fontFamily', fontFamily);
    }
  }, [printerProfile, customNames, customDate, fontFamily, fontWeight, fontSizeScale, showDashedLine, imageMargin, textAreaHeight, textMargin, orientation, splitMode, imageZoomA, imageOffsetXA, imageOffsetYA, imageZoomB, imageOffsetXB, imageOffsetYB]);

  // --- Upload handlers ---
  const handleFileInput = useCallback(async (files, slot) => {
    if (!files || files.length === 0) return;
    const setUploading = slot === 'A' ? setIsUploadingA : setIsUploadingB;
    const setPhoto = slot === 'A' ? setPhotoA : setPhotoB;
    const setZoom = slot === 'A' ? setImageZoomA : setImageZoomB;
    const setOffX = slot === 'A' ? setImageOffsetXA : setImageOffsetXB;
    const setOffY = slot === 'A' ? setImageOffsetYA : setImageOffsetYB;

    setUploading(true);
    try {
      const file = files[0];
      const id = Math.random().toString(36).substr(2, 9);
      let displayUrl = '';
      try {
        displayUrl = await generateDisplayUrl(file, 2000);
      } catch {
        displayUrl = URL.createObjectURL(file);
      }

      const img = new Image();
      img.onload = () => {
        const isLandscape = img.width > img.height;
        setPhoto({ id, file, displayUrl, isLandscape });
        setZoom(80);
        setOffX(0);
        setOffY(0);

        if (slot === 'A') {
          setOrientation(isLandscape ? 'portrait' : 'landscape');
          setSplitMode(isLandscape ? 'horizontal' : 'vertical');
        }
        setUploading(false);
      };
      img.onerror = () => setUploading(false);
      img.src = displayUrl;

    } catch (err) {
      setUploading(false);
    }
  }, []);

  const handleDualFileInput = useCallback((files) => {
    if (!files || files.length === 0) return;
    if (files.length === 1) {
      handleFileInput([files[0]], 'A');
    } else {
      handleFileInput([files[0]], 'A');
      handleFileInput([files[1]], 'B');
    }
  }, [handleFileInput]);

  const handleDropA = useCallback((e) => { e.preventDefault(); handleFileInput(e.dataTransfer.files, 'A'); }, [handleFileInput]);
  const handleDropB = useCallback((e) => { e.preventDefault(); handleFileInput(e.dataTransfer.files, 'B'); }, [handleFileInput]);

  const handlePanChangeA = useCallback((dx, dy) => {
    setImageOffsetXA(prev => Math.min(100, Math.max(-100, prev + dx)));
    setImageOffsetYA(prev => Math.min(100, Math.max(-100, prev + dy)));
  }, []);
  const handlePanChangeB = useCallback((dx, dy) => {
    setImageOffsetXB(prev => Math.min(100, Math.max(-100, prev + dx)));
    setImageOffsetYB(prev => Math.min(100, Math.max(-100, prev + dy)));
  }, []);
  const handleZoomChangeA = useCallback((delta) => {
    setImageZoomA(prev => Math.min(200, Math.max(50, prev + delta)));
  }, []);
  const handleZoomChangeB = useCallback((delta) => {
    setImageZoomB(prev => Math.min(200, Math.max(50, prev + delta)));
  }, []);

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const customFontName = `CustomFont_${Math.random().toString(36).substring(2, 8)}`;
      const newFont = new FontFace(customFontName, `url(${url})`);
      newFont.load().then((loaded) => {
        document.fonts.add(loaded);
        setFontFamily(customFontName);
      }).catch(() => alert('Failed to load custom font file.'));
    }
    e.target.value = null;
  };

  // --- Print ---
  const executePrint = () => {
    if (!canvasDataRef.current) return;
    const isCP1000 = printerProfile === 'cp1000';
    const needsRotation = isCP1000 && orientation === 'portrait';
    const imgData = canvasDataRef.current;

    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Vui lòng cho phép mở Popup để in.'); return; }

    const writeToPrintWindow = (imgSrc, isLandscape) => {
      printWindow.document.write(`
        <html><head><title>SOJI Studio - Dual Print</title>
        <style>
          @page { margin: 0; size: ${isLandscape ? '6in 4in' : '4in 6in'}; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: white; width: 100vw; height: 100vh; overflow: hidden; }
          img { max-width: calc(100% - 0.3in); max-height: calc(100% - 0.3in); object-fit: contain; }
        </style></head>
        <body><img src="${imgSrc}" onload="setTimeout(() => { window.print(); window.close(); }, 200);" /></body></html>
      `);
      printWindow.document.close();
    };

    if (needsRotation) {
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.height;
        offCanvas.height = img.width;
        const ctx = offCanvas.getContext('2d');
        ctx.translate(offCanvas.width / 2, offCanvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        writeToPrintWindow(offCanvas.toDataURL('image/jpeg', 1.0), true);
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
      const a = document.createElement('a');
      a.href = canvasDataRef.current;
      a.download = `dual-print-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloading(false);
    }
  };

  // --- Render helpers ---
  const renderPhotoSlot = (label, photo, isUploading, inputId, onDrop, onFile, onReset) => (
    <div className="yearbook-sidebar-photos" style={{ marginBottom: '1rem' }}>
      <h2 className="panel-title">{label}</h2>
      {photo ? (
        <div className="thumbnail-strip" style={{ maxHeight: '160px' }}>
          <div className="thumbnail-item active">
            <img src={photo.displayUrl} alt={label} />
            <button className="remove-photo-btn" onClick={onReset} title="Remove">
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="yearbook-upload-zone"
          style={{ minHeight: '100px', padding: '1rem' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => document.getElementById(inputId).click()}
        >
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/heic"
            style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files)}
          />
          {isUploading ? (
            <><div className="spinner" /><p style={{ fontSize: '0.8rem' }}>Optimizing…</p></>
          ) : (
            <>
              <ImageIcon size={28} strokeWidth={1.2} className="yearbook-upload-icon" />
              <p className="yearbook-upload-desc" style={{ fontSize: '0.8rem' }}>Drop or click</p>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderImageFit = (label, zoom, setZoom, ox, setOx, oy, setOy, resetFn, isExpanded, setIsExpanded) => (
    <div className="settings-section">
      <h3 className="template-heading" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label} — Fit & Pan</span>
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </h3>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="control-group">
          <label className="control-label">Zoom: {zoom}%</label>
          <input type="range" min="50" max="200" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="slider" />
        </div>
        <div className="control-group" style={{ marginTop: '0.5rem' }}>
          <label className="control-label">Pan X: {ox}%</label>
          <input type="range" min="-100" max="100" value={ox} onChange={(e) => setOx(Number(e.target.value))} className="slider" />
        </div>
        <div className="control-group" style={{ marginTop: '0.5rem' }}>
          <label className="control-label">Pan Y: {oy}%</label>
          <input type="range" min="-100" max="100" value={oy} onChange={(e) => setOy(Number(e.target.value))} className="slider" />
        </div>
        <button className="template-btn" style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }} onClick={resetFn}>
          Reset Pan
        </button>
      </div>
    </div>
  );

  const renderLayoutPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading" onClick={() => setIsPrinterExpanded(!isPrinterExpanded)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Layout & Printer</span>
        {isPrinterExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </h3>
      <div className={`collapsible-content ${isPrinterExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="template-options">
          <button className={`template-btn ${printerProfile === 'cp1000' ? 'active' : ''}`} onClick={() => setPrinterProfile('cp1000')}>Canon CP1000</button>
          <button className={`template-btn ${printerProfile === 'standard' ? 'active' : ''}`} onClick={() => setPrinterProfile('standard')}>Standard (Any)</button>
        </div>
        <h3 className="template-heading" style={{ marginTop: '1rem', cursor: 'default' }}>Orientation</h3>
        <div className="template-options">
          <button className={`template-btn ${orientation === 'portrait' ? 'active' : ''}`} onClick={() => setOrientation('portrait')}>Portrait (4×6)</button>
          <button className={`template-btn ${orientation === 'landscape' ? 'active' : ''}`} onClick={() => setOrientation('landscape')}>Landscape (6×4)</button>
        </div>
        <h3 className="template-heading" style={{ marginTop: '1rem', cursor: 'default' }}>Split Mode</h3>
        <div className="template-options">
          <button className={`template-btn ${splitMode === 'vertical' ? 'active' : ''}`} onClick={() => setSplitMode('vertical')}>Left / Right</button>
          <button className={`template-btn ${splitMode === 'horizontal' ? 'active' : ''}`} onClick={() => setSplitMode('horizontal')}>Top / Bottom</button>
        </div>
        <h3 className="template-heading" style={{ marginTop: '1rem', cursor: 'default' }}>Frame Spacing</h3>
        <div className="control-group">
          <label className="control-label">Image Margin: {imageMargin}%</label>
          <input type="range" min="0" max="15" step="0.5" value={imageMargin} onChange={(e) => setImageMargin(Number(e.target.value))} className="slider" />
        </div>
        <div className="control-group" style={{ marginTop: '0.5rem' }}>
          <label className="control-label">Text Area Height: {textAreaHeight}%</label>
          <input type="range" min="5" max="40" step="0.5" value={textAreaHeight} onChange={(e) => setTextAreaHeight(Number(e.target.value))} className="slider" />
        </div>
        <h3 className="template-heading" style={{ marginTop: '1rem', cursor: 'default' }}>Options</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={showDashedLine} onChange={(e) => setShowDashedLine(e.target.checked)} />
          Show Dashed Cutting Lines
        </label>
      </div>
    </div>
  );

  const renderTextPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading">Content</h3>
      <div className="control-group">
        <label className="control-label">Names / Title</label>
        <input className="yearbook-input" type="text" value={customNames} onChange={(e) => setCustomNames(e.target.value)} />
      </div>
      <div className="control-group" style={{ marginTop: '0.5rem' }}>
        <label className="control-label">Date / Subtitle</label>
        <input className="yearbook-input" type="text" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
      </div>
    </div>
  );

  const renderStylePanel = () => (
    <div className="settings-section">
      <h3 className="template-heading" onClick={() => setIsTypographyExpanded(!isTypographyExpanded)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Typography</span>
        {isTypographyExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </h3>
      <div className={`collapsible-content ${isTypographyExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="yearbook-pill-row">
          {FONT_OPTIONS.map((f) => (
            <button key={f.id} className={`yearbook-pill ${fontFamily === f.id ? 'active' : ''}`}
              onClick={() => setFontFamily(f.id)}>{f.label}</button>
          ))}
        </div>
        <div className="control-group" style={{ marginTop: '1rem' }}>
          <label className="control-label">Font Weight</label>
          <select className="yearbook-input" value={fontWeight} onChange={(e) => setFontWeight(e.target.value)}>
            <option value="300">Light (300)</option>
            <option value="normal">Normal (400)</option>
            <option value="500">Medium (500)</option>
            <option value="600">Semi Bold (600)</option>
            <option value="bold">Bold (700)</option>
          </select>
        </div>
        <div className="control-group" style={{ marginTop: '0.75rem' }}>
          <label className="control-label">Text Scale: {fontSizeScale}%</label>
          <input type="range" min="50" max="200" value={fontSizeScale}
            onChange={(e) => setFontSizeScale(Number(e.target.value))} className="slider" />
        </div>
        <div className="control-group" style={{ marginTop: '1rem' }}>
          <button className="upload-logo-btn" onClick={() => document.getElementById('du-font-upload').click()}>
            Upload Custom Font (.ttf, .otf)
          </button>
          <input id="du-font-upload" type="file" accept=".ttf,.otf,.woff" style={{ display: 'none' }} onChange={handleFontUpload} />
        </div>
      </div>
    </div>
  );

  const hasBothPhotos = photoA && photoB;
  const sameOrientation = hasBothPhotos && (photoA.isLandscape === photoB.isLandscape);
  const showEditor = hasBothPhotos && sameOrientation;

  return (
    <div className="yearbook-page double-print-page">
      {!showEditor ? (
        /* Upload landing zone */
        <div 
          className="yearbook-upload-zone" 
          style={{ flexDirection: 'column', gap: '2rem', cursor: 'pointer', position: 'relative' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleDualFileInput(e.dataTransfer.files); }}
          onClick={(e) => {
            if (e.target.closest('.slot-btn') || e.target.closest('.back-btn')) return;
            document.getElementById('du-file-both').click();
          }}
        >
          {onBack && (
            <button 
              className="app-tab-btn active back-btn" 
              style={{ position: 'absolute', top: '2rem', left: '2rem', gap: '0.5rem', zIndex: 10 }} 
              onClick={(e) => { e.stopPropagation(); onBack(); }}
            >
              <ArrowLeft size={16} /> Layout Menu
            </button>
          )}
          <input 
            id="du-file-both" 
            type="file" 
            accept="image/jpeg,image/png,image/heic"
            multiple
            style={{ display: 'none' }} 
            onChange={(e) => handleDualFileInput(e.target.files)} 
          />
          <Printer size={52} strokeWidth={1.2} className="yearbook-upload-icon" />
          <h2 className="yearbook-upload-title">Dual Print (4×6)</h2>
          <p className="yearbook-upload-desc">Upload two photos to print side by side<br /><span>(Must be both portrait or both landscape)</span></p>

          {hasBothPhotos && !sameOrientation && (
            <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              Hai ảnh phải có cùng tỷ lệ chiều (cùng dọc hoặc cùng ngang) để ghép vừa khung. Vui lòng chọn lại.
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['A', 'B'].map((slot) => {
              const photo = slot === 'A' ? photoA : photoB;
              const isUploading = slot === 'A' ? isUploadingA : isUploadingB;
              return (
                <div key={slot} className="yearbook-upload-zone slot-btn" 
                     style={{ minWidth: '180px', maxWidth: '220px', height: '140px', padding: photo ? '0' : '1.5rem', borderStyle: 'solid', overflow: 'hidden', position: 'relative' }}
                     onClick={() => document.getElementById(`du-file-${slot}`).click()}>
                  <input id={`du-file-${slot}`} type="file" accept="image/jpeg,image/png,image/heic" style={{ display: 'none' }} onChange={(e) => handleFileInput(e.target.files, slot)} />
                  {isUploading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><div className="spinner" /></div>
                  ) : photo ? (
                    <img src={photo.displayUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Photo ${slot}`} />
                  ) : (
                    <>
                      <ImageIcon size={32} strokeWidth={1.2} className="yearbook-upload-icon" />
                      <p className="yearbook-upload-desc">Photo {slot}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="yearbook-layout-wrapper">
          {/* ── LEFT SIDEBAR: Photo A ── */}
          <aside className="yearbook-sidebar">
            <div className="panel-box">
              {onBack && (
                <button className="template-btn" style={{ marginBottom: '1rem', width: '100%', justifyContent: 'center' }} onClick={onBack}>
                  <ArrowLeft size={16} /> Layout Menu
                </button>
              )}
              <div className="yearbook-sidebar-controls" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                {renderPhotoSlot('Photo A', photoA, isUploadingA, 'du-file-A',
                  handleDropA, (files) => handleFileInput(files, 'A'), () => setPhotoA(null))}
                {renderImageFit('Photo A',
                  imageZoomA, setImageZoomA,
                  imageOffsetXA, setImageOffsetXA,
                  imageOffsetYA, setImageOffsetYA,
                  () => { setImageOffsetXA(0); setImageOffsetYA(0); },
                  isFitAExpanded, setIsFitAExpanded)}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  {renderLayoutPanel()}
                </div>
              </div>
            </div>
          </aside>

          {/* ── CANVAS CENTER ── */}
          <section className="yearbook-canvas-section print-canvas-section">
            <DualPrintCanvas
              photoA={photoA}
              photoB={photoB}
              orientation={orientation}
              splitMode={splitMode}
              customNames={customNames}
              customDate={customDate}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              fontSizeScale={fontSizeScale}
              showDashedLine={showDashedLine}
              imageMargin={imageMargin}
              textAreaHeight={textAreaHeight}
              textMargin={textMargin}
              imageZoomA={imageZoomA} imageOffsetXA={imageOffsetXA} imageOffsetYA={imageOffsetYA}
              imageZoomB={imageZoomB} imageOffsetXB={imageOffsetXB} imageOffsetYB={imageOffsetYB}
              onPanChangeA={handlePanChangeA}
              onPanChangeB={handlePanChangeB}
              onZoomChangeA={handleZoomChangeA}
              onZoomChangeB={handleZoomChangeB}
              onCanvasReady={(dataUrl) => { canvasDataRef.current = dataUrl; }}
            />
          </section>

          {/* ── RIGHT SIDEBAR: Photo B + shared controls ── */}
          <aside className="yearbook-sidebar">
            <div className="panel-box">
              <div className="yearbook-sidebar-controls" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                {renderPhotoSlot('Photo B', photoB, isUploadingB, 'du-file-B',
                  handleDropB, (files) => handleFileInput(files, 'B'), () => setPhotoB(null))}
                {renderImageFit('Photo B',
                  imageZoomB, setImageZoomB,
                  imageOffsetXB, setImageOffsetXB,
                  imageOffsetYB, setImageOffsetYB,
                  () => { setImageOffsetXB(0); setImageOffsetYB(0); },
                  isFitBExpanded, setIsFitBExpanded)}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  {renderTextPanel()}
                  {renderStylePanel()}
                  <div className="settings-section" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <button className="app-button" onClick={executePrint}>
                      <Printer size={18} /> Print
                    </button>
                    <button className="download-btn" onClick={handleDownload}
                      disabled={isDownloading}
                      style={{ opacity: isDownloading ? 0.7 : 1, width: '100%', margin: 0 }}>
                      <Download size={18} />
                      {isDownloading ? 'Saving…' : 'Download JPG'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
