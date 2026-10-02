// Shrinks a phone photo (often 4 MB or more) to at most 1000 pixels on its
// longest side before upload, so product pages load fast on mobile data.
export async function shrinkImage(file, longestSide = 1000) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webpImage = await toBlob('image/webp');
  // Older iPhones cannot make WebP and quietly return PNG; JPEG is smaller then.
  return webpImage?.type === 'image/webp' ? webpImage : toBlob('image/jpeg');
}
