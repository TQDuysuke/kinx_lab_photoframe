import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { 
  formatAperture, 
  formatFocalLength, 
  formatISO, 
  formatCameraModel, 
  formatDateTime, 
  formatGPS,
  formatExposureTime,
  formatExposureBias,
  formatLensModel
} from '../utils/formatMetadata';
import piexif from 'piexifjs';

export default function FrameCanvas({ imageSrc, metadata, template, fontSizeScale = 143, customLogo, originalFile }) {
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!imageSrc || !metadata || !template) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scaleFont = fontSizeScale / 100;
      
      const prepareCanvas = (logoImg) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        const scale = imgWidth / 2000;
        
        const bottomHeight = (template.bottomPanelHeight || 140) * scale;
        
        canvas.width = imgWidth;
        canvas.height = imgHeight + bottomHeight;

        // Draw original image
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        // Draw bottom panel background
        ctx.fillStyle = template.backgroundColor || '#ffffff';
        ctx.fillRect(0, imgHeight, imgWidth, bottomHeight);
        
        const padding = (template.layout.padding || 20) * scale;
        const iconSize = (template.layout.iconSize || 60) * scale * scaleFont;
        
        const camModelFont = `${template.layout.cameraModelFontWeight} ${template.layout.cameraModelFontSize * scale * scaleFont}px ${template.font}`;
        const metaFont = `${template.layout.metadataFontWeight} ${template.layout.metadataFontSize * scale * scaleFont}px ${template.font}`;
        
        const textColorPrimary = template.layout.textColorPrimary || "#000000";
        const textColorSecondary = template.layout.textColorSecondary || "#666666";

        const centerY = imgHeight + (bottomHeight / 2);

        // Draw Logo (Center)
        if (logoImg) {
          const logoAspectRatio = logoImg.width / logoImg.height;
          // Scale up 200% if it's not the Apple logo
          const isAppleLogo = customLogo && customLogo.includes('Apple_logo');
          const logoScaleMultiplier = isAppleLogo ? 1 : 2;
          
          let drawWidth = iconSize * logoScaleMultiplier;
          let drawHeight = iconSize * logoScaleMultiplier;
          
          if (logoAspectRatio > 1) {
            drawHeight = (iconSize * logoScaleMultiplier) / logoAspectRatio;
          } else {
            drawWidth = (iconSize * logoScaleMultiplier) * logoAspectRatio;
          }
          
          ctx.drawImage(logoImg, (imgWidth / 2) - (drawWidth / 2), centerY - (drawHeight / 2), drawWidth, drawHeight);
        } else {
          // Default abstract lens icon
          ctx.fillStyle = textColorSecondary;
          ctx.beginPath();
          ctx.arc(imgWidth / 2, centerY, iconSize/2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = template.backgroundColor;
          ctx.beginPath();
          ctx.arc(imgWidth / 2, centerY, iconSize/3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = textColorSecondary;
          ctx.beginPath();
          ctx.arc(imgWidth / 2, centerY, iconSize/6, 0, Math.PI * 2);
          ctx.fill();
        }

        // TEXT LAYOUT LOGIC
        // Left Side: 
        // 1. Camera Make & Model
        // 2. Lens Model (Optional)
        // 3. Date
        const leftTextX = padding * 2;
        const rightTextX = imgWidth - (padding * 2);
        
        const hasLens = !!metadata.lensModel;
        
        // Define Y positions depending on how many lines we have
        const lineSpacing = 24 * scale * scaleFont;
        
        let startYLeft = centerY - (hasLens ? lineSpacing : lineSpacing / 2);
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Line 1 Left: Camera Model
        ctx.fillStyle = textColorPrimary;
        ctx.font = camModelFont;
        ctx.fillText(formatCameraModel(metadata.make, metadata.model), leftTextX, startYLeft);
        
        // Line 2 Left: Lens Model (if exists)
        ctx.fillStyle = textColorSecondary;
        ctx.font = metaFont;
        if (hasLens) {
          startYLeft += lineSpacing;
          ctx.fillText(formatLensModel(metadata.lensModel), leftTextX, startYLeft);
        }

        // Line 3 Left: Date Time
        startYLeft += lineSpacing;
        ctx.fillText(formatDateTime(metadata.dateTimeOriginal), leftTextX, startYLeft);


        // Right Side:
        // 1. Focal Length | F-Stop | Shutter | ISO | EV
        // 2. GPS
        
        const focal = formatFocalLength(metadata.focalLength || metadata.focalLength35mm);
        const aperture = formatAperture(metadata.fNumber);
        const shutter = formatExposureTime(metadata.exposureTime);
        const iso = formatISO(metadata.iso);
        const ev = formatExposureBias(metadata.exposureBias);
        
        const exifStr = [focal, aperture, shutter, iso, ev].filter(Boolean).join('  ');
        const gpsStr = formatGPS(metadata.latitude, metadata.longitude);
        const hasGps = !!metadata.latitude;

        let startYRight = centerY - (hasGps ? lineSpacing / 2 : 0);

        ctx.textAlign = 'right';
        ctx.fillStyle = textColorPrimary;
        ctx.font = camModelFont;
        ctx.fillText(exifStr, rightTextX, startYRight);

        if (hasGps) {
          startYRight += lineSpacing;
          ctx.fillStyle = textColorSecondary;
          ctx.font = metaFont;
          ctx.fillText(gpsStr, rightTextX, startYRight);
        }

        setIsReady(true);
      };

      if (customLogo) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => prepareCanvas(logoImg);
        logoImg.onerror = () => prepareCanvas(null); // Fallback if logo fails
        logoImg.src = customLogo;
      } else {
        prepareCanvas(null);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, metadata, template, fontSizeScale, customLogo]);

  const handleDownload = () => {
    if (!canvasRef.current || !imageSrc) return;
    
    // Get Canvas Data URL
    const canvasDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
    let finalDataUrl = canvasDataUrl;

    try {
      // Extract EXIF from original image src
      // Note: piexifjs requires a data string (Data URL or binary string)
      const exifObj = piexif.load(imageSrc);
      const exifBytes = piexif.dump(exifObj);
      finalDataUrl = piexif.insert(exifBytes, canvasDataUrl);
    } catch (e) {
      console.warn("Could not copy original EXIF data to the new frame.", e);
    }

    const a = document.createElement('a');
    a.href = finalDataUrl;
    a.download = 'framed-photo.jpg';
    a.click();
  };

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="preview-canvas" />
      </div>
      {isReady && (
        <button className="download-btn" onClick={handleDownload}>
          <Download size={20} />
          Download Generated Image
        </button>
      )}
    </div>
  );
}
