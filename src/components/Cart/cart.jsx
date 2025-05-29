import React, { createContext, useState, useEffect, useContext } from "react";
import styles from "./cart.module.css";
import shared from "../../shared.module.css";
import { useNavigate } from "react-router-dom";

const API_URL = "https://reactapplicationbot-1.onrender.com";
const USER_ID = 1;

export const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cart, setCart] = useState([]);

  const fetchCart = async () => {
    try {
      const res = await fetch(`${API_URL}/get_cart/?user_id=${USER_ID}`);
      const data = await res.json();
      setCart(data);
    } catch (e) {
      console.error("Failed to load cart", e);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (product, quantity) => {
    try {
      const res = await fetch(
        `${API_URL}/add_to_cart/?user_id=${USER_ID}&product_id=${product.id}&quantity=${quantity}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to add to cart");
      }
      await fetchCart();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeFromCart = async (productId, quantity) => {
    try {
      const res = await fetch(
        `${API_URL}/del_from_cart/?user_id=${USER_ID}&product_id=${productId}&quantity=${quantity}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to remove from cart");
      }
      await fetchCart();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function Cart() {
  const navigate = useNavigate();
  const { cart, removeFromCart } = useContext(CartContext);

  if (cart.length === 0) {
    return <div className={styles.empty}>Your cart is empty</div>;
  }

  const totalSum = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = () => {
    navigate("/order");
  };

  return (
    <div className={styles.cart}>
      {cart.map(({ id, name, price, image_url, quantity }) => (
        <div key={id} className={styles.cartItem}>
          {image_url && (
            <img src={image_url} alt={name} className={styles.cartImage} />
          )}

          <div className={styles.cartItemContent}>
            <h4>{name}</h4>
            <p>Unit price: €{price}</p>
            <p>Quantity: {quantity}</p>
            <p><strong>Total: €{price * quantity}</strong></p>
          </div>

          <div className={styles.cartItemActions}>
            <button
              className={shared.defaultButton}
              onClick={() => removeFromCart(id, quantity)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className={styles.totalRow}>
        <h3 className={styles.totalSum}>Total: €{totalSum}</h3>
        <button
          className={`${shared.defaultButton} ${styles.checkoutBtn}`}
          onClick={handleCheckout}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
