import React, { useState, useCallback, useRef, useEffect } from 'react';
import PngFrameCanvas from '../components/PngFrameCanvas';
import { generateDisplayUrl } from '../utils/imageOptimization';
import { Download, X, Printer, ImageIcon, Layers, Upload, Trash2 } from 'lucide-react';
import { saveCustomFrame, getCustomFrames, deleteCustomFrame } from '../utils/indexedDB';

export default function PngFramePage({ isDarkMode }) {
  // Mode
  const [mode, setMode] = useState(
    () => localStorage.getItem('pf_mode') || 'single'
  );

  // Custom Frames
  const [savedFrames, setSavedFrames] = useState([]);
  const [activeFrameId, setActiveFrameId] = useState(
    () => localStorage.getItem('pf_activeFrameId') || 'default'
  );

  useEffect(() => {
    getCustomFrames().then(setSavedFrames).catch(console.error);
  }, []);

  // Photos
  const [photoA, setPhotoA] = useState(null);
  const [photoB, setPhotoB] = useState(null);
  const [isUploadingA, setIsUploadingA] = useState(false);
  const [isUploadingB, setIsUploadingB] = useState(false);

  // Layout
  const [orientation, setOrientation] = useState('portrait');
  const [splitMode, setSplitMode] = useState(() => localStorage.getItem('pf_splitMode') || 'horizontal');
  const [printerProfile, setPrinterProfile] = useState(
    () => localStorage.getItem('pf_printerProfile') || 'cp1000'
  );

  const [showDashedLine, setShowDashedLine] = useState(() => {
    const saved = localStorage.getItem('pf_showDashedLine');
    return saved !== null ? saved === 'true' : true;
  });
  const [imageMargin, setImageMargin] = useState(() => {
    const v = localStorage.getItem('pf_imageMargin');
    return v !== null ? Number(v) : 3;
  });

  const handleFrameChange = useCallback((id, isLandscape) => {
    setActiveFrameId(id);
    if (mode === 'dual') {
      setOrientation(isLandscape ? 'portrait' : 'landscape');
      setSplitMode(isLandscape ? 'horizontal' : 'vertical');
    } else {
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    }
  }, [mode]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    if (newMode === 'single') setPhotoB(null);

    const isLandscape = activeFrameId === 'default' 
      ? true 
      : (savedFrames.find(f => f.id === activeFrameId)?.isLandscape || false);
    
    if (newMode === 'dual') {
      setOrientation(isLandscape ? 'portrait' : 'landscape');
      setSplitMode(isLandscape ? 'horizontal' : 'vertical');
    } else {
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    }
  }, [activeFrameId, savedFrames]);

  // Per-photo controls
  const [imageZoomA, setImageZoomA] = useState(100);
  const [imageOffsetXA, setImageOffsetXA] = useState(0);
  const [imageOffsetYA, setImageOffsetYA] = useState(0);
  const [imageZoomB, setImageZoomB] = useState(100);
  const [imageOffsetXB, setImageOffsetXB] = useState(0);
  const [imageOffsetYB, setImageOffsetYB] = useState(0);

  const [isDownloading, setIsDownloading] = useState(false);
  const canvasDataRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('pf_mode', mode);
    localStorage.setItem('pf_printerProfile', printerProfile);
    localStorage.setItem('pf_activeFrameId', activeFrameId);
    localStorage.setItem('pf_splitMode', splitMode);
    localStorage.setItem('pf_showDashedLine', showDashedLine.toString());
    localStorage.setItem('pf_imageMargin', imageMargin.toString());
  }, [
    mode, printerProfile, activeFrameId, splitMode, 
    showDashedLine, imageMargin
  ]);

  // Upload Custom PNG Frame
  const handleCustomFrameUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objUrl);
      const ratio = img.width / img.height;
      const isLandscape = ratio > 1;
      
      // Aspect ratio validation (allow slight deviation around 1.5 or 0.66)
      if (isLandscape && (ratio < 1.45 || ratio > 1.55)) {
        alert("Ảnh ngang không đúng tỉ lệ chuẩn 6:4. Vui lòng chọn khung ảnh khác.");
        return;
      }
      if (!isLandscape && (ratio < 0.64 || ratio > 0.69)) {
        alert("Ảnh dọc không đúng tỉ lệ chuẩn 4:6. Vui lòng chọn khung ảnh khác.");
        return;
      }

      // Resize up/down to strictly 3600x2400 or 2400x3600 (quality scaling)
      const targetW = isLandscape ? 3600 : 2400;
      const targetH = isLandscape ? 2400 : 3600;
      
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);
      
      // Use PNG to preserve transparency
      const dataUrl = canvas.toDataURL('image/png');
      const id = 'frame_' + Date.now();
      const newFrame = { id, name: file.name, dataUrl, isLandscape, timestamp: Date.now() };
      
      try {
        await saveCustomFrame(newFrame);
        setSavedFrames(prev => [...prev, newFrame]);
        handleFrameChange(id, isLandscape);
      } catch (err) {
        console.error(err);
        alert("Không thể lưu khung. Có thể bộ nhớ Local của trình duyệt đã đầy, vui lòng xoá bớt khung cũ.");
      }
    };
    img.onerror = () => alert("File ảnh không hợp lệ.");
    img.src = objUrl;
    e.target.value = null;
  }, []);

  const handleDeleteFrame = useCallback(async (id, e) => {
    e.stopPropagation();
    try {
      await deleteCustomFrame(id);
      setSavedFrames(prev => prev.filter(f => f.id !== id));
      if (activeFrameId === id) setActiveFrameId('default');
    } catch(err) {
      console.error(err);
    }
  }, [activeFrameId]);

  // Upload handler
  const handleFileInput = useCallback(async (files, slot) => {
    if (!files || files.length === 0) return;
    const setUploading = slot === 'A' ? setIsUploadingA : setIsUploadingB;
    const setPhoto     = slot === 'A' ? setPhotoA : setPhotoB;
    const setZoom      = slot === 'A' ? setImageZoomA : setImageZoomB;
    const setOffX      = slot === 'A' ? setImageOffsetXA : setImageOffsetXB;
    const setOffY      = slot === 'A' ? setImageOffsetYA : setImageOffsetYB;

    setUploading(true);
    try {
      const file = files[0];
      const id   = Math.random().toString(36).substr(2, 9);
      let displayUrl = '';
      try { displayUrl = await generateDisplayUrl(file, 2000); }
      catch { displayUrl = URL.createObjectURL(file); }

      const img = new Image();
      img.onload = () => {
        const isLandscape = img.width > img.height;
        setPhoto({ id, file, displayUrl, isLandscape });
        setZoom(100); setOffX(0); setOffY(0);
        setUploading(false);
      };
      img.onerror = () => setUploading(false);
      img.src = displayUrl;
    } catch { setUploading(false); }
  }, []);

  const handleDualDrop = useCallback((files) => {
    if (!files || files.length === 0) return;
    handleFileInput([files[0]], 'A');
    if (files.length >= 2) handleFileInput([files[1]], 'B');
  }, [handleFileInput]);

  const handlePanChangeA = useCallback((dx, dy) => {
    setImageOffsetXA(p => Math.min(100, Math.max(-100, p + dx)));
    setImageOffsetYA(p => Math.min(100, Math.max(-100, p + dy)));
  }, []);
  const handlePanChangeB = useCallback((dx, dy) => {
    setImageOffsetXB(p => Math.min(100, Math.max(-100, p + dx)));
    setImageOffsetYB(p => Math.min(100, Math.max(-100, p + dy)));
  }, []);
  const handleZoomChangeA = useCallback((d) => setImageZoomA(p => Math.min(200, Math.max(50, p + d))), []);
  const handleZoomChangeB = useCallback((d) => setImageZoomB(p => Math.min(200, Math.max(50, p + d))), []);

  // Print
  const executePrint = () => {
    if (!canvasDataRef.current) return;
    const isCP1000 = printerProfile === 'cp1000';
    const needsRotation = isCP1000 && orientation === 'portrait';
    const imgData = canvasDataRef.current;
    const pw = window.open('', '_blank');
    if (!pw) { alert('Vui lòng cho phép mở Popup để in.'); return; }
    const write = (src, isLS) => {
      pw.document.write(`<html><head><title>SOJI Studio - PNG Frame</title>
        <style>@page{margin:0;size:${isLS ? '6in 4in' : '4in 6in'}}body{margin:0;display:flex;justify-content:center;align-items:center;width:100vw;height:100vh;overflow:hidden}img{max-width:calc(100% - 0.3in);max-height:calc(100% - 0.3in);object-fit:contain}</style>
        </head><body><img src="${src}" onload="setTimeout(()=>{window.print();window.close();},200)"/></body></html>`);
      pw.document.close();
    };
    if (needsRotation) {
      const img = new Image();
      img.onload = () => {
        const oc = document.createElement('canvas');
        oc.width = img.height; oc.height = img.width;
        const ctx = oc.getContext('2d');
        ctx.translate(oc.width / 2, oc.height / 2); ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        write(oc.toDataURL('image/jpeg', 1.0), true);
      };
      img.src = imgData;
    } else {
      write(imgData, orientation === 'landscape' || isCP1000);
    }
  };

  const handleDownload = async () => {
    if (!canvasDataRef.current) return;
    setIsDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = canvasDataRef.current;
      a.download = `png-frame-${Date.now()}.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } finally { setIsDownloading(false); }
  };

  // --- Render helpers ---
  const renderPhotoSlot = (label, photo, isUploading, inputId, onFileChange, onDrop, onReset) => (
    <div className="yearbook-sidebar-photos" style={{ marginBottom: '1rem' }}>
      <h2 className="panel-title">{label}</h2>
      {photo ? (
        <div className="thumbnail-strip" style={{ maxHeight: '160px' }}>
          <div className="thumbnail-item active">
            <img src={photo.displayUrl} alt={label} />
            <button className="remove-photo-btn" onClick={onReset} title="Remove"><X size={14} /></button>
          </div>
        </div>
      ) : (
        <div className="yearbook-upload-zone" style={{ minHeight: '100px', padding: '1rem' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer.files); }}
          onClick={() => document.getElementById(inputId).click()}>
          <input id={inputId} type="file" accept="image/jpeg,image/png,image/heic"
            style={{ display: 'none' }} onChange={(e) => onFileChange(e.target.files)} />
          {isUploading
            ? <><div className="spinner" /><p style={{ fontSize: '0.8rem' }}>Optimizing…</p></>
            : <><ImageIcon size={26} strokeWidth={1.2} className="yearbook-upload-icon" />
                <p className="yearbook-upload-desc" style={{ fontSize: '0.8rem' }}>Drop or click</p></>}
        </div>
      )}
    </div>
  );

  const renderImageFit = (label, zoom, setZoom, ox, setOx, oy, setOy, resetFn) => (
    <div className="settings-section">
      <h3 className="template-heading">{mode === 'dual' ? `${label} — ` : ''}Fit & Pan</h3>
      <div className="control-group">
        <label className="control-label">Zoom: {zoom}%</label>
        <input type="range" min="50" max="200" value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))} className="slider" />
      </div>
      <div className="control-group" style={{ marginTop: '0.5rem' }}>
        <label className="control-label">Pan X: {ox}%</label>
        <input type="range" min="-100" max="100" value={ox}
          onChange={(e) => setOx(Number(e.target.value))} className="slider" />
      </div>
      <div className="control-group" style={{ marginTop: '0.5rem' }}>
        <label className="control-label">Pan Y: {oy}%</label>
        <input type="range" min="-100" max="100" value={oy}
          onChange={(e) => setOy(Number(e.target.value))} className="slider" />
      </div>
      <button className="template-btn"
        style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}
        onClick={resetFn}>Reset Pan</button>
    </div>
  );

  const renderLayoutPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading">Target Printer</h3>
      <div className="template-options">
        <button className={`template-btn ${printerProfile === 'cp1000' ? 'active' : ''}`}
          onClick={() => setPrinterProfile('cp1000')}>Canon CP1000</button>
        <button className={`template-btn ${printerProfile === 'standard' ? 'active' : ''}`}
          onClick={() => setPrinterProfile('standard')}>Standard (Any)</button>
      </div>
      <h3 className="template-heading" style={{ marginTop: '1rem' }}>Orientation</h3>
      <div className="template-options">
        <button className={`template-btn ${orientation === 'portrait' ? 'active' : ''}`}
          onClick={() => setOrientation('portrait')}>Portrait (4×6)</button>
        <button className={`template-btn ${orientation === 'landscape' ? 'active' : ''}`}
          onClick={() => setOrientation('landscape')}>Landscape (6×4)</button>
      </div>

      {mode === 'dual' && (
        <>
          <h3 className="template-heading" style={{ marginTop: '1rem' }}>Split Mode</h3>
          <div className="template-options">
            <button className={`template-btn ${splitMode === 'vertical' ? 'active' : ''}`}
              onClick={() => setSplitMode('vertical')}>Left / Right</button>
            <button className={`template-btn ${splitMode === 'horizontal' ? 'active' : ''}`}
              onClick={() => setSplitMode('horizontal')}>Top / Bottom</button>
          </div>
          <h3 className="template-heading" style={{ marginTop: '1rem' }}>Frame Setup</h3>
          <div className="control-group">
            <label className="control-label">Image Margin: {imageMargin}%</label>
            <input type="range" min="0" max="15" step="0.5" value={imageMargin} onChange={(e) => setImageMargin(Number(e.target.value))} className="slider" />
          </div>
          <h3 className="template-heading" style={{ marginTop: '1rem' }}>Options</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            <input type="checkbox" checked={showDashedLine} onChange={(e) => setShowDashedLine(e.target.checked)} />
            Show Dashed Cutting Line
          </label>
        </>
      )}
    </div>
  );

  const renderFrameSelection = () => (
    <div className="settings-section" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      <h3 className="template-heading">Frame Overlay</h3>
      <div className="thumbnail-strip" style={{ display: 'flex', flexDirection: 'row', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.2rem', marginTop: '0.5rem' }}>
        
        {/* Default Frame */}
        <div 
          className={`thumbnail-item ${activeFrameId === 'default' ? 'active' : ''}`}
          style={{ width: '90px', height: '60px', flexShrink: 0, cursor: 'pointer', border: activeFrameId === 'default' ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}
          onClick={() => handleFrameChange('default', true)}
        >
          <div style={{ width: '100%', height: '100%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'center', lineHeight: '1.2' }}>Default<br/>FPT</span>
          </div>
        </div>

        {/* Custom Frames */}
        {savedFrames.map(f => (
          <div 
            key={f.id}
            className={`thumbnail-item ${activeFrameId === f.id ? 'active' : ''}`}
            style={{ width: f.isLandscape ? '90px' : '60px', height: f.isLandscape ? '60px' : '90px', flexShrink: 0, cursor: 'pointer', position: 'relative', border: activeFrameId === f.id ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '6px', backgroundColor: '#fdf2f8', display: 'flex', alignItems: 'center' }}
            onClick={() => handleFrameChange(f.id, f.isLandscape)}
          >
            <img src={f.dataUrl} alt={f.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', margin: 'auto' }} />
            <button className="remove-photo-btn" onClick={(e) => handleDeleteFrame(f.id, e)} title="Delete" style={{ width: '18px', height: '18px', top: '-6px', right: '-6px' }}><Trash2 size={10} /></button>
          </div>
        ))}
        
        {/* Upload Button */}
        <button 
          className="template-btn"
          style={{ width: '60px', height: '90px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', margin: '0' }}
          onClick={() => document.getElementById('pf-custom-frame-upload').click()}
        >
          <Upload size={16} color="#64748b" />
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Upload</span>
        </button>
        <input id="pf-custom-frame-upload" type="file" accept="image/png" style={{ display: 'none' }} onChange={handleCustomFrameUpload} />
      </div>
    </div>
  );

  const renderPrintPanel = () => (
    <div className="settings-section" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
      <button className="app-button" onClick={executePrint}><Printer size={18} /> Print</button>
      <button className="download-btn" onClick={handleDownload} disabled={isDownloading}
        style={{ opacity: isDownloading ? 0.7 : 1, width: '100%', margin: 0 }}>
        <Download size={18} />{isDownloading ? 'Saving…' : 'Download JPG'}
      </button>
    </div>
  );

  // Determine if we're ready to show the editor
  const singleReady = mode === 'single' && photoA;
  const dualReady   = mode === 'dual' && photoA && photoB;
  const showEditor  = singleReady || dualReady;

  const activeFrameSrc = activeFrameId === 'default' 
    ? '/Frame-FPT.png' 
    : savedFrames.find(f => f.id === activeFrameId)?.dataUrl || '/Frame-FPT.png';

  return (
    <div className="yearbook-page double-print-page">
      {!showEditor ? (
        /* ── Upload / mode selection ── */
        <div className="yearbook-upload-zone"
          style={{ flexDirection: 'column', gap: '1.75rem' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.target.closest('.slot-btn')) return;
            if (mode === 'single') handleFileInput(e.dataTransfer.files, 'A');
            else handleDualDrop(e.dataTransfer.files);
          }}
          onClick={(e) => {
            if (e.target.closest('.slot-btn') || e.target.closest('.mode-btn')) return;
            if (mode === 'single') document.getElementById('pf-file-A').click();
            else document.getElementById('pf-file-both').click();
          }}>

          {/* Hidden multi-input for dual drop */}
          <input id="pf-file-both" type="file" accept="image/jpeg,image/png,image/heic" multiple
            style={{ display: 'none' }} onChange={(e) => handleDualDrop(e.target.files)} />

          <Layers size={48} strokeWidth={1.2} className="yearbook-upload-icon" />
          <h2 className="yearbook-upload-title">PNG Frame (4×6)</h2>
          <p className="yearbook-upload-desc">Overlay Frame-FPT on your photo(s)<br /><span>for a stylized 4×6 print</span></p>

          {/* Mode selector */}
          <div className="template-options mode-btn" onClick={(e) => e.stopPropagation()}>
            <button className={`template-btn ${mode === 'single' ? 'active' : ''}`}
              onClick={() => handleModeChange('single')}>
              Single Photo
            </button>
            <button className={`template-btn ${mode === 'dual' ? 'active' : ''}`}
              onClick={() => handleModeChange('dual')}>
              Dual Photos
            </button>
          </div>

          {/* Drop slots */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {(mode === 'single' ? ['A'] : ['A', 'B']).map((slot) => {
              const photo = slot === 'A' ? photoA : photoB;
              const isUploading = slot === 'A' ? isUploadingA : isUploadingB;
              return (
                <div key={slot} className="yearbook-upload-zone slot-btn"
                  style={{ minWidth: '180px', maxWidth: '220px', height: '140px', padding: photo ? '0' : '1.5rem', borderStyle: 'solid', overflow: 'hidden', position: 'relative' }}
                  onClick={() => document.getElementById(`pf-file-${slot}`).click()}>
                  <input id={`pf-file-${slot}`} type="file" accept="image/jpeg,image/png,image/heic"
                    style={{ display: 'none' }} onChange={(e) => handleFileInput(e.target.files, slot)} />
                  {isUploading
                    ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><div className="spinner" /></div>
                    : photo
                      ? <img src={photo.displayUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Photo ${slot}`} />
                      : <><ImageIcon size={30} strokeWidth={1.2} className="yearbook-upload-icon" />
                          <p className="yearbook-upload-desc">{mode === 'single' ? 'Photo' : `Photo ${slot}`}</p></>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Editor: 3-column layout ── */
        <div className="yearbook-layout-wrapper">
          {/* LEFT sidebar */}
          <aside className="yearbook-sidebar">
            <div className="panel-box">
              <div className="yearbook-sidebar-controls" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                {renderPhotoSlot(
                  mode === 'dual' ? 'Photo A' : 'Photo',
                  photoA, isUploadingA, 'pf-file-A',
                  (files) => handleFileInput(files, 'A'),
                  (files) => handleFileInput([files[0]], 'A'),
                  () => setPhotoA(null)
                )}
                {renderImageFit('Photo A',
                  imageZoomA, setImageZoomA,
                  imageOffsetXA, setImageOffsetXA,
                  imageOffsetYA, setImageOffsetYA,
                  () => { setImageOffsetXA(0); setImageOffsetYA(0); }
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  {renderFrameSelection()}
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER canvas */}
          <section className="yearbook-canvas-section print-canvas-section">
            <PngFrameCanvas
              mode={mode}
              frameSrc={activeFrameSrc}
              photoA={photoA}
              photoB={photoB}
              orientation={orientation}
              splitMode={splitMode}
              showDashedLine={showDashedLine}
              imageMargin={imageMargin}
              imageZoomA={imageZoomA} imageOffsetXA={imageOffsetXA} imageOffsetYA={imageOffsetYA}
              imageZoomB={imageZoomB} imageOffsetXB={imageOffsetXB} imageOffsetYB={imageOffsetYB}
              onPanChangeA={handlePanChangeA}
              onPanChangeB={handlePanChangeB}
              onZoomChangeA={handleZoomChangeA}
              onZoomChangeB={handleZoomChangeB}
              onCanvasReady={(dataUrl) => { canvasDataRef.current = dataUrl; }}
            />
          </section>

          {/* RIGHT sidebar */}
          <aside className="yearbook-sidebar">
            <div className="panel-box">
              <div className="yearbook-sidebar-controls" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                
                {mode === 'dual' && (
                  <>
                    {renderPhotoSlot(
                      'Photo B', photoB, isUploadingB, 'pf-file-B',
                      (files) => handleFileInput(files, 'B'),
                      (files) => handleFileInput([files[0]], 'B'),
                      () => setPhotoB(null)
                    )}
                    {renderImageFit('Photo B',
                      imageZoomB, setImageZoomB,
                      imageOffsetXB, setImageOffsetXB,
                      imageOffsetYB, setImageOffsetYB,
                      () => { setImageOffsetXB(0); setImageOffsetYB(0); }
                    )}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', marginBottom: '1rem' }}></div>
                  </>
                )}

                {renderLayoutPanel()}
                
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div className="settings-section">
                    <h3 className="template-heading">Mode</h3>
                    <div className="template-options">
                      <button className={`template-btn ${mode === 'single' ? 'active' : ''}`}
                        onClick={() => handleModeChange('single')}>Single</button>
                      <button className={`template-btn ${mode === 'dual' ? 'active' : ''}`}
                        onClick={() => handleModeChange('dual')}>Dual</button>
                    </div>
                  </div>

                  {renderPrintPanel()}
                </div>

              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
