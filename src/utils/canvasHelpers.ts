export const CANVAS_LOGICAL_WIDTH = 600;
export const CANVAS_LOGICAL_HEIGHT = 480;
export const CANVAS_SCALE = 2; // 1200x960 internal pixels for crisp lines
export const CANVAS_PIXEL_WIDTH = CANVAS_LOGICAL_WIDTH * CANVAS_SCALE;
export const CANVAS_PIXEL_HEIGHT = CANVAS_LOGICAL_HEIGHT * CANVAS_SCALE;

export function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return [r, g, b, 255];
}

/**
 * Fast iterative scanline flood fill on a transparent-backed canvas.
 * Empty paper pixels have alpha === 0 (or near 0); drawn lines have opaque colors.
 */
export function floodFillCanvas(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillHex: string
): boolean {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const sx = Math.floor(startX);
  const sy = Math.floor(startY);

  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return false;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const startIdx = (sy * width + sx) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];
  const targetA = data[startIdx + 3];

  const [fillR, fillG, fillB, fillA] = hexToRgba(fillHex);

  // Already the same color
  if (
    targetA > 230 &&
    Math.abs(targetR - fillR) < 8 &&
    Math.abs(targetG - fillG) < 8 &&
    Math.abs(targetB - fillB) < 8
  ) {
    return false;
  }

  const isTargetTransparent = targetA < 40;
  const tolerance = 48;

  const matchesTarget = (idx: number): boolean => {
    const a = data[idx + 3];
    if (isTargetTransparent) {
      return a < 90;
    }
    if (a < 90) return false;
    return (
      Math.abs(data[idx] - targetR) <= tolerance &&
      Math.abs(data[idx + 1] - targetG) <= tolerance &&
      Math.abs(data[idx + 2] - targetB) <= tolerance &&
      Math.abs(a - targetA) <= tolerance
    );
  };

  const setPixel = (idx: number) => {
    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;
  };

  const visited = new Uint8Array(width * height);
  const stack: number[] = [sx, sy];

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    let currX = x;

    let pixelPos = y * width + currX;
    if (visited[pixelPos] || !matchesTarget(pixelPos * 4)) continue;

    while (currX > 0 && !visited[y * width + (currX - 1)] && matchesTarget((y * width + (currX - 1)) * 4)) {
      currX--;
    }

    let spanAbove = false;
    let spanBelow = false;

    while (currX < width) {
      pixelPos = y * width + currX;
      const idx = pixelPos * 4;
      if (visited[pixelPos] || !matchesTarget(idx)) break;

      visited[pixelPos] = 1;
      setPixel(idx);

      if (y > 0) {
        const upPos = (y - 1) * width + currX;
        const upMatch = !visited[upPos] && matchesTarget(upPos * 4);
        if (!spanAbove && upMatch) {
          stack.push(currX, y - 1);
          spanAbove = true;
        } else if (spanAbove && !upMatch) {
          spanAbove = false;
        }
      }

      if (y < height - 1) {
        const downPos = (y + 1) * width + currX;
        const downMatch = !visited[downPos] && matchesTarget(downPos * 4);
        if (!spanBelow && downMatch) {
          stack.push(currX, y + 1);
          spanBelow = true;
        } else if (spanBelow && !downMatch) {
          spanBelow = false;
        }
      }

      currX++;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return true;
}

/**
 * Exports a transparent drawing canvas onto a crisp white paper background.
 */
export function exportCanvasWithWhiteBg(sourceCanvas: HTMLCanvasElement): string {
  const out = document.createElement('canvas');
  out.width = sourceCanvas.width;
  out.height = sourceCanvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) return sourceCanvas.toDataURL('image/png');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return out.toDataURL('image/png');
}

/**
 * Downloads a dataUrl as a PNG file cleanly without popups.
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
