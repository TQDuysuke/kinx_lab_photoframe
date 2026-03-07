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

export const generateFrameUrl = async (photo, template, fontSizeScale, customLogo, logoSizeScale = 245) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const metadata = photo.metadata;
      const scaleFont = fontSizeScale / 100;
      
      const prepareCanvas = (logoImg) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const imgWidth = img.width;
        const imgHeight = img.height;
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

        if (logoImg) {
          const logoAspectRatio = logoImg.width / logoImg.height;
          
          const logoScaleMultiplier = logoSizeScale / 100;
          
          let drawWidth = iconSize * logoScaleMultiplier;
          let drawHeight = iconSize * logoScaleMultiplier;
          
          if (logoAspectRatio > 1) {
            drawHeight = (iconSize * logoScaleMultiplier) / logoAspectRatio;
          } else {
            drawWidth = (iconSize * logoScaleMultiplier) * logoAspectRatio;
          }
          ctx.drawImage(logoImg, (imgWidth / 2) - (drawWidth / 2), centerY - (drawHeight / 2), drawWidth, drawHeight);
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

      if (customLogo) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.onload = () => prepareCanvas(logoImg);
        logoImg.onerror = () => prepareCanvas(null);
        logoImg.src = customLogo;
      } else {
        prepareCanvas(null);
      }
      
      // Free the highResUrl memory immediately after the image finishes loading into the canvas
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
