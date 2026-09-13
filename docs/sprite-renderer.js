'use strict';
// Texture keying is done once at load time, never in the animation loop.
// The generated sheet uses neutral checker squares; Yukina uses colored highlights.
function prepareYukinaPixels(rgba, greenScreen = false) {
  for (let i = 0; i < rgba.length; i += 4) {
    const low = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    const high = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]);
    if (greenScreen ? rgba[i + 1] > 110 && rgba[i + 1] > rgba[i] * 1.35 && rgba[i + 1] > rgba[i + 2] * 1.35 : low >= 180 && high - low <= 12) rgba[i + 3] = 0;
  }
  return rgba;
}

function prepareYukinaTexture(image, greenScreen = false) {
  const sheet = document.createElement('canvas');
  sheet.width = image.naturalWidth; sheet.height = image.naturalHeight;
  const context = sheet.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, sheet.width, sheet.height);
  prepareYukinaPixels(pixels.data, greenScreen);
  context.putImageData(pixels, 0, 0);
  return sheet;
}
