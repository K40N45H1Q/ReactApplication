import { useState, useContext } from "react";
import { CartContext } from "../Cart/cart";
import styles from "./order.module.css";
import Catalog from "../Catalog/catalog";  // <-- исправлено
import shared from "../../shared.module.css"

export default function OrderPage() {
  const { cart } = useContext(CartContext);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    postcode: "",
    city: "",
    country: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const orderData = {
      ...form,
      user_id: 1,
      items: cart,
      total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };

    try {
      const res = await fetch("https://reactapplicationbot-1.onrender.com/create_order/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (res.ok) {
        alert("Order submitted successfully!");
      } else {
        const err = await res.json();
        alert("Error: " + err.detail);
      }
    } catch (error) {
      alert("Network error: " + error.message);
    }
  };

  return (
    <>
      <div className={styles.orderPage}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Place Your Order</h2>

          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
            className={styles.input}
          />

          <input
            name="phone"
            type="hidden"
            value={form.phone}
            readOnly
          />

          <input
            name="country"
            placeholder="Country"
            value={form.country}
            onChange={handleChange}
            required
            className={styles.input}
          />

          <input
            name="city"
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            required
            className={styles.input}
          />

          <input
            name="address"
            placeholder="Address"
            value={form.address}
            onChange={handleChange}
            required
            className={styles.input}
          />

          <input
            name="postcode"
            placeholder="Postal code"
            value={form.postcode}
            onChange={handleChange}
            required
            className={styles.input}
          />

          <button type="submit" className={shared.defaultButton} style={{ width: '100%', padding: '12px' }}>
            Submit Order
          </button>
        </form>
      </div>
      <Catalog />
    </>
  );
}
