import { useState } from "react";

export default function AdminLogin({ onLogin }) {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!secret) {
      alert("Enter Admin Secret");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ secret }),
      });

      const data = await res.json();

      if (data.success) {
        onLogin(secret);
      } else {
        alert(data.error || "Wrong Admin Secret");
      }
    } catch (err) {
      alert("Login failed");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "80px auto",
        background: "#fff",
        padding: 25,
        borderRadius: 12,
        boxShadow: "0 2px 15px rgba(0,0,0,.15)",
      }}
    >
      <h2>🔐 Admin Login</h2>

      <input
        type="password"
        placeholder="Admin Secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          marginTop: 15,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      <button
        onClick={login}
        disabled={loading}
        style={{
          width: "100%",
          marginTop: 15,
          padding: 14,
          border: "none",
          borderRadius: 8,
          background: "#4CAF50",
          color: "#fff",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
