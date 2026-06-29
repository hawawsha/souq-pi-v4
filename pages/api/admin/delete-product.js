import { connectDB } from "../../../lib/db";
import { Product } from "../../../lib/models";
import logger from "../../../lib/logger";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  // التحقق من كلمة سر الأدمن
  const secret = req.headers["x-admin-secret"];

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  try {
    await connectDB();

    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "productId is required",
      });
    }

    const deleted = await Product.findOneAndDelete({ productId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    logger.info("Product deleted", {
      productId,
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    logger.error("Delete product failed", {
      error: err.message,
    });

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
