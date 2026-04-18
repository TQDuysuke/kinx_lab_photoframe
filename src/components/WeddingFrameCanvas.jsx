import React, { useEffect, useRef } from 'react';

export default function WeddingFrameCanvas({ 
  photo, 
  orientation, 
  customNames, 
  customDate, 
  fontFamily, 
  fontWeight = 'normal',
  fontSizeScale = 100,
  imageZoom,
  imageOffsetX,
  imageOffsetY,
  imageMargin = 3,
  textAreaHeight = 23,
  textMargin = 5,
  onPanChange,
  onZoomChange,
  onCanvasReady 
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageLoaded, setImageLoaded] = React.useState(0);
  
  const [isDragging, setIsDragging] = React.useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [fontLoadedTime, setFontLoadedTime] = React.useState(Date.now());

  React.useEffect(() => {
    document.fonts.load(`10px "${fontFamily}"`).then(() => {
      setFontLoadedTime(Date.now());
    }).catch(console.warn);
  }, [fontFamily]);

  useEffect(() => {
    if (!photo || !photo.displayUrl) {
      imageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(Date.now());
    };
    img.src = photo.displayUrl;
  }, [photo]);

  useEffect(() => {
    if (!imageRef.current || !canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    
    // Setup Print dimensions (300dpi approximation)
    // 4x6 inches at 300dpi is 1200x1800
    const printWidth = orientation === 'portrait' ? 1200 : 1800;
    const printHeight = orientation === 'portrait' ? 1800 : 1200;
    
    canvas.width = printWidth;
    canvas.height = printHeight;

    // 1. Draw plain white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, printWidth, printHeight);

      // Define sub-boxes based on splitMode
      const boxes = [ { x: 0, y: 0, w: printWidth, h: printHeight } ];

      boxes.forEach(box => {
        const baseDim = Math.min(box.w, box.h);
        const margin = baseDim * (imageMargin / 100); 
        const bottomTextSpace = baseDim * (textAreaHeight / 100);
        const textPad = baseDim * (textMargin / 100);

        // Padded Image Area
        const imgBoxX = box.x + margin;
        const imgBoxY = box.y + margin;
        const imgBoxW = box.w - (margin * 2);
        const imgBoxH = box.h - margin - bottomTextSpace;

        // Text Area below the image
        const textAreaY = imgBoxY + imgBoxH;
        const textAreaH = bottomTextSpace;

        // Calculate Image Cover (Center crop) to fill the padded area
        const scaleToCover = Math.max(imgBoxW / img.width, imgBoxH / img.height);
        
        // Apply user zoom
        const finalScale = scaleToCover * (imageZoom / 100);

        const drawW = img.width * finalScale;
        const drawH = img.height * finalScale;
        
        // Centered position inside the padded box with offset applied
        const baseDrawX = imgBoxX + (imgBoxW / 2) - (drawW / 2);
        const baseDrawY = imgBoxY + (imgBoxH / 2) - (drawH / 2);

        const drawX = baseDrawX + (imageOffsetX / 100) * (imgBoxW / 2);
        const drawY = baseDrawY + (imageOffsetY / 100) * (imgBoxH / 2);

        // Clip and Draw Image
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgBoxX, imgBoxY, imgBoxW, imgBoxH);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Draw Text Background (Optional since canvas is already white)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(box.x, textAreaY, box.w, textAreaH);

        // Text settings
        // Base scale depends on the shortest edge of the box to keep text readable
        const fontScale = baseDim / 600; 

        const nameFontSize = 28 * fontScale * (fontSizeScale / 100);
        const dateFontSize = 14 * fontScale * (fontSizeScale / 100);

        // Center text vertically in the text area with padding
        const textCenterY = textAreaY + textPad + (textAreaH - textPad * 2) / 2;

        // Draw Name
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = "#000000";
        ctx.font = `${fontWeight} ${nameFontSize}px "${fontFamily}", sans-serif`;
        ctx.fillText(customNames, box.x + box.w / 2, textCenterY + (nameFontSize * 0.1)); // tiny baseline adj

        // Draw Date
        ctx.textBaseline = 'top';
        ctx.fillStyle = "#555555";
        ctx.font = `400 ${dateFontSize}px "Inter", sans-serif`; // date is usually a simple font
        ctx.fillText(customDate, box.x + box.w / 2, textCenterY + (nameFontSize * 0.2));
      });



    // Output to base64
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCanvasReady(dataUrl);

  }, [imageLoaded, fontLoadedTime, orientation, customNames, customDate, fontFamily, fontWeight, fontSizeScale, imageZoom, imageOffsetX, imageOffsetY, imageMargin, textAreaHeight, textMargin, onCanvasReady]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !onPanChange) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    // Direct object panning (follow mouse)
    onPanChange(dx * 0.6, dy * 0.6); 
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onZoomChange) return;

    const handleWheel = (e) => {
      e.preventDefault(); // Stop page scrolling
      // Moderate the zoom speed
      const delta = e.deltaY > 0 ? -3 : 3;
      onZoomChange(delta);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onZoomChange]);

  return (
    <div className="canvas-wrapper yearbook-preview-canvas print-canvas-wrapper" style={{ aspectRatio: orientation === 'portrait' ? '2/3' : '3/2', overflow: 'hidden', maxHeight: 'calc(100vh - 120px)' }}>
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
