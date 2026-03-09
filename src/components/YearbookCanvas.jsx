import React, { useEffect, useRef, useState } from 'react';

// Load Google Fonts for yearbook — Dancing Script for the handwritten feel
const FONT_SCRIPT = 'Dancing Script, cursive';
const FONT_BOLD   = 'Georgia, serif';
const FONT_CLEAN  = 'Inter, sans-serif';

function getFontFamily(fontStyle) {
  if (fontStyle === 'script') return FONT_SCRIPT;
  if (fontStyle === 'bold')   return FONT_BOLD;
  return FONT_CLEAN;
}

/** Draw an image clipped into a rounded rect */
function drawClippedImage(ctx, img, x, y, w, h, radius = 0) {
  ctx.save();
  ctx.beginPath();
  if (radius > 0 && ctx.roundRect) {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  // Cover-fill: scale to fill the rect
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** Draw a Polaroid-style card with slight tilt */
function drawPolaroid(ctx, img, cx, cy, cardW, cardH, tiltDeg, shadowAlpha = 0.4) {
  const rad = (tiltDeg * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rad);

  // Shadow
  ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
  ctx.shadowBlur  = 20;
  ctx.shadowOffsetY = 8;

  const borderV = cardH * 0.06;
  const borderH = cardH * 0.04;
  const footerH = cardH * 0.18;

  // White card background
  ctx.fillStyle = '#f4f0e8';
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Photo area inside polaroid
  const photoX = -cardW / 2 + borderH;
  const photoY = -cardH / 2 + borderV;
  const photoW = cardW - borderH * 2;
  const photoH = cardH - borderV - footerH;

  if (img) {
    drawClippedImage(ctx, img, photoX, photoY, photoW, photoH, 2);
  }

  ctx.restore();
}

/** Blur a section of the canvas (software box blur approximation) */
function drawBlurredBackground(ctx, img, canvasW, canvasH, blurAmt = 30) {
  // Draw scaled up to fill
  const scale = Math.max(canvasW / img.width, canvasH / img.height) * 1.1;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = (canvasW - dw) / 2;
  const dy = (canvasH - dh) / 2;
  ctx.filter = `blur(${blurAmt}px) brightness(0.55)`;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
export default function YearbookCanvas({
  photos,        // array of { displayUrl }
  layout,        // yearbookLayouts[n]
  className,     // e.g. "12A12"
  quote,         // e.g. "Mùa hạ năm ấy"
  yearLabel,     // e.g. "2024 - 2025"
  fontStyle,     // 'script' | 'bold' | 'clean'
  colorTheme,    // 'dark' | 'light' | 'vintage'
  onCanvasReady, // callback(dataUrl) after render
}) {
  const canvasRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!photos || photos.length === 0 || !layout) return;
    if (!canvasRef.current) return;

    setIsRendering(true);

    // Load all photo images
    const loadImg = (src) =>
      new Promise((resolve) => {
        if (!src) return resolve(null);
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload  = () => resolve(i);
        i.onerror = () => resolve(null);
        i.src = src;
      });

    Promise.all(photos.map((p) => loadImg(p.displayUrl))).then((imgs) => {
      const validImgs = imgs.filter(Boolean);
      if (validImgs.length === 0) { setIsRendering(false); return; }

      renderCanvas(validImgs);
      setIsRendering(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, layout, className, quote, yearLabel, fontStyle, colorTheme]);

  function renderCanvas(imgs) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Canvas is portrait 3:4 ratio at high res
    const W = 1500;
    const H = 2000;
    canvas.width  = W;
    canvas.height = H;

    // ── Theme colours ────────────────────────────────────────────────
    let bgColor, textPrimary, textAccent, accentBadge;
    if (colorTheme === 'light') {
      bgColor     = '#f5f0e8';
      textPrimary = '#1a1a1a';
      textAccent  = layout.accentColor2 || '#d4a017';
      accentBadge = layout.accentColor  || '#2d5a27';
    } else if (colorTheme === 'vintage') {
      bgColor     = '#2a2018';
      textPrimary = '#f5e6c8';
      textAccent  = '#d4a017';
      accentBadge = '#8B6914';
    } else { // dark (default)
      bgColor     = '#0e1412';
      textPrimary = '#ffffff';
      textAccent  = layout.accentColor2 || '#d4a017';
      accentBadge = layout.accentColor  || '#2d5a27';
    }

    const fontFamily = getFontFamily(fontStyle);

    // ── Dispatch to specific layout renderer ─────────────────────────
    if (layout.name === 'classic_grid') {
      renderClassicGrid(ctx, imgs, W, H, { bgColor, textPrimary, textAccent, accentBadge, fontFamily });
    } else if (layout.name === 'scatter') {
      renderScatter(ctx, imgs, W, H, { bgColor, textPrimary, textAccent, accentBadge, fontFamily });
    } else if (layout.name === 'minimal_duo') {
      renderMinimalDuo(ctx, imgs, W, H, { bgColor, textPrimary, textAccent, accentBadge, fontFamily });
    }

    // Notify parent with data URL
    if (onCanvasReady) {
      try { onCanvasReady(canvas.toDataURL('image/jpeg', 0.92)); } catch (_) {}
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT 1: Classic Grid
  // ════════════════════════════════════════════════════════════════════
  function renderClassicGrid(ctx, imgs, W, H, colors) {
    const { bgColor, textPrimary, textAccent, accentBadge, fontFamily } = colors;
    const GAP   = 12;
    const PAD   = 24;

    // ── Clear ─────────────────────────────────────────────────────────
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // ── TOP SECTION (40% of height) ───────────────────────────────────
    const topH   = H * 0.42;
    const topY   = PAD;

    // Left large photo (55% width of top area)
    const leftW  = W * 0.54 - PAD * 1.5;
    const leftH  = topH - PAD;
    if (imgs[0]) drawClippedImage(ctx, imgs[0], PAD, topY, leftW, leftH, 8);

    // Right column: 2 stacked photos
    const rightX = PAD + leftW + GAP;
    const rightW = W - rightX - PAD;
    const rightH = (leftH - GAP) / 2;
    if (imgs[1]) drawClippedImage(ctx, imgs[1], rightX, topY, rightW, rightH, 8);
    if (imgs[2]) drawClippedImage(ctx, imgs[2], rightX, topY + rightH + GAP, rightW, rightH, 8);

    // ── CLASS NAME BADGE (overlapping top-right corner) ───────────────
    if (className) {
      const badgeW = rightW * 0.85;
      const badgeH = rightH * 0.45;
      const badgeX = rightX + (rightW - badgeW) / 2;
      const badgeY = topY + rightH + GAP + rightH - badgeH - 16;

      // Badge white card with slight rotation
      ctx.save();
      ctx.translate(badgeX + badgeW / 2, badgeY + badgeH / 2);
      ctx.rotate(-1.5 * Math.PI / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur  = 12;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, -badgeH / 2, badgeW, badgeH, 6);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle   = accentBadge;
      ctx.font        = `900 ${badgeH * 0.55}px ${fontFamily === FONT_SCRIPT ? FONT_BOLD : fontFamily}`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(className, 0, 0);
      ctx.restore();
    }

    // ── OVERLAPPING SMALL POLAROID (middle card) ──────────────────────
    const extraImg = imgs[3] || imgs[2] || imgs[1];
    if (extraImg) {
      const polW = leftW * 0.38;
      const polH = polW * 1.25;
      const polCX = PAD + leftW - polW * 0.35;
      const polCY = topY + leftH * 0.7;
      drawPolaroid(ctx, extraImg, polCX, polCY, polW, polH, -4, 0.5);
    }

    // ── DIVIDER LINE & DECORATIVE DOT ROW ────────────────────────────
    const divY = topY + topH + GAP * 0.5;
    ctx.fillStyle = textAccent;
    ctx.fillRect(PAD, divY, W - PAD * 2, 3);

    // Dot accents
    const dotColors = [accentBadge, textAccent, '#ffffff'];
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.fillStyle = dotColors[i % dotColors.length];
      ctx.arc(PAD + 12 + i * 18, divY + 1.5, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── HERO PHOTO (bottom 55% of height) ────────────────────────────
    const heroImg   = imgs.length >= 5 ? imgs[4] : imgs[imgs.length - 1];
    const heroY     = divY + GAP;
    const heroH     = H - heroY - PAD;
    const heroW     = W - PAD * 2;

    if (heroImg) {
      drawClippedImage(ctx, heroImg, PAD, heroY, heroW, heroH, 10);
    }

    // ── GRADIENT OVERLAY on hero ──────────────────────────────────────
    const grad = ctx.createLinearGradient(PAD, heroY + heroH * 0.5, PAD, heroY + heroH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = grad;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PAD, heroY, heroW, heroH, 10);
    ctx.clip();
    ctx.fillRect(PAD, heroY, heroW, heroH);
    ctx.restore();

    // ── QUOTE TEXT on hero ────────────────────────────────────────────
    if (quote) {
      const qFontSize = Math.min(heroH * 0.11, 110);
      const qX = PAD + heroW * 0.06;
      const qY = heroY + heroH - heroH * 0.18;

      ctx.save();
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 16;
      ctx.fillStyle    = '#ffffff';
      ctx.font         = `italic ${qFontSize}px ${fontFamily}`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'bottom';

      // Multi-line support: wrap at ~16 chars
      const words     = quote.split(' ');
      const lineLimit = 3;
      let lines       = [];
      let cur         = '';
      words.forEach((w) => {
        if ((cur + ' ' + w).trim().length > 16 && cur) {
          lines.push(cur.trim());
          cur = w;
        } else {
          cur = (cur + ' ' + w).trim();
        }
      });
      if (cur) lines.push(cur);
      lines = lines.slice(0, lineLimit);

      lines.reverse().forEach((line, i) => {
        ctx.fillText(`"${i === 0 ? line : line}"`, qX, qY - i * qFontSize * 1.15);
      });
      // Re-render first line without the second quote if multi-line
      if (lines.length > 1) {
        const firstLine = lines[lines.length - 1]; // last reversed = first original
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`"${firstLine}`, qX, qY - (lines.length - 1) * qFontSize * 1.15);
      }
      ctx.restore();
    }

    // ── YEAR LABEL corner badge ───────────────────────────────────────
    if (yearLabel) {
      const yrFontSize = 34;
      ctx.save();
      ctx.fillStyle    = textAccent;
      ctx.font         = `bold ${yrFontSize}px ${fontFamily === FONT_SCRIPT ? FONT_BOLD : fontFamily}`;
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor  = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur   = 10;
      ctx.fillText(yearLabel, PAD + heroW - 16, heroY + heroH - 16);
      ctx.restore();
    }

    // ── Decorative corner triangles ───────────────────────────────────
    ctx.save();
    ctx.fillStyle = textAccent + '99'; // semi-transparent
    ctx.beginPath();
    ctx.moveTo(W - 0, 0);
    ctx.lineTo(W - 80, 0);
    ctx.lineTo(W - 0, 80);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accentBadge + '88';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(70, H);
    ctx.lineTo(0, H - 70);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT 2: Polaroid Scatter
  // ════════════════════════════════════════════════════════════════════
  function renderScatter(ctx, imgs, W, H, colors) {
    const { bgColor, textPrimary, textAccent, accentBadge, fontFamily } = colors;

    // Background
    if (imgs[0]) {
      drawBlurredBackground(ctx, imgs[0], W, H, 35);
    }
    // dark overlay
    ctx.fillStyle = colorTheme === 'light' ? 'rgba(240,235,225,0.65)' : 'rgba(10,16,14,0.72)';
    ctx.fillRect(0, 0, W, H);

    // Predefined scatter positions (cx%, cy%, w%, tilt)
    const positions = [
      { cx: 0.35, cy: 0.22, w: 0.42, tilt: -5  },
      { cx: 0.68, cy: 0.30, w: 0.38, tilt:  6  },
      { cx: 0.22, cy: 0.42, w: 0.36, tilt: -2  },
      { cx: 0.60, cy: 0.53, w: 0.40, tilt:  3  },
      { cx: 0.35, cy: 0.65, w: 0.37, tilt: -7  },
      { cx: 0.72, cy: 0.74, w: 0.35, tilt:  4  },
    ];

    const displayCount = Math.min(imgs.length, positions.length);
    for (let i = 0; i < displayCount; i++) {
      const pos   = positions[i];
      const cardW = W * pos.w;
      const cardH = cardW * 1.28; // polaroid ratio
      drawPolaroid(ctx, imgs[i], W * pos.cx, H * pos.cy, cardW, cardH, pos.tilt, 0.5);
    }

    // ── Top title overlay ─────────────────────────────────────────────
    // semi-transparent strip at top
    const stripH = H * 0.13;
    const grad = ctx.createLinearGradient(0, 0, 0, stripH);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, stripH);

    if (className) {
      ctx.save();
      ctx.fillStyle    = '#ffffff';
      ctx.font         = `900 ${H * 0.07}px ${fontFamily === FONT_SCRIPT ? FONT_BOLD : fontFamily}`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor  = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur   = 14;
      ctx.fillText(className, W / 2, H * 0.025);
      ctx.restore();
    }

    // ── Bottom text strip ─────────────────────────────────────────────
    const botStripY = H * 0.86;
    const botGrad = ctx.createLinearGradient(0, botStripY, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, botStripY, W, H - botStripY);

    if (quote) {
      ctx.save();
      ctx.fillStyle    = textAccent;
      ctx.font         = `italic ${H * 0.055}px ${fontFamily}`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor  = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur   = 12;
      ctx.fillText(`"${quote}"`, W / 2, H - H * 0.07);
      ctx.restore();
    }

    if (yearLabel) {
      ctx.save();
      ctx.fillStyle    = 'rgba(255,255,255,0.8)';
      ctx.font         = `bold ${H * 0.03}px ${fontFamily === FONT_SCRIPT ? FONT_BOLD : fontFamily}`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(yearLabel, W / 2, H - H * 0.025);
      ctx.restore();
    }

    // Corner accent triangles
    ctx.save();
    ctx.fillStyle = textAccent + 'cc';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(60,0); ctx.lineTo(0,60); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W,H); ctx.lineTo(W-60,H); ctx.lineTo(W,H-60); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════════════════
  // LAYOUT 3: Minimal Duo
  // ════════════════════════════════════════════════════════════════════
  function renderMinimalDuo(ctx, imgs, W, H, colors) {
    const { bgColor, textPrimary, textAccent, accentBadge, fontFamily } = colors;

    // Solid bg
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    const GAP      = 10;
    const PAD      = 30;
    const photoH   = H * 0.72;
    const photoY   = PAD;

    // Photos side by side
    const numPhotos = Math.min(imgs.length, 2);
    if (numPhotos === 1) {
      // Single full-width photo
      drawClippedImage(ctx, imgs[0], PAD, photoY, W - PAD * 2, photoH, 10);
    } else {
      const halfW = (W - PAD * 2 - GAP) / 2;
      for (let i = 0; i < numPhotos; i++) {
        drawClippedImage(ctx, imgs[i], PAD + i * (halfW + GAP), photoY, halfW, photoH, 8);
      }
    }

    // Thin accent line
    const lineY = photoY + photoH + 24;
    ctx.fillStyle = textAccent;
    ctx.fillRect(PAD, lineY, W - PAD * 2, 4);

    // Class name - large bold
    const textZoneY = lineY + 20;
    if (className) {
      ctx.save();
      const cFontSize = Math.min(H * 0.09, 160);
      ctx.fillStyle    = textPrimary;
      ctx.font         = `900 ${cFontSize}px ${fontFamily === FONT_SCRIPT ? FONT_BOLD : fontFamily}`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(className, PAD, textZoneY);
      ctx.restore();
    }

    // Quote - script / italic below
    if (quote) {
      const qFontSize = Math.min(H * 0.05, 90);
      const qY        = className ? textZoneY + H * 0.10 : textZoneY;
      ctx.save();
      ctx.fillStyle    = textAccent;
      ctx.font         = `italic ${qFontSize}px ${fontFamily}`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
      ctx.shadowColor  = colorTheme === 'dark' ? 'rgba(0,0,0,0.5)' : 'transparent';
      ctx.shadowBlur   = 8;
      ctx.fillText(`"${quote}"`, PAD, qY);
      ctx.restore();
    }

    // Year label - bottom right
    if (yearLabel) {
      ctx.save();
      ctx.fillStyle    = textPrimary;
      ctx.font         = `bold ${H * 0.028}px ${fontFamily === FONT_SCRIPT ? FONT_BOLD : fontFamily}`;
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'bottom';
      ctx.globalAlpha  = 0.6;
      ctx.fillText(yearLabel, W - PAD, H - PAD);
      ctx.restore();
    }

    // Optional: 3rd/4th photos as small thumbnails at bottom right
    if (imgs.length > 2) {
      const thumbSize = (W - PAD * 2) * 0.13;
      const thumbY    = H - PAD - thumbSize;
      for (let i = 2; i < Math.min(imgs.length, 5); i++) {
        const tx = PAD + (i - 2) * (thumbSize + 8);
        drawClippedImage(ctx, imgs[i], tx, thumbY, thumbSize, thumbSize, 5);
      }
    }

    // Corner decoration
    ctx.save();
    ctx.strokeStyle = textAccent;
    ctx.lineWidth   = 4;
    ctx.beginPath();
    const cc = 40;
    ctx.moveTo(W - PAD - cc, PAD); ctx.lineTo(W - PAD, PAD); ctx.lineTo(W - PAD, PAD + cc);
    ctx.moveTo(PAD, H - PAD - cc); ctx.lineTo(PAD, H - PAD); ctx.lineTo(PAD + cc, H - PAD);
    ctx.stroke();
    ctx.restore();
  }

  return (
    <div className="yearbook-canvas-wrapper">
      {isRendering && (
        <div className="yearbook-canvas-loading">
          <div className="spinner" />
        </div>
      )}
      <canvas ref={canvasRef} className="yearbook-preview-canvas" />
    </div>
  );
}
