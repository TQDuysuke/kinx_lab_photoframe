import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

export default function Upload({ onUpload }) {
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith('image/') || file.name.match(/\.(heic|jpg|jpeg|png)$/i))) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
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
        accept="image/jpeg, image/png, image/heic, .heic"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="upload-content">
        <UploadCloud size={48} className="upload-icon" />
        <p className="upload-text">Drag and drop your photo here</p>
        <p className="upload-subtext">or click to browse</p>
        <p className="upload-hint">Supports JPG, PNG, HEIC</p>
      </div>
    </div>
  );
}
