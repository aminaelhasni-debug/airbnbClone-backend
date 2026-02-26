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

  // Legacy placeholder payload used by earlier backend versions.
  if (value.startsWith("data:image/svg+xml")) return DEFAULT_IMAGE_URL;

  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("https://")) return value;
  if (value.startsWith("http://")) return value;

  if (value.startsWith("/uploads/")) {
    return `${resolvePublicBaseUrl()}${value}`;
  }
  if (value.startsWith("uploads/")) {
    return `${resolvePublicBaseUrl()}/${value}`;
  }
  if (/^[^/\\]+\.(jpg|jpeg|png|webp|gif|bmp|svg|avif)$/i.test(value)) {
    return `${resolvePublicBaseUrl()}/uploads/${value}`;
  }

  // Handle legacy absolute local URLs like "http://localhost:5000/uploads/..."
  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${resolvePublicBaseUrl()}${parsed.pathname}`;
    }
  } catch (_) {
    // Not a valid URL string; fallback below.
  }

  return DEFAULT_IMAGE_URL;
};

module.exports = { buildImageUrl };
