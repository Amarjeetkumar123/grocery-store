const bucketName = 'product-images';

// The first bytes of each allowed image type, so a renamed file is caught.
const imageSignatures = {
  'image/jpeg': { extension: 'jpg', matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', matches: (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  'image/webp': {
    extension: 'webp',
    matches: (bytes) => bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

export const allowedImageTypes = Object.keys(imageSignatures);

export function isRealImage(bytes, contentType) {
  const signature = imageSignatures[contentType];
  return Boolean(signature) && bytes.length > 12 && signature.matches(bytes);
}

const maximumImageSizeInBytes = 3 * 1024 * 1024;

// Creates the public photo bucket the first time the server starts.
async function ensureBucketExists(supabaseUrl, secretKey) {
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' };
  const existing = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`, { headers, signal: AbortSignal.timeout(10000) });
  if (existing.ok) return;
  const created = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: bucketName, name: bucketName, public: true,
      file_size_limit: maximumImageSizeInBytes, allowed_mime_types: allowedImageTypes,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!created.ok) throw new Error(`Could not create the ${bucketName} bucket: ${await created.text()}`);
}

// Product photos live in a public Supabase Storage bucket. Uploading needs
// the secret key, which only this server has.
export function createProductImageStorage({ supabaseUrl, secretKey }) {
  return {
    isConfigured: Boolean(secretKey),

    ensureBucketExists: () => (secretKey ? ensureBucketExists(supabaseUrl, secretKey) : Promise.resolve()),

    publicUrlFor(imagePath) {
      return imagePath ? `${supabaseUrl}/storage/v1/object/public/${bucketName}/${imagePath}` : null;
    },

    // ponytail: old photos are left in the bucket; clean up if storage nears the 1 GB free limit.
    async uploadProductImage(productId, bytes, contentType) {
      const imagePath = `products/${productId}-${Date.now()}.${imageSignatures[contentType].extension}`;
      const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${imagePath}`, {
        method: 'POST',
        headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': contentType },
        body: bytes,
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`Photo upload failed with status ${response.status}: ${await response.text()}`);
      return imagePath;
    },
  };
}
