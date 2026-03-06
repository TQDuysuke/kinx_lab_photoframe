export function formatAperture(fNumber) {
  if (!fNumber) return '';
  return `f/${fNumber}`;
}

export function formatFocalLength(focalLength) {
  if (!focalLength) return '';
  return `${focalLength}mm`;
}

export function formatISO(iso) {
  if (!iso) return '';
  return `ISO${iso}`;
}

export function formatCameraModel(make, model) {
  if (!make && !model) return '';
  if (!make) return model;
  if (!model) return make;
  if (model.toLowerCase().startsWith(make.toLowerCase())) {
    return model;
  }
  return `${make} ${model}`;
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const pad = (n) => n.toString().padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

export function formatGPS(latitude, longitude) {
  if (latitude === undefined || longitude === undefined) return '';

  const latRef = latitude >= 0 ? 'N' : 'S';
  const lonRef = longitude >= 0 ? 'E' : 'W';

  const formatCoord = (coord) => {
    const abs = Math.abs(coord);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(2);
    return `${deg}°${min}'${sec}"`;
  };

  return `${formatCoord(latitude)}${latRef} ${formatCoord(longitude)}${lonRef}`;
}

export function formatExposureTime(time) {
  if (!time) return '';
  if (time >= 1) return `${time}s`;
  return `1/${Math.round(1/time)}s`;
}

export function formatExposureBias(bias) {
  if (bias === undefined || bias === null) return '';
  const sign = bias > 0 ? '+' : '';
  return `${sign}${bias} EV`;
}

export function formatLensModel(lens) {
  if (!lens) return '';
  return lens;
}
