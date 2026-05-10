import { useState } from "react";
import { useNavigate } from "react-router-dom";

const categoryMap = {
  Electronics: [
    "Laptop",
    "Tablet",
    "Used Smartphone",
    "Digital Camera",
    "LED TV"
  ],
  "Home Appliances": [
    "Refrigerator",
    "Washing Machine",
    "Microwave Oven",
    "Air Conditioner"
  ],
  Furniture: [
    "Office Chair"
  ],
  "Musical Instruments": [
    "Electric Guitar"
  ],
  "Entertainment Systems": [
    "Home Theater System"
  ],
  "Accessories & Tools": [
    "Scooter Helmet",
    "Power Tools"
  ]
};

export default function CreateAuction() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    productName: "",
    startingPrice: "",
    endTime: "",
    reservePrice: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ================= HANDLE INPUT ================= */

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ================= IMAGE UPLOAD ================= */

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  /* ================= AI RESERVE SUGGEST ================= */

  const suggestReserve = () => {
    if (!form.startingPrice) return;

    const suggested = Math.floor(Number(form.startingPrice) * 1.1);

    setForm((prev) => ({
      ...prev,
      reservePrice: suggested,
    }));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      alert("Please upload an image");
      return;
    }

    setLoading(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      data.append(key, value)
    );
    data.append("image", imageFile);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auctions/create",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const result = await res.json();

      if (result.success) {
        alert("Auction Created Successfully!");
        navigate("/dashboard");
      } else {
        alert(result.message || "Failed to create auction");
      }
    } catch (error) {
      console.error("Create auction error:", error);
      alert("Error creating auction");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F0C29] via-[#1C0F3F] to-[#2A0845] text-white p-6">
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-xl shadow-2xl">
        
        {/* CLOSE BUTTON */}
        <button
          onClick={() => navigate("/dashboard")}
          className="absolute top-4 right-4 text-white text-xl hover:text-pink-300 transition"
        >
          ✕
        </button>

        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Create New Auction
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* IMAGE */}
          <div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="w-full"
            />

            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-4 rounded-xl h-48 object-contain bg-black/30 w-full"
              />
            )}
          </div>

          {/* TITLE */}
          <input
            type="text"
            name="title"
            placeholder="Item Title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
          />

          {/* DESCRIPTION */}
          <textarea
            name="description"
            placeholder="Item Description"
            value={form.description}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
          />

          {/* CATEGORY */}
          <select
            name="category"
            value={form.category}
            onChange={(e) => {
              const selectedCategory = e.target.value;
              setForm((prev) => ({
                ...prev,
                category: selectedCategory,
                productName: "",
              }));
            }}
            required
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
          >
            <option value="">Select Category</option>
            {Object.keys(categoryMap).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* PRODUCT NAME */}
          <select
            name="productName"
            value={form.productName}
            onChange={handleChange}
            disabled={!form.category}
            required
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10 disabled:opacity-60"
          >
            <option value="">Select Product</option>
            {form.category &&
              categoryMap[form.category].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
          </select>

          {/* STARTING PRICE */}
          <input
            type="number"
            name="startingPrice"
            placeholder="Starting Price"
            value={form.startingPrice}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
          />

          {/* END TIME */}
          <input
            type="datetime-local"
            name="endTime"
            value={form.endTime}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl bg-black/30 border border-white/10"
          />

          {/* RESERVE + AI */}
          <div className="flex gap-3">
            <input
              type="number"
              name="reservePrice"
              placeholder="Reserve Price (Optional)"
              value={form.reservePrice}
              onChange={handleChange}
              className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10"
            />

            <button
              type="button"
              onClick={suggestReserve}
              className="px-4 rounded-xl bg-purple-600 hover:scale-105 transition"
            >
              AI Suggest
            </button>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:scale-105 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex-1 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
