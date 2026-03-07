import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

export default function Upload({ onUpload }) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === 'image/jpeg' || file.type === 'image/heic' || file.type === 'image/png'
      );
      if (files.length > 5) {
        alert("Please upload a maximum of 5 photos at a time.");
        onUpload(files.slice(0, 5));
      } else if (files.length > 0) {
        onUpload(files);
      }
    },
    [onUpload]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      alert("Please upload a maximum of 5 photos at a time.");
      onUpload(files.slice(0, 5));
    } else if (files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div
      className="upload-container"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => document.getElementById('file-upload').click()}
    >
      <input
        id="file-upload"
        type="file"
        accept="image/jpeg, image/png, image/heic"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="upload-content">
        <UploadCloud size={48} className="upload-icon" />
        <p className="upload-text">Drag & drop your photos here</p>
        <p className="upload-subtext">or click to browse from your device</p>
        <p className="upload-hint">Supports JPG, PNG, HEIC (Max 5 photos)</p>
      </div>
    </div>
  );
}
