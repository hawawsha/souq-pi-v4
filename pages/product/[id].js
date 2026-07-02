import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProductDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    loadProduct();
  }, [id]);

  async function loadProduct() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();

      if (data.success) {
        const item = data.data.products.find(
          (p) => p.productId === id
        );

        setProduct(item || null);
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 50,
          textAlign: "center",
          fontSize: 22,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div
        style={{
          padding: 50,
          textAlign: "center",
        }}
      >
        <h2>Product not found</h2>

        <Link href="/">
          Back to Store
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <Link
        href="/"
        style={{
          textDecoration: "none",
          color: "#0984e3",
          fontWeight: "bold",
        }}
      >
        ← Back to Store
      </Link>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 40,
          marginTop: 30,
        }}
      >
        <div>
          <img
            src={
              product.images?.length
                ? product.images[0]
                : "/no-image.png"
            }
            alt={product.name}
            style={{
              width: "100%",
              borderRadius: 12,
              objectFit: "cover",
            }}
          />
        </div>

        <div>
          <h1>{product.name}</h1>

          <p
            style={{
              fontSize: 18,
              color: "#555",
              lineHeight: 1.7,
            }}
          >
            {product.description}
          </p>

          <h2
            style={{
              color: "#00b894",
              marginTop: 20,
            }}
          >
            {product.price} PI
          </h2>

          <p>
            <b>Category:</b>{" "}
            {product.category}
          </p>

          <p>
            <b>Available:</b>{" "}
            {product.stock}
          </p>
          <button
            style={{
              marginTop: 30,
              padding: "15px 30px",
              background: "#6c5ce7",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: "bold",
              cursor: "pointer",
              width: "100%",
            }}
            onClick={() => {
              alert("Buy with Pi سيتم ربطه بالـ Pi SDK في الخطوة التالية.");
            }}
          >
            Buy with Pi
          </button>
        </div>
      </div>
    </div>
  );
}
