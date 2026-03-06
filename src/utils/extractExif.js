import exifr from 'exifr';

/**
 * Extracts specific EXIF metadata from an image file.
 * @param {File | Blob} file - The image file to parse
 * @returns {Promise<Object>} The extracted metadata object
 */
export async function extractExif(file) {
  try {
    const output = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
    });
    
    if (!output) return null;

    return {
      make: output.Make,
      model: output.Model,
      focalLength: output.FocalLength,
      fNumber: output.FNumber,
      iso: output.ISO,
      dateTimeOriginal: output.DateTimeOriginal,
      latitude: output.latitude,
      longitude: output.longitude,
      // Enhanced Metadata
      exposureTime: output.ExposureTime,
      exposureBias: output.ExposureBiasValue,
      meteringMode: output.MeteringMode,
      flash: output.Flash,
      focalLength35mm: output.FocalLengthIn35mmFormat,
      lensModel: output.LensModel || output.Lens,
    };
  } catch (error) {
    console.error("Error extracting EXIF:", error);
    return null;
  }
}
