const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, hasCloudinaryConfig } = require("./cloudinary");

const storage = hasCloudinaryConfig
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: "aibnb/listings",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        public_id: `listing-${Date.now()}`,
      }),
    })
  : multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

module.exports = upload;
