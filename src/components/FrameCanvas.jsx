import React, { useEffect, useRef, useState } from 'react';
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

export default function FrameCanvas({ imageSrc, metadata, template, fontSizeScale = 145, userUploadedLogo, detectedLogo, originalFile, logoSizeScale = 245, advancedParams = {} }) {
  const canvasRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!imageSrc || !metadata || !template) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scaleFont = fontSizeScale / 100;
      
      const pPadding = advancedParams.framePadding ?? 6;
      const pBlur = advancedParams.blurRadius ?? 45;
      const pShadow = advancedParams.shadowOpacity ?? 55;
      const pBright = advancedParams.blurBrightness ?? 65;

      const prepareCanvas = (userLogoImg, detectedLogoImg) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const imgWidth = img.width;
        const imgHeight = img.height;

        if (template.name === 'blur_style') {
          // Make padding absolute padding by expanding the canvas size.
          // This prevents disproportionate shrinking that distorts the image's aspect ratio.
          const margin = Math.max(imgWidth, imgHeight) * (pPadding / 100);

          canvas.width = imgWidth + margin * 2;
          canvas.height = imgHeight + margin * 2;

          // Layer 1: Blurred background
          ctx.save();
          const bgScale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight) * 1.1; // 10% overflow
          const bgWidth = imgWidth * bgScale;
          const bgHeight = imgHeight * bgScale;
          const offsetX = (canvas.width - bgWidth) / 2;
          const offsetY = (canvas.height - bgHeight) / 2;
          
          ctx.filter = `blur(${pBlur}px) brightness(${pBright / 100})`;
          ctx.drawImage(img, offsetX, offsetY, bgWidth, bgHeight);
          
          ctx.filter = 'none';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // extra dimming to pop the image
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Layer 2: Main Image w/ rounded corners & drop shadow
          ctx.save();
          
          const innerWidth = imgWidth;
          const innerHeight = imgHeight;
          const innerX = margin;
          const innerY = margin;
          
          const radius = imgWidth * 0.015;

          // Draw a black rect to cast the shadow
          ctx.shadowColor = `rgba(0, 0, 0, ${pShadow / 100})`;
          ctx.shadowBlur = imgWidth * 0.025;
          ctx.shadowOffsetY = imgHeight * 0.01;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.roundRect(innerX, innerY, innerWidth, innerHeight, radius);
          ctx.fill();
          ctx.restore();

          // Clip and draw the original image
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(innerX, innerY, innerWidth, innerHeight, radius);
          ctx.clip();
          ctx.drawImage(img, innerX, innerY, innerWidth, innerHeight);
          ctx.restore();

          // Layer 3: Text overlay at the bottom inside the inner image region
          const overPadding = innerHeight * (template.layout.paddingPercent / 100);
          
          const bottomY = innerY + innerHeight - overPadding;
          const leftX = innerX + overPadding;
          const rightX = innerX + innerWidth - overPadding;
          const centerX = innerX + (innerWidth / 2);
          
          // Using effective scale based on inner width because text must scale relatively
          const tScale = innerWidth / 2000;
          
          const camModelFont = `${template.layout.cameraModelFontWeight} ${template.layout.cameraModelFontSize * tScale * scaleFont}px ${template.font}`;
          const metaFont = `${template.layout.metadataFontWeight} ${template.layout.metadataFontSize * tScale * scaleFont}px ${template.font}`;

          // Text shadow for legibility over bright images
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 6 * tScale;
          ctx.shadowOffsetY = 2 * tScale;
          
          const lineSpacing = 26 * tScale * scaleFont;
          
          // A. Left Column - Bottom to Top aligning
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          let currentYLeft = bottomY;

          // Date Time (Bottom)
          ctx.fillStyle = template.layout.textColorTertiary;
          ctx.font = metaFont;
          ctx.fillText(formatDateTime(metadata.dateTimeOriginal), leftX, currentYLeft);
          currentYLeft -= lineSpacing;

          // Lens Model (Middle)
          if (metadata.lensModel) {
            ctx.fillStyle = template.layout.textColorSecondary;
            ctx.font = metaFont;
            ctx.fillText(formatLensModel(metadata.lensModel), leftX, currentYLeft);
            currentYLeft -= lineSpacing;
          }

          // Camera Model (Top)
          ctx.fillStyle = template.layout.textColorPrimary;
          ctx.font = camModelFont;
          ctx.fillText(formatCameraModel(metadata.make, metadata.model), leftX, currentYLeft);

          // B. Center Column (Logo + Settings)
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          let currentYCenter = bottomY;
          
          const focal = formatFocalLength(metadata.focalLength || metadata.focalLength35mm);
          const aperture = formatAperture(metadata.fNumber);
          const shutter = formatExposureTime(metadata.exposureTime);
          const iso = formatISO(metadata.iso);
          const ev = formatExposureBias(metadata.exposureBias);
          const exifStr = [focal, aperture, shutter, iso, ev].filter(Boolean).join('  ');

          ctx.fillStyle = template.layout.textColorPrimary;
          ctx.font = camModelFont;
          ctx.fillText(exifStr, centerX, currentYCenter);
          currentYCenter -= lineSpacing;

          // Render Detected Camera Logo
          if (detectedLogoImg) {
            const logoAspectRatio = detectedLogoImg.width / detectedLogoImg.height;
            const logoScaleMultiplier = logoSizeScale / 100;
            const baseIconSize = template.layout.iconSize * tScale * scaleFont;

            let drawWidth = baseIconSize * logoScaleMultiplier;
            let drawHeight = baseIconSize * logoScaleMultiplier;

            if (logoAspectRatio > 1) {
              drawHeight = (baseIconSize * logoScaleMultiplier) / logoAspectRatio;
            } else {
              drawWidth = (baseIconSize * logoScaleMultiplier) * logoAspectRatio;
            }

            // Since it's bottom baseline, we move Y up by drawHeight
            // Also apply invert filter if we want white logo, except for natively white ones
            const makeLower = metadata.make?.toLowerCase() || '';
            const isNativeWhite = makeLower.includes('canon') || makeLower.includes('fuji');
            
            ctx.save();
            if (!isNativeWhite) {
              ctx.filter = 'invert(1)';
            }
            // Center it horizontally, position above the EXIF text
            ctx.drawImage(detectedLogoImg, centerX - (drawWidth / 2), currentYCenter - drawHeight, drawWidth, drawHeight);
            ctx.restore();
          }

          // C. Right Column (User Uploaded Watermark/Studio Logo)
          if (userLogoImg) {
            const logoAspectRatio = userLogoImg.width / userLogoImg.height;
            // Let the right watermark be bounded reasonably
            const watermarkMaxHeight = lineSpacing * 3; 
            const watermarkMaxWidth = watermarkMaxHeight * 3;
            
            let wHeight = watermarkMaxHeight;
            let wWidth = wHeight * logoAspectRatio;
            
            if (wWidth > watermarkMaxWidth) {
               wWidth = watermarkMaxWidth;
               wHeight = wWidth / logoAspectRatio;
            }

            // Right align
            ctx.drawImage(userLogoImg, rightX - wWidth, bottomY - wHeight, wWidth, wHeight);
          }

          ctx.shadowColor = 'transparent'; // Cleanup remaining shadows
          setIsReady(true);
          return;
        }

        // ORIGINAL IPHONE STYLE RENDERER
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

        const scaledCamModelFontSize = template.layout.cameraModelFontSize * scale * scaleFont;
        const scaledMetaFontSize = template.layout.metadataFontSize * scale * scaleFont;

        const camModelFont = `${template.layout.cameraModelFontWeight} ${scaledCamModelFontSize}px ${template.font}`;
        const metaFont = `${template.layout.metadataFontWeight} ${scaledMetaFontSize}px ${template.font}`;

        const textColorPrimary = template.layout.textColorPrimary || "#000000";
        const textColorSecondary = template.layout.textColorSecondary || "#666666";

        const centerY = imgHeight + (bottomHeight / 2);

        // Unified Logo logic for iPhone Frame
        const activeLogoImg = userLogoImg || detectedLogoImg;

        // Draw Logo (Center)
        if (activeLogoImg) {
          const logoAspectRatio = activeLogoImg.width / activeLogoImg.height;
          const logoScaleMultiplier = logoSizeScale / 100;

          let drawWidth = iconSize * logoScaleMultiplier;
          let drawHeight = iconSize * logoScaleMultiplier;

          if (logoAspectRatio > 1) {
            drawHeight = (iconSize * logoScaleMultiplier) / logoAspectRatio;
          } else {
            drawWidth = (iconSize * logoScaleMultiplier) * logoAspectRatio;
          }

          ctx.drawImage(activeLogoImg, (imgWidth / 2) - (drawWidth / 2), centerY - (drawHeight / 2), drawWidth, drawHeight);
        } else {
          // Default abstract lens icon
          ctx.fillStyle = textColorSecondary;
          ctx.beginPath();
          ctx.arc(imgWidth / 2, centerY, iconSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = template.backgroundColor;
          ctx.beginPath();
          ctx.arc(imgWidth / 2, centerY, iconSize / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = textColorSecondary;
          ctx.beginPath();
          ctx.arc(imgWidth / 2, centerY, iconSize / 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // TEXT LAYOUT LOGIC
        const leftTextX = padding * 2;
        const rightTextX = imgWidth - (padding * 2);

        const hasLens = !!metadata.lensModel;

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

      // Image pre-loading chain helper
      const loadImg = (src) => new Promise((resolve) => {
        if (!src) resolve(null);
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () => resolve(null);
        i.src = src;
      });

      Promise.all([
        loadImg(userUploadedLogo),
        loadImg(detectedLogo)
      ]).then(([userLogoImg, detectedLogoImg]) => {
        prepareCanvas(userLogoImg, detectedLogoImg);
      });
    };
    img.src = imageSrc;
  }, [imageSrc, metadata, template, fontSizeScale, userUploadedLogo, detectedLogo, logoSizeScale, advancedParams]);

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} className="preview-canvas" />
      </div>
    </div>
  );
}
