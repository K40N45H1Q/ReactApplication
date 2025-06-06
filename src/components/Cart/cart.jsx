import React, { useContext } from "react";
import styles from "./cart.module.css";
import shared from "../../shared.module.css";
import { useNavigate } from "react-router-dom";
import { CartContext } from "./cartProvider";

// URL бэкенда не нужен здесь, он уже в CartProvider

export function Cart() {
  const navigate = useNavigate();
  const {
    cart,
    initiatePayment,
    isLoading,
    // clearCart // clearCart больше не вызывается здесь после checkout
  } = useContext(CartContext);

  if (!Array.isArray(cart)) {
    return <div className={styles.empty}>Error: Cart data is corrupted. Please refresh or contact support.</div>;
  }

  if (cart.length === 0) {
    return <div className={styles.empty}>Your cart is empty.</div>;
  }

  const totalSum = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty! Add products to proceed to checkout.");
      navigate('/');
      return;
    }

    const paymentData = await initiatePayment();

    if (paymentData && paymentData.id) {
      alert("Order created! Proceeding to payment.");
      
      // !!! ВЫЗОВ clearCart() УБРАН ОТСЮДА !!!
      // Корзина теперь будет очищена на бэкенде только после фактической оплаты.
      // Состояние фронтенда обновится при следующем fetchCart (например, при повторном заходе в корзину).
      // Если вы хотите *визуально* очистить корзину сразу, не удаляя её на бэкенде,
      // можете использовать setCart([]) напрямую здесь, но это будет временная рассинхронизация.
      // Например: setCart([]); // Если у вас есть прямой доступ к setCart из провайдера

      navigate(`/payment/${paymentData.id}`, {
        state: {
          orderId: paymentData.id,
          paymentAddress: paymentData.payment_address,
          paymentAmount: paymentData.payment_amount,
          currency: 'BTC'
        }
      });
    } else {
      // initiatePayment уже выводит alert при ошибке.
    }
  };

  return (
    <div className={styles.cart}>
      {cart.map(({ id, name, price, image_url, quantity }) => (
        <div key={id} className={styles.cartItem}>
          <div className={styles.cartImageWrapper}>
            {image_url && (
              <img src={image_url} alt={name} className={styles.cartImage} />
            )}
          </div>

          <div className={styles.cartItemContent}>
            <h4>{name}</h4>
            <p>Unit price: €{price.toFixed(2)}</p>
            <p>Quantity: {quantity}</p>
            <p>
              <strong>Total: €{(price * quantity).toFixed(2)}</strong>
            </p>
          </div>
        </div>
      ))}

      <div className={styles.totalRow}>
        <h3 className={styles.totalSum}>Total: €{totalSum.toFixed(2)}</h3>
        <button
          className={`${shared.defaultButton} ${styles.checkoutBtn}`}
          onClick={handleCheckout}
          disabled={cart.length === 0 || isLoading}
        >
          {isLoading ? "Processing..." : "Checkout"}
        </button>
      </div>
    </div>
  );
}