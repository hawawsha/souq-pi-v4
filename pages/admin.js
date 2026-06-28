import { useState } from "react";

export default function Admin() {
  const [secret, setSecret] = useState("");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  async function login() {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secret
      })
    });

    const data = await res.json();

    if (data.success) {
      setLogged(true);
    } else {
      alert("Wrong secret");
    }
  }

  async function uploadImage(e) {
    const file = e.target.files[0];

    if (!file) return;

    setUploading(true);

    const body = new FormData();
    body.append("image", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-secret": secret
        },
        body
      });

      const data = await res.json();

      if (data.success) {
        setForm((old) => ({
          ...old,
          image: data.image.url
        }));
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Upload failed");
    }

    setUploading(false);
  }

  async function addProduct() {
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
      setMsg("✅ Product Added");

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
  }

  if (!logged) {
    return (
      <div
        style={{
          maxWidth: 400,
          margin: "80px auto"
        }}
      >
        <h2>Admin Login</h2>

        <input
          type="password"
          placeholder="Admin Secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{
            width: "100%",
            padding: 12
          }}
        />

        <button
          onClick={login}
          style={{
            width: "100%",
            padding: 15,
            marginTop: 10
          }}
        >
          Login
        </button>
      </div>
    );
  }  return (
    <div
      style={{
        maxWidth: 650,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h2>Admin Panel - Add Product</h2>

      <input
        name="name"
        placeholder="Product Name"
        value={form.name}
        onChange={change}
        style={s}
      />

      <textarea
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={change}
        style={{
          ...s,
          height: 100,
        }}
      />

      <input
        name="price"
        placeholder="Price (PI)"
        value={form.price}
        onChange={change}
        style={s}
      />

      <input
        name="category"
        placeholder="Category"
        value={form.category}
        onChange={change}
        style={s}
      />

      <input
        name="stock"
        placeholder="Stock"
        value={form.stock}
        onChange={change}
        style={s}
      />

      <hr style={{ margin: "20px 0" }} />

      <h3>Product Image</h3>

      <input
        type="file"
        accept="image/*"
        onChange={uploadImage}
        style={s}
      />

      {uploading && (
        <p>Uploading image...</p>
      )}

      {form.image && (
        <>
          <img
            src={form.image}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: 250,
              objectFit: "cover",
              borderRadius: 10,
              marginTop: 15,
            }}
          />

          <input
            value={form.image}
            readOnly
            style={s}
          />
        </>
      )}

      <hr style={{ margin: "20px 0" }} />

      <h3>Seller Information</h3>

      <input
        name="uid"
        placeholder="Seller UID"
        value={form.uid}
        onChange={change}
        style={s}
      />

      <input
        name="username"
        placeholder="Seller Username"
        value={form.username}
        onChange={change}
        style={s}
      />

      <input
        name="wallet"
        placeholder="Wallet Address"
        value={form.wallet}
        onChange={change}
        style={s}
      />

      <button
        disabled={loading || uploading}
        onClick={addProduct}
        style={btn}
      >
        {loading
          ? "Saving..."
          : uploading
          ? "Uploading..."
          : "Add Product"}
      </button>

      {msg && (
        <p
          style={{
            marginTop: 20,
            fontWeight: "bold",
          }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

const s = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 6,
  border: "1px solid #ccc",
  boxSizing: "border-box",
};

const btn = {
  width: "100%",
  padding: 15,
  marginTop: 20,
  border: "none",
  borderRadius: 8,
  background: "#1b74e4",
  color: "#fff",
  fontSize: 16,
  cursor: "pointer",
};
