import { useEffect, useRef, useState } from 'react';
import { callApi } from '../../../apiClient.js';

export const maximumPhotos = 6;

const photosPath = (productId) => `/api/admin/products/${productId}/photos`;
const sendImage = (path, method, image) => callApi(path, { method, rawBody: image, contentType: image.type });

// Adds a photo to a saved product; returns the product with its photos.
export async function uploadProductPhoto(productId, image) {
  return (await sendImage(photosPath(productId), 'POST', image)).product;
}

// Saved product: every change goes to the server, which answers with the whole product.
function useSavedPhotos(product, onProductChanged) {
  const run = async (request) => onProductChanged((await request()).product);
  return {
    photos: product.photos,
    add: (image) => run(() => sendImage(photosPath(product.id), 'POST', image)),
    replace: (photoId, image) => run(() => sendImage(`${photosPath(product.id)}/${photoId}`, 'PUT', image)),
    remove: (photoId) => run(() => callApi(`${photosPath(product.id)}/${photoId}`, { method: 'DELETE' })),
    reorder: (photoIds) => run(() => callApi(`${photosPath(product.id)}/order`, { method: 'PUT', body: { photoIds } })),
  };
}

// New product: photos wait in the browser ({ id, url, image }) and upload after "Add product".
function useLocalPhotos() {
  const [photos, setPhotos] = useState([]);
  const nextId = useRef(1);
  const photosRef = useRef(photos);
  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);
  const withUrl = (image) => ({ id: `new-${nextId.current++}`, url: URL.createObjectURL(image), image });
  return {
    photos,
    add: async (image) => {
      const photo = withUrl(image);
      setPhotos((list) => [...list, photo]);
    },
    replace: async (photoId, image) => {
      const photo = { ...withUrl(image), id: photoId };
      setPhotos((list) => list.map((current) => (current.id === photoId ? photo : current)));
    },
    remove: async (photoId) => setPhotos((list) => list.filter((photo) => photo.id !== photoId)),
    reorder: async (photoIds) => setPhotos((list) => photoIds.map((photoId) => list.find((photo) => photo.id === photoId))),
  };
}

// { photos: [{ id, url }], add(image), replace(photoId, image), remove(photoId), reorder(photoIds) }.
// The first photo is the cover. Both hooks always run, so the order of hooks never changes.
export function usePhotoList(product, onProductChanged) {
  const saved = useSavedPhotos(product ?? { photos: [] }, onProductChanged);
  const local = useLocalPhotos();
  return product ? saved : local;
}
