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

/**
 * Software blur via progressive downscale→upscale.
 * Works on all browsers including Safari/iOS where ctx.filter is unsupported.
 * @param {CanvasRenderingContext2D} ctx  - destination context
 * @param {HTMLImageElement|HTMLCanvasElement} src - image/canvas to draw blurred
 * @param {number} dx, dy, dw, dh - destination rect on ctx
 * @param {number} blurRadius - conceptual blur radius (1-100). Larger = blurrier.
 * @param {number} brightness - 0-1 multiplier applied via a darkening overlay
 */
function softwareBlur(ctx, src, dx, dy, dw, dh, blurRadius, brightness) {
  // Cap blur: higher blurRadius = smaller intermediate canvas = more blur
  const factor = Math.max(2, Math.min(32, blurRadius / 3));
  const tmpW = Math.max(1, Math.round(dw / factor));
  const tmpH = Math.max(1, Math.round(dh / factor));

  // Step 1: Draw downscaled (generates natural bilinear blur)
  const tmp = document.createElement('canvas');
  tmp.width = tmpW;
  tmp.height = tmpH;
  const tCtx = tmp.getContext('2d');
  tCtx.drawImage(src, 0, 0, src.naturalWidth || src.width, src.naturalHeight || src.height, 0, 0, tmpW, tmpH);

  // Step 2: Draw upscaled back to destination (smoothed)
  ctx.drawImage(tmp, 0, 0, tmpW, tmpH, dx, dy, dw, dh);

  // Step 3: Apply brightness via semi-transparent overlay
  if (brightness !== undefined && brightness < 1) {
    const alpha = 1 - brightness;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
    ctx.fillRect(dx, dy, dw, dh);
  }
}

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
          
          softwareBlur(ctx, img, offsetX, offsetY, bgWidth, bgHeight, pBlur, pBright / 100);
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

        if (template.name === 'live_view_style') {
          // Live View Style: Image stays full size, HUD overlay drawn on top
          canvas.width = imgWidth;
          canvas.height = imgHeight;
          
          ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

          // Optional: Slight top/bottom gradient to ensure white text readability
          const gadientTop = ctx.createLinearGradient(0, 0, 0, imgHeight * 0.15);
          gadientTop.addColorStop(0, 'rgba(0,0,0,0.5)');
          gadientTop.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gadientTop;
          ctx.fillRect(0, 0, imgWidth, imgHeight * 0.15);

          const gadientBot = ctx.createLinearGradient(0, imgHeight * 0.85, 0, imgHeight);
          gadientBot.addColorStop(0, 'rgba(0,0,0,0)');
          gadientBot.addColorStop(1, 'rgba(0,0,0,0.6)');
          ctx.fillStyle = gadientBot;
          ctx.fillRect(0, imgHeight * 0.85, imgWidth, imgHeight * 0.15);

          // 1. Draw Rule of Thirds Grid
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; // faint white
          ctx.lineWidth = Math.max(1, imgWidth * 0.001);
          
          ctx.beginPath();
          // Vertical lines
          ctx.moveTo(imgWidth * (1/3), 0); ctx.lineTo(imgWidth * (1/3), imgHeight);
          ctx.moveTo(imgWidth * (2/3), 0); ctx.lineTo(imgWidth * (2/3), imgHeight);
          // Horizontal lines
          ctx.moveTo(0, imgHeight * (1/3)); ctx.lineTo(imgWidth, imgHeight * (1/3));
          ctx.moveTo(0, imgHeight * (2/3)); ctx.lineTo(imgWidth, imgHeight * (2/3));
          ctx.stroke();
          ctx.restore();

          // 2. Draw Adjustable Focus Bracket
          ctx.save();
          ctx.strokeStyle = '#00FF41'; // Camera autofocus green
          ctx.lineWidth = Math.max(2, imgWidth * 0.002);
          const fBoxSize = Math.max(50, imgWidth * 0.06);
          const pFocusX = advancedParams.focusX ?? 50;
          const pFocusY = advancedParams.focusY ?? 50;
          const fBoxX = (imgWidth * (pFocusX / 100)) - (fBoxSize / 2);
          const fBoxY = (imgHeight * (pFocusY / 100)) - (fBoxSize / 2);
          const braceLen = fBoxSize * 0.25;

          ctx.beginPath();
          // Top Left
          ctx.moveTo(fBoxX + braceLen, fBoxY); ctx.lineTo(fBoxX, fBoxY); ctx.lineTo(fBoxX, fBoxY + braceLen);
          // Top Right
          ctx.moveTo(fBoxX + fBoxSize - braceLen, fBoxY); ctx.lineTo(fBoxX + fBoxSize, fBoxY); ctx.lineTo(fBoxX + fBoxSize, fBoxY + braceLen);
          // Bottom Left
          ctx.moveTo(fBoxX + braceLen, fBoxY + fBoxSize); ctx.lineTo(fBoxX, fBoxY + fBoxSize); ctx.lineTo(fBoxX, fBoxY + fBoxSize - braceLen);
          // Bottom Right
          ctx.moveTo(fBoxX + fBoxSize - braceLen, fBoxY + fBoxSize); ctx.lineTo(fBoxX + fBoxSize, fBoxY + fBoxSize); ctx.lineTo(fBoxX + fBoxSize, fBoxY + fBoxSize - braceLen);
          ctx.stroke();
          ctx.restore();

          // Text styling setup
          const tScale = imgWidth / 2000;
          ctx.fillStyle = '#ffffff';
          ctx.textBaseline = 'middle';
          const padding = imgWidth * (template.layout.paddingPercent / 100);

          // 3. Top HUD Bar
          // Draw Battery Icon
          ctx.save();
          const batW = 40 * tScale;
          const batH = 20 * tScale;
          const batX = padding;
          const batY = padding;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2 * tScale;
          ctx.strokeRect(batX, batY, batW, batH);
          ctx.fillRect(batX + batW, batY + (batH * 0.25), 3 * tScale, batH * 0.5); // battery tip
          ctx.fillStyle = '#fff';
          ctx.fillRect(batX + (2 * tScale), batY + (2 * tScale), batW * 0.7 - (4 * tScale), batH - (4 * tScale)); // charge level
          ctx.restore();

          // Rec Dot
          ctx.save();
          const pFont = `${18 * tScale * scaleFont}px ${template.font}`;
          ctx.font = pFont;
          ctx.fillStyle = '#ff3b30'; // Red dot
          ctx.beginPath();
          ctx.arc(batX + batW + 20 * tScale, batY + (batH/2), 6 * tScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText("STBY", batX + batW + 35 * tScale, batY + (batH/2));
          ctx.restore();

          // Right Top (Resolution / FPS)
          ctx.save();
          ctx.textAlign = 'right';
          ctx.font = `bold ${18 * tScale * scaleFont}px ${template.font}`;
          ctx.fillText("RAW   FX", imgWidth - padding, padding + (batH/2));
          ctx.restore();

          // 4. Bottom HUD Bar (EXIF Metering)
          ctx.save();
          ctx.font = `${20 * tScale * scaleFont}px ${template.font}`;
          ctx.textAlign = 'left';
          
          let botTextExif = [];
          if (metadata.exposureTime) botTextExif.push(`1/${Math.round(1 / metadata.exposureTime)}`);
          if (metadata.fNumber) botTextExif.push(`F${metadata.fNumber}`);
          if (metadata.iso) botTextExif.push(`ISO ${metadata.iso}`);
          let evText = "MM ★";
          if (metadata.exposureCompensation !== undefined) {
             const ev = metadata.exposureCompensation > 0 ? `+${metadata.exposureCompensation}` : metadata.exposureCompensation;
             evText = `${ev} EV`;
          }
          
          const textY = imgHeight - padding;
          ctx.fillText(botTextExif.join('   '), padding, textY);
          
          ctx.textAlign = 'right';
          ctx.fillText(`AF-S   ${evText}`, imgWidth - padding, textY);
          
          ctx.restore();

          // 5. Draw Real Histogram
          ctx.save();
          try {
            // Compute Histogram on a low-res offscreen canvas for performance
            const histSize = 128; // Small sample size to be nearly instant
            const offCanvas = document.createElement('canvas');
            offCanvas.width = histSize; 
            offCanvas.height = histSize;
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
            offCtx.drawImage(img, 0, 0, histSize, histSize);
            const histData = offCtx.getImageData(0, 0, histSize, histSize).data;
            
            const bins = new Array(256).fill(0);
            for (let i = 0; i < histData.length; i += 4) {
               // Calculate relative luminance
               const lum = Math.round(0.299 * histData[i] + 0.587 * histData[i+1] + 0.114 * histData[i+2]);
               if (lum >= 0 && lum <= 255) {
                  bins[lum]++;
               }
            }
            
            let maxBin = Math.max(...bins);
            if(maxBin === 0) maxBin = 1;

            const histW = 200 * tScale;
            const histH = 80 * tScale;
            const histX = padding;
            // Place it above the bottom text EXIF bar
            const histY = textY - (30 * tScale) - histH;

            // Draw Background Box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(histX, histY, histW, histH);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1 * tScale;
            ctx.strokeRect(histX, histY, histW, histH);

            // Draw Histogram Peaks
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.moveTo(histX, histY + histH);
            for(let bIdx = 0; bIdx < 256; bIdx++) {
               const val = bins[bIdx];
               const pct = val / maxBin;
               // Gamma correction to ensure small peaks are visible
               const drawPct = Math.pow(pct, 0.6); 
               const barH = drawPct * histH;
               const xPos = histX + (bIdx / 256) * histW;
               ctx.lineTo(xPos, histY + histH - barH);
            }
            ctx.lineTo(histX + histW, histY + histH);
            ctx.fill();
            
          } catch(e) {
            console.warn("Histogram render failed", e);
          }
          ctx.restore();
        } else if (template.name === 'glass_style') {
          // Glass Morphism Style
          const tScale = Math.max(imgWidth, imgHeight) / 2000;
          
          const paddingOuter = Math.max(imgWidth, imgHeight) * (template.layout.paddingPercent / 100);
          const paddingInner = Math.max(imgWidth, imgHeight) * (template.layout.cardPaddingPercent / 100);
          const textSpace = Math.max(imgWidth, imgHeight) * (template.layout.textSpacePercent / 100);
          const cornerRadiusCard = Math.max(imgWidth, imgHeight) * 0.03;
          const cornerRadiusImg = Math.max(imgWidth, imgHeight) * 0.02;

          const cardWidth = imgWidth + paddingInner * 2;
          const cardHeight = imgHeight + paddingInner * 2 + textSpace;
          
          canvas.width = cardWidth + paddingOuter * 2;
          canvas.height = cardHeight + paddingOuter * 2;

          // 1. Draw blurred backdrop (Background)
          ctx.save();
          const scaleW = canvas.width / imgWidth;
          const scaleH = canvas.height / imgHeight;
          const scaleBg = Math.max(scaleW, scaleH) * 1.1;
          const drawW = imgWidth * scaleBg;
          const drawH = imgHeight * scaleBg;
          const bgDx = (canvas.width - drawW) / 2;
          const bgDy = (canvas.height - drawH) / 2;
          const blurBrightnessPct = (advancedParams.blurBrightness ?? 70) / 100;
          softwareBlur(ctx, img, bgDx, bgDy, drawW, drawH, 80 * tScale, blurBrightnessPct);
          ctx.restore();

          // 2. Draw Glass Card
          ctx.save();
          const cardX = paddingOuter;
          const cardY = paddingOuter;
          
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 60 * tScale;
          ctx.shadowOffsetY = 30 * tScale;
          
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cornerRadiusCard);
          
          const gradFill = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
          gradFill.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          gradFill.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
          ctx.fillStyle = gradFill;
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          const gradStroke = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
          gradStroke.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          gradStroke.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
          ctx.strokeStyle = gradStroke;
          ctx.lineWidth = Math.max(2 * tScale, 2);
          ctx.stroke();
          ctx.restore();

          // 3. Draw Sharp Image inside the Card
          ctx.save();
          const imgX = cardX + paddingInner;
          const imgY = cardY + paddingInner;
          
          ctx.beginPath();
          ctx.roundRect(imgX, imgY, imgWidth, imgHeight, cornerRadiusImg);
          ctx.clip(); 
          ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
          ctx.restore();

          // 4. Draw Typography / Data
          ctx.save();
          const textStartX = imgX + (20 * tScale); 
          const textStartY = imgY + imgHeight + (50 * tScale); 

          let makeStr = metadata.make || "Unknown Camera";
          let modelStr = metadata.model || "";
          if (modelStr.toLowerCase().startsWith(makeStr.toLowerCase())) {
             makeStr = modelStr;
          } else {
             makeStr = `${makeStr} ${modelStr}`;
          }
          if (makeStr.trim() === "Unknown Camera") makeStr = "Beautiful Capture";

          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 ${80 * tScale * scaleFont}px ${template.font}`;
          ctx.textBaseline = 'top';
          ctx.fillText(makeStr.toUpperCase(), textStartX, textStartY);

          const subtitleY = textStartY + (100 * tScale * scaleFont);
          const lensFormat = metadata.lensModel ? formatLensModel(metadata.lensModel) : '';
          const focalFormat = formatFocalLength(metadata.focalLength || metadata.focalLength35mm);
          let subtitleStr = [lensFormat, focalFormat].filter(Boolean).join(' • ');
          if (!subtitleStr) subtitleStr = "Captured with excellent precision.";

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.font = `400 ${45 * tScale * scaleFont}px ${template.font}`;
          ctx.fillText(subtitleStr, textStartX, subtitleY);

          const statsY = subtitleY + (120 * tScale * scaleFont);
          const iso = formatISO(metadata.iso);
          const ap = formatAperture(metadata.fNumber);
          const shut = formatExposureTime(metadata.exposureTime);
          
          let curX = textStartX;
          const statPadding = 50 * tScale;
          const drawStat = (label, val) => {
             if (!val) return;
             ctx.fillStyle = '#FFFFFF';
             ctx.font = `700 ${40 * tScale * scaleFont}px ${template.font}`;
             ctx.fillText(val, curX, statsY);
             const valWidth = ctx.measureText(val).width;
             
             ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
             ctx.font = `400 ${36 * tScale * scaleFont}px ${template.font}`;
             const labelPad = 12 * tScale;
             ctx.fillText(label, curX + valWidth + labelPad, statsY);
             const labelWidth = ctx.measureText(label).width;
             curX += valWidth + labelPad + labelWidth + statPadding;
          };

          drawStat('ISO', iso); 
          drawStat('Aperture', ap);
          drawStat('Shutter', shut);

          // Removed top-right button/logo to maintain clean minimal layout
        } else if (template.name === 'film_style') {
          // Film Negative Style
          const tbMargin = Math.max(imgWidth, imgHeight) * (template.layout.paddingPercent / 100);
          const lrMargin = tbMargin * 0.4;
          
          canvas.width = imgWidth + lrMargin * 2;
          canvas.height = imgHeight + tbMargin * 2;
          
          // Dark backdrop
          ctx.fillStyle = '#111111'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const tScale = Math.max(imgWidth, imgHeight) / 2000;
          
          // White film border outline
          const outlineP = 6 * tScale;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(lrMargin - outlineP, tbMargin - outlineP, imgWidth + outlineP*2, imgHeight + outlineP*2);
          
          // Inner Image
          ctx.drawImage(img, lrMargin, tbMargin, imgWidth, imgHeight);

          // Sprocket Holes
          ctx.fillStyle = template.backgroundColor || '#ffffff';
          const holeW = 35 * tScale;
          const holeH = 45 * tScale;
          const holeYTop = (tbMargin / 2) - (holeH / 2) - (12 * tScale);
          const holeYBot = canvas.height - (tbMargin / 2) - (holeH / 2) + (12 * tScale);
          const holeSpacing = 85 * tScale;
          
          let curX = lrMargin + 20 * tScale;
          while (curX < canvas.width - lrMargin - holeW) {
            ctx.beginPath();
            ctx.roundRect(curX, holeYTop, holeW, holeH, 8 * tScale);
            ctx.roundRect(curX, holeYBot, holeW, holeH, 8 * tScale);
            ctx.fill();
            curX += holeSpacing;
          }

          // Film Text & Codes
          ctx.fillStyle = template.layout.textColorPrimary;
          ctx.font = `${template.layout.metadataFontWeight} ${template.layout.metadataFontSize * tScale * scaleFont}px ${template.font}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          const textYTop = tbMargin - (22 * tScale); 
          const textYBot = canvas.height - tbMargin + (22 * tScale);
          
          let filmName = metadata.make ? `${metadata.make.toUpperCase()} COLOR` : 'KODAK GOLD 200';
          if (filmName.includes('FUJI')) filmName = 'FUJICOLOR PRO 400H';

          ctx.fillText(`▶ 35A       ${filmName}       36`, lrMargin, textYTop);
          
          const focal = formatFocalLength(metadata.focalLength || metadata.focalLength35mm);
          const aperture = formatAperture(metadata.fNumber);
          const shutter = formatExposureTime(metadata.exposureTime);
          const iso = formatISO(metadata.iso);
          const ev = formatExposureBias(metadata.exposureBias);
          const exifStr = [focal, aperture, shutter, iso, ev].filter(Boolean).join('      ');

          ctx.fillText(`▶ 35A       ${exifStr}       36`, lrMargin, textYBot);
        } else {
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
