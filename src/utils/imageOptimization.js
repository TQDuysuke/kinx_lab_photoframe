export const generateDisplayUrl = (file, maxWidth = 1920) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = img.height * ratio;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl); // cleanup original memory
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          // fallback
          resolve(URL.createObjectURL(file));
        }
        canvas.width = 0;
        canvas.height = 0;
      }, 'image/jpeg', 0.85);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for optimization"));
    };
    
    img.src = objectUrl;
  });
};
