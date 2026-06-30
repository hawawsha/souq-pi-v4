import { Product } from "../../../lib/models";
import { connectDB } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
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

  try {
    await connectDB();

    const {
      productId,
      name,
      description,
      price,
      category,
      images,
      stock,
    } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: "Product ID is required",
      });
    }

    const product = await Product.findOne({ productId });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    product.name = name;
    product.description = description;
    product.price = Number(price);
    product.category = category;
    product.images = images || [];
    product.stock = Number(stock);

    await product.save();

    return res.status(200).json({
      success: true,
      product,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
