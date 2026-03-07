import * as StackBlur from 'stackblur-canvas';

/**
 * High-quality blur using the Stack Blur algorithm.
 * Works on all browsers including Safari/iOS (no ctx.filter needed).
 *
 * For performance on mobile, blur is applied at a reduced resolution
 * then upscaled — which still produces much better quality than the
 * plain downscale trick.
 *
 * @param {CanvasRenderingContext2D} ctx - destination context
 * @param {HTMLImageElement|HTMLCanvasElement} src - source image/canvas
 * @param {number} dx - destination x
 * @param {number} dy - destination y
 * @param {number} dw - destination width
 * @param {number} dh - destination height
 * @param {number} blurRadius - blur radius in pixels (relative to destination size)
 * @param {number} [brightness] - 0–1 multiplier; values <1 darken the result
 */
export function softwareBlur(ctx, src, dx, dy, dw, dh, blurRadius, brightness) {
  // Work at a capped resolution for performance on mobile
  // 800px is sufficient for a blurred background — imperceptible difference when scaled
  const MAX_SIDE = 800;
  const scale = Math.min(1, MAX_SIDE / Math.max(dw, dh));
  const tmpW = Math.max(1, Math.round(dw * scale));
  const tmpH = Math.max(1, Math.round(dh * scale));

  const tmp = document.createElement('canvas');
  tmp.width = tmpW;
  tmp.height = tmpH;
  const tCtx = tmp.getContext('2d', { willReadFrequently: true });

  // Draw source into the temp canvas at reduced size
  const srcW = src.naturalWidth || src.width;
  const srcH = src.naturalHeight || src.height;
  tCtx.drawImage(src, 0, 0, srcW, srcH, 0, 0, tmpW, tmpH);

  // Scale blur radius proportionally to the downscaled canvas
  const scaledRadius = Math.max(1, Math.min(180, Math.round(blurRadius * scale)));
  StackBlur.canvasRGBA(tmp, 0, 0, tmpW, tmpH, scaledRadius);

  // Draw blurred result onto the destination context (upscaled)
  ctx.drawImage(tmp, 0, 0, tmpW, tmpH, dx, dy, dw, dh);

  // Apply brightness via a darkening overlay
  if (brightness !== undefined && brightness < 1) {
    const alpha = 1 - brightness;
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
    ctx.fillRect(dx, dy, dw, dh);
  }
}
