const { v2: cloudinary } = require("cloudinary");

const getEnv = (key) => String(process.env[key] || "").trim();

const missingCloudinaryEnvVars = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
].filter((key) => !getEnv(key));

const hasCloudinaryConfig = Boolean(
  missingCloudinaryEnvVars.length === 0
);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: getEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: getEnv("CLOUDINARY_API_KEY"),
    api_secret: getEnv("CLOUDINARY_API_SECRET"),
  });
}

module.exports = { cloudinary, hasCloudinaryConfig, missingCloudinaryEnvVars };
