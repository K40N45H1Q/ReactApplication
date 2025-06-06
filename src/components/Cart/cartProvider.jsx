import React, { createContext, useState, useEffect, useCallback } from "react";

const API_URL = "http://127.0.0.1:8000";

// Определяем USER_ID один раз при загрузке модуля
// Он будет числом, как и требуется
const USER_ID = (() => {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
    const telegramUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
    if (typeof telegramUserId === 'number') { 
      console.log("Telegram User ID initialized (const):", telegramUserId);
      return telegramUserId;
    }
  }
  console.warn("Telegram WebApp user ID or object not available, defaulting to bomb code.");
  return 7355608; // Код от бомбы из CS (DEFUSE) как число
})(); // Немедленно вызываемая функция для инициализации константы

export const CartContext = createContext();

export default function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 

  // fetchCart теперь не зависит от useState'овского userId, а от глобальной константы USER_ID
  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    try {
      // Используем константу USER_ID
      const res = await fetch(`${API_URL}/get_cart/${USER_ID}`); 
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Failed to load cart:", errorData.detail || res.statusText);
        setCart([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        const validCart = data.filter(item => item.price > 0 && item.id > 0);
        if (validCart.length !== data.length) {
          console.warn("Some cart items had price <= 0 or id <= 0 and were filtered out.");
        }
        setCart(validCart);
      } else {
        console.warn("API /get_cart/ returned non-array data:", data);
        setCart([]);
      }
    } catch (e) {
      console.error("Failed to load cart (network error or JSON parse error):", e);
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Зависимостей нет, так как USER_ID - глобальная константа

  // Загружаем корзину при монтировании компонента
  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // Зависимость только от fetchCart

  const addToCart = async (productId, quantity = 1) => {
    if (quantity <= 0) {
      alert("Quantity must be positive.");
      return;
    }
    setIsLoading(true);
    try {
      // Используем константу USER_ID
      const res = await fetch(
        `${API_URL}/add_to_cart/?user_id=${USER_ID}&product_id=${productId}&quantity=${quantity}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to add item to cart.");
      }
      await fetchCart();
      alert("Item added to cart!");
    } catch (e) {
      alert("Error adding to cart: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) { 
      await removeFromCart(productId, cart.find(item => item.id === productId)?.quantity || 1); 
      return;
    }
    setIsLoading(true);
    try {
      const currentItem = cart.find(item => item.id === productId);
      if (!currentItem) {
        throw new Error("Product not found in cart.");
      }
      
      const quantityDiff = newQuantity - currentItem.quantity;
      if (quantityDiff === 0) {
        setIsLoading(false);
        return;
      }

      const endpoint = quantityDiff > 0 ? "/add_to_cart/" : "/del_from_cart/";
      const method = quantityDiff > 0 ? "POST" : "DELETE";
      const quantityToSend = Math.abs(quantityDiff);

      const res = await fetch(
        `${API_URL}${endpoint}?user_id=${USER_ID}&product_id=${productId}&quantity=${quantityToSend}`,
        { method: method }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update item quantity.");
      }
      await fetchCart();
    } catch (e) {
      alert("Error updating quantity: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId, quantityToRemove) => {
    setIsLoading(true);
    try {
      const quantity = quantityToRemove || (cart.find(item => item.id === productId)?.quantity || 1); 

      const res = await fetch(
        `${API_URL}/del_from_cart/?user_id=${USER_ID}&product_id=${productId}&quantity=${quantity}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to remove item from cart.");
      }
      await fetchCart();
      alert("Item removed from cart!");
    } catch (e) {
      alert("Error removing from cart: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
        const res = await fetch(`${API_URL}/get_cart/${USER_ID}`);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Failed to fetch cart before clearing.");
        }
        const currentCart = await res.json();
        if (!Array.isArray(currentCart) || currentCart.length === 0) {
            setCart([]);
            return; 
        }

        for (const item of currentCart) {
            await fetch(
                `${API_URL}/del_from_cart/?user_id=${USER_ID}&product_id=${item.id}&quantity=${item.quantity}`,
                { method: "DELETE" }
            );
        }
        setCart([]);
        alert("Cart cleared!");
    } catch (e) {
        alert("Error clearing cart: " + e.message);
        console.error("Error clearing cart:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const initiatePayment = async () => {
    setIsLoading(true);
    try {
      if (!Array.isArray(cart) || cart.length === 0) {
        alert("Your cart is empty. Cannot create order.");
        return null;
      }

      const itemsForOrder = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        gender: item.gender,
        category: item.category,
        image_url: item.image_url,
        quantity: item.quantity
      }));

      const validItemsForOrder = itemsForOrder.filter(item => item.price > 0 && item.id > 0);

      if (validItemsForOrder.length === 0) {
        alert("No valid items in cart to create an order (prices must be > 0 and IDs > 0).");
        return null;
      }

      const totalCalculated = validItemsForOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const orderData = {
        user_id: USER_ID, // Используем константу USER_ID
        items: validItemsForOrder,
        total: totalCalculated,
        name: null, 
        telegram_username: null,
        address: null,
        postcode: null,
        city: null,
        country: null,
      };

      const response = await fetch(`${API_URL}/create_order/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail ? (Array.isArray(errorData.detail) ? errorData.detail.map(d => d.msg).join(", ") : errorData.detail) : "Unknown error";
        throw new Error(errorMessage);
      }

      const paymentData = await response.json();      
      await clearCart();
      return paymentData;
    } catch (error) {
      console.error("Payment error:", error);
      alert("Order creation failed: " + error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        addToCart, 
        removeFromCart, 
        updateQuantity,
        clearCart,
        initiatePayment,
        isLoading,
        USER_ID // Передаём константу USER_ID в контекст
      }}
    >
      {children}
    </CartContext.Provider>
  );
}