import { callApi } from '../../../apiClient.js';
import { shrinkImage } from '../../../imageResizing.js';

// Category tiles are small, so 600 pixels on the longest side is plenty.
export async function uploadCategoryPhoto(categoryId, file) {
  const image = await shrinkImage(file, 600).catch(() => {
    throw new Error('This photo could not be read. Try a JPG or PNG.');
  });
  return callApi(`/api/admin/categories/${categoryId}/image`, { method: 'POST', rawBody: image, contentType: image.type });
}
