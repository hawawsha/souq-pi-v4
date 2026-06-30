import { useState, useEffect } from "react";
import ImageUploader from "./ImageUploader";

export default function EditProductModal({
  product,
  adminSecret,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
  });

  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (!product) return;

    setForm({
      productId: product.productId,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      stock: product.stock,
    });

    setImageUrl(product.images?.[0] || "");
  }, [product]);

  function change(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function save() {
    setLoading(true);

    try {
      const res = await fetch("/api/admin/update-product", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({
          ...form,
          images: imageUrl ? [imageUrl] : [],
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error);
        setLoading(false);
        return;
      }

      alert("✅ Product Updated");

      onSaved();
      onClose();

    } catch (err) {
      console.error(err);
      alert("Update failed");
    }

    setLoading(false);
  }
 if (!product) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "90%",
          maxWidth: 600,
          padding: 20,
          borderRadius: 10,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <h2>Edit Product</h2>

        <input
          name="name"
          value={form.name}
          onChange={change}
          placeholder="Name"
          style={input}
        />

        <textarea
          name="description"
          value={form.description}
          onChange={change}
          placeholder="Description"
          style={{ ...input, height: 90 }}
        />

        <input
          name="price"
          value={form.price}
          onChange={change}
          placeholder="Price"
          style={input}
        />

        <input
          name="category"
          value={form.category}
          onChange={change}
          placeholder="Category"
          style={input}
        />

        <input
          name="stock"
          value={form.stock}
          onChange={change}
          placeholder="Stock"
          style={input}
        />

        <ImageUploader
          adminSecret={adminSecret}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
        />

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 20,
          }}
        >
          <button
            onClick={save}
            disabled={loading}
            style={{
              flex: 1,
              padding: 14,
              background: "#00b894",
              color: "#fff",
              border: "none",
              borderRadius: 6,
            }}
          >
            {loading ? "Saving..." : "Save"}
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 14,
              background: "#d63031",
              color: "#fff",
             
