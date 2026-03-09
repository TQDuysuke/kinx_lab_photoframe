import React, { useState, useCallback, useRef } from 'react';
import YearbookCanvas from '../components/YearbookCanvas';
import { yearbookLayouts } from '../templates/yearbookLayouts';
import { generateDisplayUrl } from '../utils/imageOptimization';
import {
  Upload as UploadIcon,
  Download,
  X,
  LayoutTemplate,
  Type,
  Palette,
  BookOpen,
  Image as ImageIcon,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const COLOR_THEMES = [
  { id: 'dark',    label: 'Dark',    preview: '#0e1412' },
  { id: 'light',   label: 'Light',   preview: '#f5f0e8' },
  { id: 'vintage', label: 'Vintage', preview: '#2a2018' },
];

const FONT_STYLES = [
  { id: 'script', label: 'Script ✍️' },
  { id: 'bold',   label: 'Serif 📖' },
  { id: 'clean',  label: 'Modern ✦' },
];

export default function YearbookPage({ isDarkMode }) {
  const [photos,       setPhotos]       = useState([]);
  const [isUploading,  setIsUploading]  = useState(false);
  const [layout,       setLayout]       = useState(yearbookLayouts[0]);
  const [className,    setClassName]    = useState('12A12');
  const [quote,        setQuote]        = useState('Summer Memories');
  const [yearLabel,    setYearLabel]    = useState('2024 - 2025');
  const [fontStyle,    setFontStyle]    = useState('script');
  const [colorTheme,   setColorTheme]   = useState('dark');
  const [isDownloading,setIsDownloading]= useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState(null);

  const canvasDataRef  = useRef(null); // latest canvas dataUrl

  // ── Upload handler ───────────────────────────────────────────────────
  const handleFilesInput = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const newPhotos = await Promise.all(
        Array.from(files).map(async (file) => {
          const id = Math.random().toString(36).substr(2, 9);
          let displayUrl = '';
          try {
            displayUrl = await generateDisplayUrl(file, 1600);
          } catch {
            displayUrl = URL.createObjectURL(file);
          }
          return { id, file, displayUrl };
        })
      );
      setPhotos((prev) => {
        const combined = [...prev, ...newPhotos];
        if (combined.length > 10) {
          const discarded = combined.slice(10);
          discarded.forEach((p) => p.displayUrl && URL.revokeObjectURL(p.displayUrl));
          return combined.slice(0, 10);
        }
        return combined;
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFilesInput(files);
  }, [handleFilesInput]);

  const handleRemovePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleMovePhoto = (id, direction) => {
    setPhotos(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;

      const newPhotos = [...prev];
      [newPhotos[idx], newPhotos[newIdx]] = [newPhotos[newIdx], newPhotos[idx]];
      return newPhotos;
    });
  };

  const handleReset = () => {
    photos.forEach((p) => p.displayUrl && URL.revokeObjectURL(p.displayUrl));
    setPhotos([]);
  };

  // ── Download ─────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!canvasDataRef.current) return;
    setIsDownloading(true);
    try {
      const isIOS = ['iPad Simulator','iPhone Simulator','iPod Simulator','iPad','iPhone','iPod']
        .includes(navigator.platform)
        || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

      const dataUrl = canvasDataRef.current;
      const fileName = `yearbook-${className || 'photo'}.jpg`;

      if (isIOS && navigator.share && navigator.canShare) {
        try {
          const res  = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Yearbook Photo' });
            return;
          }
        } catch {}
      }
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

  // ── Sidebar panel renderers ───────────────────────────────────────────
  const renderLayoutPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading">Select Layout</h3>
      <div className="yearbook-layout-grid">
        {yearbookLayouts.map((l) => (
          <button
            key={l.name}
            className={`yearbook-layout-card ${layout.name === l.name ? 'active' : ''}`}
            onClick={() => setLayout(l)}
          >
            <LayoutIcon name={l.name} />
            <span className="yearbook-layout-label">{l.label}</span>
            <span className="yearbook-layout-desc">{l.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTextPanel = () => (
    <div className="settings-section">
      <h3 className="template-heading">Content</h3>
      <div className="control-group">
        <label className="control-label">Class / Title</label>
        <input
          className="yearbook-input"
          type="text"
          value={className}
          maxLength={20}
          placeholder="e.g. 12A12"
          onChange={(e) => setClassName(e.target.value)}
        />
      </div>
      <div className="control-group">
        <label className="control-label">Quote / Memory</label>
        <textarea
          className="yearbook-input yearbook-textarea"
          value={quote}
          maxLength={60}
          rows={2}
          placeholder="e.g. Summer Memories..."
          onChange={(e) => setQuote(e.target.value)}
        />
      </div>
      <div className="control-group">
        <label className="control-label">Academic Year</label>
        <input
          className="yearbook-input"
          type="text"
          value={yearLabel}
          maxLength={20}
          placeholder="e.g. 2024 - 2025"
          onChange={(e) => setYearLabel(e.target.value)}
        />
      </div>
    </div>
  );

  const renderStylePanel = () => (
    <>
      <div className="settings-section">
        <h3 className="template-heading">Font Style</h3>
        <div className="yearbook-pill-row">
          {FONT_STYLES.map((f) => (
            <button
              key={f.id}
              className={`yearbook-pill ${fontStyle === f.id ? 'active' : ''}`}
              onClick={() => setFontStyle(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <h3 className="template-heading">Background Color</h3>
        <div className="yearbook-pill-row">
          {COLOR_THEMES.map((c) => (
            <button
              key={c.id}
              className={`yearbook-color-btn ${colorTheme === c.id ? 'active' : ''}`}
              style={{ '--theme-color': c.preview }}
              onClick={() => setColorTheme(c.id)}
            >
              <span className="yearbook-color-dot" style={{ background: c.preview }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  // ── Empty state upload zone ───────────────────────────────────────────
  const UploadZone = () => (
    <div
      className="yearbook-upload-zone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => document.getElementById('yearbook-file-input').click()}
    >
      <input
        id="yearbook-file-input"
        type="file"
        accept="image/jpeg,image/png,image/heic"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFilesInput(e.target.files)}
      />
      {isUploading ? (
        <>
          <div className="spinner" />
          <p>Optimizing images...</p>
        </>
      ) : (
        <>
          <BookOpen size={52} strokeWidth={1.2} className="yearbook-upload-icon" />
          <h2 className="yearbook-upload-title">Create Yearbook</h2>
          <p className="yearbook-upload-desc">
            Drag & drop or click to select photos<br />
            <span>Max 10 photos · JPG / PNG / HEIC</span>
          </p>
        </>
      )}
    </div>
  );

  const hasPhotos = photos.length > 0;

  return (
    <div className="yearbook-page">
      {!hasPhotos ? (
        <UploadZone />
      ) : (
        <div className="yearbook-layout-wrapper">

          {/* ── LEFT SIDEBAR (desktop) ─────────────────────────────── */}
          <aside className="yearbook-sidebar">
            <div className="panel-box">
              <div className="yearbook-sidebar-photos">
                <h2 className="panel-title">Photos ({photos.length}/10)</h2>
                <div className="yearbook-thumb-grid">
                  {photos.map((p) => (
                    <div key={p.id} className="yearbook-thumb-item">
                      <img src={p.displayUrl} alt="" />
                      <div className="yearbook-thumb-overlay">
                        <button
                          className="yearbook-thumb-btn move-btn"
                          onClick={() => handleMovePhoto(p.id, -1)}
                          disabled={photos.indexOf(p) === 0}
                          title="Move forward"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          className="yearbook-thumb-btn move-btn"
                          onClick={() => handleMovePhoto(p.id, 1)}
                          disabled={photos.indexOf(p) === photos.length - 1}
                          title="Move backward"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button
                          className="yearbook-thumb-btn remove-btn"
                          onClick={() => handleRemovePhoto(p.id)}
                          title="Remove photo"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="actions-group" style={{ marginTop: '0.75rem' }}>
                  <button
                    className="new-photo-btn"
                    onClick={() => document.getElementById('yearbook-add-input').click()}
                  >
                    <UploadIcon size={14} /> Add Photos
                  </button>
                  <input
                    id="yearbook-add-input"
                    type="file"
                    accept="image/jpeg,image/png,image/heic"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => { handleFilesInput(e.target.files); e.target.value = null; }}
                  />
                  <button className="reset-btn" onClick={handleReset}>
                    <Trash2 size={14} /> Reset all
                  </button>
                </div>
              </div>

              <div className="yearbook-sidebar-controls">
                {renderLayoutPanel()}
                {renderTextPanel()}
                {renderStylePanel()}

                <div className="settings-section" style={{ marginTop: '1.5rem' }}>
                  <button
                    className="download-btn"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    style={{ opacity: isDownloading ? 0.7 : 1 }}
                  >
                    <Download size={20} />
                    {isDownloading ? 'Generating…' : 'Download Yearbook'}
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── CANVAS PREVIEW ─────────────────────────────────────── */}
          <section className="yearbook-canvas-section">
            <YearbookCanvas
              photos={photos}
              layout={layout}
              className={className}
              quote={quote}
              yearLabel={yearLabel}
              fontStyle={fontStyle}
              colorTheme={colorTheme}
              onCanvasReady={(dataUrl) => { canvasDataRef.current = dataUrl; }}
            />
          </section>

        </div>
      )}

      {/* ── MOBILE BOTTOM BAR (when has photos) ───────────────────────── */}
      {hasPhotos && (
        <>
          <nav className="mobile-bottom-bar yearbook-mobile-bar">
            <button
              className={`mobile-tab-btn ${activeMobileTab === 'layout' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab(activeMobileTab === 'layout' ? null : 'layout')}
            >
              <LayoutTemplate size={22} /><span>Layout</span>
            </button>
            <button
              className={`mobile-tab-btn ${activeMobileTab === 'text' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab(activeMobileTab === 'text' ? null : 'text')}
            >
              <Type size={22} /><span>Content</span>
            </button>
            <button
              className={`mobile-tab-btn ${activeMobileTab === 'style' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab(activeMobileTab === 'style' ? null : 'style')}
            >
              <Palette size={22} /><span>Style</span>
            </button>
            <button
              className={`mobile-tab-btn ${activeMobileTab === 'photos' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab(activeMobileTab === 'photos' ? null : 'photos')}
            >
              <ImageIcon size={22} /><span>Photos</span>
            </button>
            <button
              className="mobile-tab-btn"
              style={{ color: 'var(--accent)' }}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download size={22} /><span>{isDownloading ? 'Wait' : 'Save'}</span>
            </button>
          </nav>

          {/* Mobile bottom sheet */}
          <div className={`mobile-bottom-sheet ${activeMobileTab ? 'open' : ''}`}>
            <div className="sheet-header">
              <h3 className="sheet-title">
                {activeMobileTab === 'layout' && 'Select Layout'}
                {activeMobileTab === 'text'   && 'Content'}
                {activeMobileTab === 'style'  && 'Font & Color'}
                {activeMobileTab === 'photos' && `Photos (${photos.length}/10)`}
              </h3>
              <button className="close-sheet-btn" onClick={() => setActiveMobileTab(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="sheet-content">
              {activeMobileTab === 'layout' && renderLayoutPanel()}
              {activeMobileTab === 'text'   && renderTextPanel()}
              {activeMobileTab === 'style'  && renderStylePanel()}
              {activeMobileTab === 'photos' && (
                <div className="settings-section">
                  <div className="yearbook-thumb-grid">
                    {photos.map((p) => (
                      <div key={p.id} className="yearbook-thumb-item">
                        <img src={p.displayUrl} alt="" />
                        <div className="yearbook-thumb-overlay visible">
                          <button
                            className="yearbook-thumb-btn move-btn"
                            onClick={() => handleMovePhoto(p.id, -1)}
                            disabled={photos.indexOf(p) === 0}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            className="yearbook-thumb-btn move-btn"
                            onClick={() => handleMovePhoto(p.id, 1)}
                            disabled={photos.indexOf(p) === photos.length - 1}
                          >
                            <ChevronRight size={16} />
                          </button>
                          <button
                            className="yearbook-thumb-btn remove-btn"
                            onClick={() => handleRemovePhoto(p.id)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="actions-group" style={{ marginTop: '1rem' }}>
                    <button
                      className="new-photo-btn"
                      onClick={() => document.getElementById('yearbook-add-input-mobile').click()}
                    >
                      <UploadIcon size={14} /> Add Photos
                    </button>
                    <input
                      id="yearbook-add-input-mobile"
                      type="file"
                      accept="image/jpeg,image/png,image/heic"
                      multiple
                      style={{ display: 'none' }}
                      onChange={(e) => { handleFilesInput(e.target.files); e.target.value = null; }}
                    />
                    <button className="reset-btn" onClick={() => { handleReset(); setActiveMobileTab(null); }}>
                      Reset all
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Small inline layout preview icons ─────────────────────────────────────
function LayoutIcon({ name }) {
  if (name === 'classic_grid') {
    return (
      <svg className="yearbook-layout-icon" viewBox="0 0 40 52" fill="none">
        <rect x="1" y="1" width="21" height="18" rx="2" fill="currentColor" opacity=".8"/>
        <rect x="24" y="1" width="15" height="8" rx="2" fill="currentColor" opacity=".6"/>
        <rect x="24" y="11" width="15" height="8" rx="2" fill="currentColor" opacity=".6"/>
        <rect x="1" y="22" width="38" height="28" rx="2" fill="currentColor" opacity=".5"/>
      </svg>
    );
  }
  if (name === 'scatter') {
    return (
      <svg className="yearbook-layout-icon" viewBox="0 0 40 52" fill="none">
        <rect x="3" y="3" width="22" height="28" rx="2" fill="currentColor" opacity=".5" transform="rotate(-5 14 17)"/>
        <rect x="12" y="8" width="22" height="28" rx="2" fill="currentColor" opacity=".7" transform="rotate(4 23 22)"/>
        <rect x="5" y="22" width="20" height="26" rx="2" fill="currentColor" opacity=".6" transform="rotate(-3 15 35)"/>
      </svg>
    );
  }
  // minimal_duo
  return (
    <svg className="yearbook-layout-icon" viewBox="0 0 40 52" fill="none">
      <rect x="1" y="1" width="18" height="32" rx="2" fill="currentColor" opacity=".8"/>
      <rect x="21" y="1" width="18" height="32" rx="2" fill="currentColor" opacity=".6"/>
      <rect x="1" y="36" width="38" height="5" rx="1" fill="currentColor" opacity=".4"/>
      <rect x="1" y="43" width="24" height="4" rx="1" fill="currentColor" opacity=".3"/>
    </svg>
  );
}
