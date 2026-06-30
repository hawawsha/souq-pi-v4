import { useState } from "react";

export default function ImageUploader({
  adminSecret,
  imageUrl,
  setImageUrl,
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadImage(e) {
    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploading(true);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-secret": adminSecret,
        },
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error);
        return;
      }

      setImageUrl(data.image.url);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginTop: 15 }}>
      <label
        style={{
          display: "block",
          marginBottom: 8,
          fontWeight: "bold",
        }}
      >
        Product Image
      </label>

      <input
        type="file"
        accept="image/*"
        onChange={uploadImage}
      />

      {uploading && (
        <p>Uploading image...</p>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Preview"
          style={{
            width: 220,
            marginTop: 15,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />
      )}
    </div>
  );
}
