import { useEffect, useState } from "react";

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [logged, setLogged] = useState(false);
  const [products, setProducts] = useState([]);
  const [msg, setMsg] = useState("");

  const login = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });

    const data = await res.json();

    if (data.success) {
      setLogged(true);
      loadProducts();
    } else {
      alert("Wrong secret");
    }
  };

  const loadProducts = async () => {
    const res = await fetch("/api/products");
    const data = await res.json();

    if (data.success) {
      setProducts(data.data.products);
    }
  };

  const deleteProduct = async (productId) => {
    const res = await fetch("/api/admin/delete-product", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
      },
      body: JSON.stringify({ productId }),
    });

    const data = await res.json();

    if (data.success) {
      setMsg("✅ Deleted");
      loadProducts();
    } else {
      setMsg("❌ " + data.error);
    }
  };

  if (!logged) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto" }}>
        <h2>Admin Login</h2>

        <input
          type="password"
          placeholder="Admin Secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        />

        <button onClick={login} style={{ width: "100%", padding: 15, marginTop: 10 }}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto" }}>
      <h2>Admin Panel</h2>

      {msg && <p>{msg}</p>}

      <div style={{ display: "grid", gap: 15 }}>
        {products.map((p) => (
          <div
            key={p.productId}
            style={{
              border: "1px solid #ddd",
              padding: 15,
              borderRadius: 10,
            }}
          >
            {p.images?.[0] && (
              <img
                src={p.images[0]}
                style={{ width: 120, height: 120, objectFit: "cover" }}
              />
            )}

            <h3>{p.name}</h3>
            <p>{p.price} PI</p>

            <button
              onClick={() => deleteProduct(p.productId)}
              style={{
                background: "red",
                color: "white",
                padding: 10,
                border: "none",
                borderRadius: 5,
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
