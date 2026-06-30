export default function ProductList({
  products,
  adminSecret,
  reloadProducts,
  onEdit,
}) {
  async function deleteProduct(productId) {
    if (!confirm("Delete this product?")) return;

    try {
      const res = await fetch("/api/admin/delete-product", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          productId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error);
        return;
      }

      alert("✅ Product deleted");

      reloadProducts();

    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  if (!products.length) {
    return (
      <div style={{ marginTop: 30 }}>
        <h2>Products</h2>
        <p>No products found.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 30 }}>
      <h2>Products</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
          gap: 20,
        }}
      >
        {products.map((product) => (
          <div
            key={product.productId}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 15,
              background: "#fff",
            }}
          >
            {product.images?.length > 0 && (
              <img
                src={product.images[0]}
                alt={product.name}
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              />
            )}

            <h3>{product.name}</h3>

            <p>{product.description}</p>

            <h4>{product.price} PI</h4>

            <p>
              <b>Category:</b> {product.category}
            </p>

            <p>
              <b>Stock:</b> {product.stock}
            </p>

            <button
              onClick={() => deleteProduct(product.productId)}
              style={{
                width: "100%",
                padding: 12,
                marginTop: 10,
                background: "#e74c3c",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
