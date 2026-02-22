const { v2: cloudinary } = require("cloudinary");

const missingCloudinaryEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
].filter((key) => !process.env[key]);

const hasCloudinaryConfig = Boolean(
  missingCloudinaryEnvVars.length === 0
);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

module.exports = { cloudinary, hasCloudinaryConfig, missingCloudinaryEnvVars };
