// Cloudinary unsigned upload widget. Requires:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  (must be unsigned in Cloudinary)
//
// Calls onUpload({ url, public_id }) for every successful upload.

import { CldUploadWidget } from 'next-cloudinary';

export default function ImageUploader({ onUpload, children }) {
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!preset) {
    return (
      <button type="button" className="btn-outline" disabled title="Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET">
        Upload disabled
      </button>
    );
  }
  return (
    <CldUploadWidget
      uploadPreset={preset}
      options={{
        multiple: true,
        sources: ['local', 'url', 'camera'],
        maxFiles: 10,
      }}
      onSuccess={(result) => {
        if (result?.event === 'success' && result?.info) {
          onUpload({
            url: result.info.secure_url,
            public_id: result.info.public_id,
          });
        }
      }}
    >
      {({ open }) => (
        <button type="button" onClick={() => open()} className="btn-outline">
          {children || 'Upload images'}
        </button>
      )}
    </CldUploadWidget>
  );
}
