const DEFAULT_IMAGE_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250' viewBox='0 0 400 250'><rect width='400' height='250' fill='#e5e7eb'/><text x='200' y='125' font-family='Arial, sans-serif' font-size='20' fill='#6b7280' text-anchor='middle' dominant-baseline='middle'>No Image</text></svg>"
  );

const buildImageUrl = (image) => {
  if (!image) return DEFAULT_IMAGE_DATA_URL;

  const value = String(image).trim();
  if (!value) return DEFAULT_IMAGE_DATA_URL;

  if (value.startsWith("data:image/")) return value;
  if (value.startsWith("https://")) return value;
  if (value.startsWith("http://")) return value;

  if (value.startsWith("/uploads/")) {
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || "";
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, "")}${value}`;
    }
  }

  // Handle legacy absolute local URLs like "http://localhost:5000/uploads/..."
  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith("/uploads/")) {
      const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || "";
      if (publicBaseUrl) {
        return `${publicBaseUrl.replace(/\/$/, "")}${parsed.pathname}`;
      }
    }
  } catch (_) {
    // Not a valid URL string; fallback below.
  }

  return DEFAULT_IMAGE_DATA_URL;
};

module.exports = { buildImageUrl };
