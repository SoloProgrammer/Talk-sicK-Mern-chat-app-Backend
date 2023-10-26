const cloudinary = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryDeleteImg = async (fileToDelete) => {
  cloudinary.uploader.destroy(fileToDelete, (error) => {
    if (error) {
      console.log("Error while deleting image from cloud -", error.message);
    }
  });
};
module.exports = { cloudinaryDeleteImg };
