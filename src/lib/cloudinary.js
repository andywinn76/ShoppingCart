// Server-side Cloudinary helper. Browser uploads use the unsigned widget via
// next-cloudinary (see components/ImageUploader.js).

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

// Convenience: build a transformed URL on the server when needed.
export function cldUrl(publicId, opts = {}) {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
    ...opts,
  });
}
