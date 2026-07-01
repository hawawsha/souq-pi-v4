import { useState, useEffect } from "react";

import AdminLogin from "../components/AdminLogin";
import ProductForm from "../components/ProductForm";
import ProductList from "../components/ProductList";
import EditProductModal from "../components/EditProductModal";

export default function AdminPage() {
  const [logged, setLogged] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [products, setProducts] = useState([]);

  const [editingProduct, setEditingProduct] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();

      if (data.success) {
        setProducts(data.data.products || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (logged) {
      loadProducts();
    }
  }, [logged]);

  function handleLogin(secret) {
    setAdminSecret(secret);
    setLogged(true);
  }

  if (!logged) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "30px auto",
        padding: 20,
        background: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      <h1>Souq Pi Admin Panel</h1>

      <ProductForm
        adminSecret={adminSecret}
        onAdded={loadProducts}
      />

      <ProductList
        products={products}
        adminSecret={adminSecret}
        reloadProducts={loadProducts}
        onEdit={(product) => {
          setEditingProduct(product);
          setShowEdit(true);
        }}
      />

      {showEdit && (
        <EditProductModal
          product={editingProduct}
          adminSecret={adminSecret}
          onClose={() => setShowEdit(false)}
          onSaved={loadProducts}
        />
      )}
    </div>
  );
}
