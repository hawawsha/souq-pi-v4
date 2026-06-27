import { useState } from "react";

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    stock: 1,
    uid: "",
    username: "",
    wallet: ""
  });

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const login = async () => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret })
    });

    const data = await res.json();

    if (data.success) {
      setLogged(true);
    } else {
      alert("Wrong secret");
    }
  };

  const addProduct = async () => {
    setLoading(true);
    setMsg("");

    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret
      },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        category: form.category,
        images: form.image ? [form.image] : [],
        stock: Number(form.stock),
        seller: {
          uid: form.uid,
          username: form.username,
          walletAddress: form.wallet
        }
      })
    });

    const data = await res.json();

    if (data.success) {
      setMsg("✅ Product added");

      setForm({
        name: "",
        description: "",
        price: "",
        category: "",
        image: "",
        stock: 1,
        uid: "",
        username: "",
        wallet: ""
      });
    } else {
      setMsg("❌ " + data.error);
    }

    setLoading(false);
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

        <button
          onClick={login}
          style={{ width: "100%", padding: 15, marginTop: 10 }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h2>Admin Panel - Add Product</h2>

      <input name="name" placeholder="Name" value={form.name} onChange={change} style={s} />
      <textarea name="description" placeholder="Description" value={form.description} onChange={change} style={{ ...s, height: 80 }} />
      <input name="price" placeholder="Price" value={form.price} onChange={change} style={s} />
      <input name="category" placeholder="Category" value={form.category} onChange={change} style={s} />
      <input name="image" placeholder="Image URL" value={form.image} onChange={change} style={s} />
      <input name="stock" placeholder="Stock" value={form.stock} onChange={change} style={s} />

      <h3>Seller</h3>

      <input name="uid" placeholder="UID" value={form.uid} onChange={change} style={s} />
      <input name="username" placeholder="Username" value={form.username} onChange={change} style={s} />
      <input name="wallet" placeholder="Wallet" value={form.wallet} onChange={change} style={s} />

      <button onClick={addProduct} disabled={loading} style={btn}>
        {loading ? "Saving..." : "Add Product"}
      </button>

      {msg && <p>{msg}</p>}
    </div>
  );
}

const s = {
  width: "100%",
  padding: 10,
  marginTop: 10
};

const btn = {
  width: "100%",
  padding: 15,
  marginTop: 15
};
