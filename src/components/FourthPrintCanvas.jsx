import React, { useEffect, useRef } from 'react';

/**
 * FourthPrintCanvas — 4 cells (2×2 grid) on a single 4×6 sheet
 * Layout (landscape default):
 *   [A][B]
 *   [A][B]
 */
export default function FourthPrintCanvas({
  photoA,
  photoB,
  orientation,
  // Shared text/style
  customNames,
  customDate,
  fontFamily,
  fontWeight = 'normal',
  fontSizeScale = 100,
  showDashedLine,
  // Shared frame
  imageMargin = 3,
  textAreaHeight = 23,
  textMargin = 5,
  // Per-photo controls
  imageZoomA = 100, imageOffsetXA = 0, imageOffsetYA = 0,
  imageZoomB = 100, imageOffsetXB = 0, imageOffsetYB = 0,
  // Callbacks
  onPanChangeA, onPanChangeB,
  onZoomChangeA, onZoomChangeB,
  onCanvasReady,
}) {
  const canvasRef = useRef(null);
  const imageARef = useRef(null);
  const imageBRef = useRef(null);
  const [imageALoaded, setImageALoaded] = React.useState(0);
  const [imageBLoaded, setImageBLoaded] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const draggingHalf = useRef(null); // 'A' or 'B'
  const lastPos = useRef({ x: 0, y: 0 });
  const [fontLoadedTime, setFontLoadedTime] = React.useState(Date.now());

  React.useEffect(() => {
    document.fonts.load(`10px "${fontFamily}"`).then(() => {
      setFontLoadedTime(Date.now());
    }).catch(console.warn);
  }, [fontFamily]);

  useEffect(() => {
    if (!photoA?.displayUrl) { imageARef.current = null; setImageALoaded(0); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imageARef.current = img; setImageALoaded(Date.now()); };
    img.src = photoA.displayUrl;
  }, [photoA]);

  useEffect(() => {
    if (!photoB?.displayUrl) { imageBRef.current = null; setImageBLoaded(0); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imageBRef.current = img; setImageBLoaded(Date.now()); };
    img.src = photoB.displayUrl;
  }, [photoB]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const printWidth  = orientation === 'portrait' ? 1200 : 1800;
    const printHeight = orientation === 'portrait' ? 1800 : 1200;
    canvas.width  = printWidth;
    canvas.height = printHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, printWidth, printHeight);

    // 4 cells arranged as 2 columns × 2 rows
    // Left column = Photo A, Right column = Photo B
    const halfW = printWidth / 2;
    const halfH = printHeight / 2;
    const boxes = [
      { x: 0,     y: 0,     w: halfW, h: halfH, img: imageARef.current, zoom: imageZoomA, ox: imageOffsetXA, oy: imageOffsetYA },
      { x: halfW, y: 0,     w: halfW, h: halfH, img: imageBRef.current, zoom: imageZoomB, ox: imageOffsetXB, oy: imageOffsetYB },
      { x: 0,     y: halfH, w: halfW, h: halfH, img: imageARef.current, zoom: imageZoomA, ox: imageOffsetXA, oy: imageOffsetYA },
      { x: halfW, y: halfH, w: halfW, h: halfH, img: imageBRef.current, zoom: imageZoomB, ox: imageOffsetXB, oy: imageOffsetYB },
    ];

    boxes.forEach(({ x, y, w, h, img, zoom, ox, oy }) => {
      const baseDim = Math.min(w, h);
      const margin  = baseDim * (imageMargin / 100);
      const bottomTextSpace = baseDim * (textAreaHeight / 100);
      const textPad = baseDim * (textMargin / 100);

      const imgBoxX = x + margin;
      const imgBoxY = y + margin;
      const imgBoxW = w - margin * 2;
      const imgBoxH = h - margin - bottomTextSpace;
      const textAreaY = imgBoxY + imgBoxH;
      const textAreaH = bottomTextSpace;

      if (!img) {
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
        ctx.fillStyle = '#9ca3af';
        ctx.font = `400 ${baseDim * 0.045}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Upload Photo', x + w / 2, imgBoxY + imgBoxH / 2);
      } else {
        const scaleToCover = Math.max(imgBoxW / img.width, imgBoxH / img.height);
        const finalScale = scaleToCover * (zoom / 100);
        const drawW = img.width * finalScale;
        const drawH = img.height * finalScale;
        const baseDrawX = imgBoxX + imgBoxW / 2 - drawW / 2;
        const baseDrawY = imgBoxY + imgBoxH / 2 - drawH / 2;
        const drawX = baseDrawX + (ox / 100) * (imgBoxW / 2);
        const drawY = baseDrawY + (oy / 100) * (imgBoxH / 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // Text area
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, textAreaY, w, textAreaH);

      const fontScale = baseDim / 600;
      const nameFontSize = 28 * fontScale * (fontSizeScale / 100);
      const dateFontSize = 14 * fontScale * (fontSizeScale / 100);
      const textCenterY = textAreaY + textPad + (textAreaH - textPad * 2) / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#000000';
      ctx.font = `${fontWeight} ${nameFontSize}px "${fontFamily}", sans-serif`;
      ctx.fillText(customNames, x + w / 2, textCenterY + nameFontSize * 0.1);

      ctx.textBaseline = 'top';
      ctx.fillStyle = '#555555';
      ctx.font = `400 ${dateFontSize}px "Inter", sans-serif`;
      ctx.fillText(customDate, x + w / 2, textCenterY + nameFontSize * 0.2);
    });

    // Dashed lines
    if (showDashedLine) {
      ctx.save();
      ctx.setLineDash([20, 15]);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 3;
      // Vertical center
      ctx.beginPath();
      ctx.moveTo(halfW, 0); ctx.lineTo(halfW, printHeight);
      ctx.stroke();
      // Horizontal center
      ctx.beginPath();
      ctx.moveTo(0, halfH); ctx.lineTo(printWidth, halfH);
      ctx.stroke();
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCanvasReady(dataUrl);

  }, [
    imageALoaded, imageBLoaded, fontLoadedTime,
    orientation,
    customNames, customDate, fontFamily, fontWeight, fontSizeScale, showDashedLine,
    imageZoomA, imageOffsetXA, imageOffsetYA,
    imageZoomB, imageOffsetXB, imageOffsetYB,
    imageMargin, textAreaHeight, textMargin,
    onCanvasReady,
  ]);

  // Determine which column (A = left, B = right)
  const getHalf = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return 'A';
    const rect = canvas.getBoundingClientRect();
    return (e.clientX - rect.left) < rect.width / 2 ? 'A' : 'B';
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    draggingHalf.current = getHalf(e);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    if (draggingHalf.current === 'A' && onPanChangeA) onPanChangeA(dx * 0.6, dy * 0.6);
    else if (draggingHalf.current === 'B' && onPanChangeB) onPanChangeB(dx * 0.6, dy * 0.6);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    draggingHalf.current = null;
    e.target.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const half = (e.clientX - rect.left) < rect.width / 2 ? 'A' : 'B';
      const delta = e.deltaY > 0 ? -3 : 3;
      if (half === 'A' && onZoomChangeA) onZoomChangeA(delta);
      else if (half === 'B' && onZoomChangeB) onZoomChangeB(delta);
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onZoomChangeA, onZoomChangeB]);

  return (
    <div
      className="canvas-wrapper yearbook-preview-canvas print-canvas-wrapper"
      style={{ aspectRatio: orientation === 'portrait' ? '2/3' : '3/2', overflow: 'hidden', maxHeight: 'calc(100vh - 120px)' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
