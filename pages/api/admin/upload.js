import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const adminSecret = req.headers["x-admin-secret"];

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        success: false,
        error: "Upload parse failed",
      });
    }

    try {
      let file = files.image;

      if (Array.isArray(file)) {
        file = file[0];
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          error: "No image uploaded",
        });
      }

      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "souq-pi",
        resource_type: "image",
      });

      try {
        fs.unlinkSync(file.filepath);
      } catch {}

      return res.status(200).json({
        success: true,
        image: {
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        },
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}
