import piexif from 'piexifjs';
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
} from './formatMetadata';

export const generateFrameUrl = async (photo, template, fontSizeScale, userUploadedLogo, detectedLogo, logoSizeScale = 245, advancedParams = {}) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const metadata = photo.metadata;
      const scaleFont = fontSizeScale / 100;
      
      const pPadding = advancedParams.framePadding ?? 6;
      const pBlur = advancedParams.blurRadius ?? 45;
      const pShadow = advancedParams.shadowOpacity ?? 55;
      const pBright = advancedParams.blurBrightness ?? 65;
      
      const prepareCanvas = (userLogoImg, detectedLogoImg) => {
        const canvas = document.createElement('canvas');
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
          const bgScale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight) * 1.1; 
          const bgWidth = imgWidth * bgScale;
          const bgHeight = imgHeight * bgScale;
          const offsetX = (canvas.width - bgWidth) / 2;
          const offsetY = (canvas.height - bgHeight) / 2;
          
          ctx.filter = `blur(${pBlur}px) brightness(${pBright / 100})`;
          ctx.drawImage(img, offsetX, offsetY, bgWidth, bgHeight);
          
          ctx.filter = 'none';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Layer 2: Main Image w/ rounded corners & drop shadow
          ctx.save();
          
          const innerWidth = imgWidth;
          const innerHeight = imgHeight;
          const innerX = margin;
          const innerY = margin;
          
          const radius = imgWidth * 0.015;

          ctx.shadowColor = `rgba(0, 0, 0, ${pShadow / 100})`;
          ctx.shadowBlur = imgWidth * 0.025;
          ctx.shadowOffsetY = imgHeight * 0.01;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.roundRect(innerX, innerY, innerWidth, innerHeight, radius);
          ctx.fill();
          ctx.restore();

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
          
          const tScale = innerWidth / 2000;
          
          const camModelFont = `${template.layout.cameraModelFontWeight} ${template.layout.cameraModelFontSize * tScale * scaleFont}px ${template.font}`;
          const metaFont = `${template.layout.metadataFontWeight} ${template.layout.metadataFontSize * tScale * scaleFont}px ${template.font}`;

          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 6 * tScale;
          ctx.shadowOffsetY = 2 * tScale;
          
          const lineSpacing = 26 * tScale * scaleFont;
          
          // A. Left Column
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          let currentYLeft = bottomY;

          ctx.fillStyle = template.layout.textColorTertiary;
          ctx.font = metaFont;
          ctx.fillText(formatDateTime(metadata.dateTimeOriginal), leftX, currentYLeft);
          currentYLeft -= lineSpacing;

          if (metadata.lensModel) {
            ctx.fillStyle = template.layout.textColorSecondary;
            ctx.font = metaFont;
            ctx.fillText(formatLensModel(metadata.lensModel), leftX, currentYLeft);
            currentYLeft -= lineSpacing;
          }

          ctx.fillStyle = template.layout.textColorPrimary;
          ctx.font = camModelFont;
          ctx.fillText(formatCameraModel(metadata.make, metadata.model), leftX, currentYLeft);

          // B. Center Column
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

            const makeLower = metadata.make?.toLowerCase() || '';
            const isNativeWhite = makeLower.includes('canon') || makeLower.includes('fuji');
            
            ctx.save();
            if (!isNativeWhite) {
              ctx.filter = 'invert(1)';
            }
            ctx.drawImage(detectedLogoImg, centerX - (drawWidth / 2), currentYCenter - drawHeight, drawWidth, drawHeight);
            ctx.restore();
          }

          // C. Right Column 
          if (userLogoImg) {
            const logoAspectRatio = userLogoImg.width / userLogoImg.height;
            const watermarkMaxHeight = lineSpacing * 3; 
            const watermarkMaxWidth = watermarkMaxHeight * 3;
            
            let wHeight = watermarkMaxHeight;
            let wWidth = wHeight * logoAspectRatio;
            
            if (wWidth > watermarkMaxWidth) {
               wWidth = watermarkMaxWidth;
               wHeight = wWidth / logoAspectRatio;
            }

            ctx.drawImage(userLogoImg, rightX - wWidth, bottomY - wHeight, wWidth, wHeight);
          }

          ctx.shadowColor = 'transparent'; 
          
          // GENERATE EXIF BATCH DOWNLOAD LOGIC FOR BLUR TEMPLATE
          let finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          try {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const exifObj = piexif.load(e.target.result);
                const exifBytes = piexif.dump(exifObj);
                finalDataUrl = piexif.insert(exifBytes, finalDataUrl);
              } catch (err) {
                console.warn("Could not copy EXIF", err);
              }
              canvas.width = 0; canvas.height = 0;
              resolve(finalDataUrl);
            };
            reader.onerror = () => {
              canvas.width = 0; canvas.height = 0;
              resolve(finalDataUrl);
            };
            reader.readAsDataURL(photo.file);
            return;
          } catch (e) {
             console.warn("Could not initiate FileReader for EXIF", e);
          }
          canvas.width = 0; canvas.height = 0;
          resolve(finalDataUrl);
          return;
        }

        // --- ORIGINAL IPHONE STYLE RENDERER ---
        const scale = imgWidth / 2000;
        const bottomHeight = (template.bottomPanelHeight || 140) * scale;
        
        canvas.width = imgWidth;
        canvas.height = imgHeight + bottomHeight;

        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        ctx.fillStyle = template.backgroundColor || '#ffffff';
        ctx.fillRect(0, imgHeight, imgWidth, bottomHeight);
        
        const padding = (template.layout.padding || 20) * scale;
        const iconSize = (template.layout.iconSize || 60) * scale * scaleFont;
        
        const camModelFont = `${template.layout.cameraModelFontWeight} ${template.layout.cameraModelFontSize * scale * scaleFont}px ${template.font}`;
        const metaFont = `${template.layout.metadataFontWeight} ${template.layout.metadataFontSize * scale * scaleFont}px ${template.font}`;
        
        const textColorPrimary = template.layout.textColorPrimary || "#000000";
        const textColorSecondary = template.layout.textColorSecondary || "#666666";

        const centerY = imgHeight + (bottomHeight / 2);

        // Unified fallback logo for iPhone template
        const activeLogoImg = userLogoImg || detectedLogoImg;

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

        const leftTextX = padding * 2;
        const rightTextX = imgWidth - (padding * 2);
        
        const hasLens = !!metadata.lensModel;
        const lineSpacing = 24 * scale * scaleFont;
        let startYLeft = centerY - (hasLens ? lineSpacing : lineSpacing / 2);
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColorPrimary;
        ctx.font = camModelFont;
        ctx.fillText(formatCameraModel(metadata.make, metadata.model), leftTextX, startYLeft);
        
        ctx.fillStyle = textColorSecondary;
        ctx.font = metaFont;
        if (hasLens) {
          startYLeft += lineSpacing;
          ctx.fillText(formatLensModel(metadata.lensModel), leftTextX, startYLeft);
        }

        startYLeft += lineSpacing;
        ctx.fillText(formatDateTime(metadata.dateTimeOriginal), leftTextX, startYLeft);

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

        let finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const exifObj = piexif.load(e.target.result);
              const exifBytes = piexif.dump(exifObj);
              finalDataUrl = piexif.insert(exifBytes, finalDataUrl);
            } catch (err) {
              console.warn("Could not copy EXIF", err);
            }
            // Aggressively free canvas memory
            canvas.width = 0;
            canvas.height = 0;
            resolve(finalDataUrl);
          };
          reader.onerror = () => {
            canvas.width = 0;
            canvas.height = 0;
            resolve(finalDataUrl);
          };
          reader.readAsDataURL(photo.file);
          return; // resolve/reject happens inside FileReader events
        } catch (e) {
          console.warn("Could not initiate FileReader for EXIF", e);
        }
        
        // Fallback or error cleanup
        canvas.width = 0;
        canvas.height = 0;
        resolve(finalDataUrl);
      };

      // Load required logos before painting
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
      
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load original image"));
    };
    
    // Create high-res object URL specifically for the download process
    const highResUrl = URL.createObjectURL(photo.file);
    img.src = highResUrl;
  });
};
