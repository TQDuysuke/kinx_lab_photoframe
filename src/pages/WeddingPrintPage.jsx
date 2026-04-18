import React, { useState } from 'react';
import { Layers, Printer, LayoutTemplate, GalleryHorizontalEnd } from 'lucide-react';
import DoublePrintPage from './DoublePrintPage';
import FourthPrintPage from './FourthPrintPage';
import DualPrintPage from './DualPrintPage';
import WeddingFramePage from './WeddingFramePage';

export default function WeddingPrintPage({ isDarkMode }) {
  const [printMode, setPrintMode] = useState(() => localStorage.getItem('wedding_print_mode') || null);

  const handleSelectMode = (mode) => {
    setPrintMode(mode);
    localStorage.setItem('wedding_print_mode', mode);
  };

  const handleBack = () => {
    setPrintMode(null);
    localStorage.removeItem('wedding_print_mode');
  };

  if (printMode === 'double') return <DoublePrintPage isDarkMode={isDarkMode} onBack={handleBack} />;
  if (printMode === 'fourth') return <FourthPrintPage isDarkMode={isDarkMode} onBack={handleBack} />;
  if (printMode === 'dual') return <DualPrintPage isDarkMode={isDarkMode} onBack={handleBack} />;
  if (printMode === 'wedding') return <WeddingFramePage isDarkMode={isDarkMode} onBack={handleBack} />;

  return (
    <div className="yearbook-page wedding-print-selector-page">
      <div className="yearbook-upload-zone" style={{ flexDirection: 'column', padding: '3rem 2rem', gap: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
        <Layers size={52} strokeWidth={1.2} className="yearbook-upload-icon" />
        <h2 className="yearbook-upload-title">Wedding Print Suite</h2>
        <p className="yearbook-upload-desc">Select a specialized layout mode to begin</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', width: '100%', marginTop: '1rem' }}>
          
          <div className="template-btn" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', height: '100%', cursor: 'pointer', whiteSpace: 'normal', borderRadius: '16px' }} onClick={() => handleSelectMode('wedding')}>
            <GalleryHorizontalEnd size={36} color="var(--accent)" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 600 }}>Wedding Frame</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Premium 4×6 frame with custom borders and elegant typography.</p>
            </div>
          </div>

          <div className="template-btn" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', height: '100%', cursor: 'pointer', whiteSpace: 'normal', borderRadius: '16px' }} onClick={() => handleSelectMode('dual')}>
            <LayoutTemplate size={36} color="var(--accent)" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 600 }}>Dual Print</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Layout two distinct photos side-by-side or top-and-bottom.</p>
            </div>
          </div>

          <div className="template-btn" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', height: '100%', cursor: 'pointer', whiteSpace: 'normal', borderRadius: '16px' }} onClick={() => handleSelectMode('double')}>
            <Printer size={36} color="var(--accent)" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 600 }}>Double Print</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Automatically duplicate one photo to print it twice on 4×6.</p>
            </div>
          </div>

          <div className="template-btn" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', height: '100%', cursor: 'pointer', whiteSpace: 'normal', borderRadius: '16px' }} onClick={() => handleSelectMode('fourth')}>
            <Printer size={36} color="var(--accent)" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', fontWeight: 600 }}>Fourth Print</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Print two different photos twice (2×2 grid) onto one 4×6 sheet.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
