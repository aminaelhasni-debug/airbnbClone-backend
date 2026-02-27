const DEFAULT_IMAGE_URL =
  process.env.DEFAULT_LISTING_IMAGE_URL ||
  "https://placehold.co/1200x800.jpg?text=Listing+Image";

const resolvePublicBaseUrl = () => {
  const envBase = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL;

  if (envBase) return envBase.replace(/\/$/, "");

  const port = process.env.PORT || "5000";
  return `http://localhost:${port}`;
};

const buildImageUrl = (image) => {
  if (!image) return DEFAULT_IMAGE_URL;

  const value = String(image).trim();
  if (!value) return DEFAULT_IMAGE_URL;

  // Old SVG placeholder cleanup
  if (value.startsWith("data:image/svg+xml")) {
    return DEFAULT_IMAGE_URL;
  }

  // If already a full Cloudinary or external URL
  if (value.startsWith("https://") || value.startsWith("http://")) {
    return value;
  }

  // Base64 image (rare case)
  if (value.startsWith("data:image/")) {
    return value;
  }

  const baseUrl = resolvePublicBaseUrl();

  // If stored as "/uploads/file.jpg"
  if (value.startsWith("/uploads/")) {
    return `${baseUrl}${value}`;
  }

  // If stored as "uploads/file.jpg"
  if (value.startsWith("uploads/")) {
    return `${baseUrl}/${value}`;
  }

  // If stored as just "file.jpg"
  if (/^[^/\\]+\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(value)) {
    return `${baseUrl}/uploads/${value}`;
  }

  return DEFAULT_IMAGE_URL;
};

module.exports = { buildImageUrl };
