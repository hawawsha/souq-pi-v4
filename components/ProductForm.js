import { useState } from "react";
import ImageUploader from "./ImageUploader";

export default function ProductForm({ adminSecret, onAdded }) {
  const [loading, setLoading] = useState(false);

  const [imageUrl, setImageUrl] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: 1,
    uid: "",
    username: "",
    wallet: "",
  });

  function change(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function addProduct() {
    if (!imageUrl) {
      alert("Upload image first");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          images: [imageUrl],
          stock: Number(form.stock),
          seller: {
            uid: form.uid,
            username: form.username,
            walletAddress: form.wallet,
          },
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error);
        return;
      }

      alert("✅ Product Added");

      setForm({
        name: "",
        description: "",
        price: "",
        category: "",
        stock: 1,
        uid: "",
        username: "",
        wallet: "",
      });

      setImageUrl("");

      if (onAdded) {
        onAdded();
      }

    } catch (err) {
      console.error(err);
      alert("Failed");
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 10,
        marginBottom: 30,
      }}
    >
      <h2>Add Product</h2>

      <input
        name="name"
        placeholder="Name"
        value={form.name}
        onChange={change}
        style={input}
      />

      <textarea
        name="description"
        placeholder="Description"
        value={form.description}
        onChange={change}
        style={{
          ...input,
          height: 90,
        }}
      />

      <input
        name="price"
        placeholder="Price"
        value={form.price}
        onChange={change}
        style={input}
      />

      <input
        name="category"
        placeholder="Category"
        value={form.category}
        onChange={change}
        style={input}
      />

      <input
        name="stock"
        placeholder="Stock"
        value={form.stock}
        onChange={change}
        style={input}
      />

      <h3>Seller</h3>

      <input
        name="uid"
        placeholder="UID"
        value={form.uid}
        onChange={change}
        style={input}
      />

      <input
        name="username"
        placeholder="Username"
        value={form.username}
        onChange={change}
        style={input}
      />

      <input
        name="wallet"
        placeholder="Wallet Address"
        value={form.wallet}
        onChange={change}
        style={input}
      />

      <ImageUploader
        adminSecret={adminSecret}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
      />

      <button
        onClick={addProduct}
        disabled={loading}
        style={button}
      >
        {loading ? "Saving..." : "Add Product"}
      </button>
    </div>
  );
}

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const button = {
  width: "100%",
  marginTop: 20,
  padding: 14,
  background: "#00b894",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 16,
  cursor: "pointer",
};
