const buildImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("https://")) return image;
  if (image.startsWith("data:image/")) return image;

  if (image.startsWith("/uploads/")) {
    const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || "";
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, "")}${image}`;
    }
  }

  return "";
};

module.exports = { buildImageUrl };
