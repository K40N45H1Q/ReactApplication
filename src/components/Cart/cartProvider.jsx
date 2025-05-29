import React, { createContext, useState, useEffect } from "react";

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
      console.error("Ошибка загрузки корзины", e);
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
        throw new Error(error.detail || "Ошибка добавления в корзину");
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
        throw new Error(error.detail || "Ошибка удаления из корзины");
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