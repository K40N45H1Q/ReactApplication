import React from "react";
import { useLocation } from "react-router-dom";
import styles from "./orderSuccess.module.css";

export default function OrderSuccess() {
  const location = useLocation();
  const orderId = location.state?.orderId;

  return (
    <div className={styles.container}>
      <h2>Order Confirmed!</h2>
      <p>Thank you for your purchase.</p>
      {orderId && <p>Your order ID: {orderId}</p>}
      <p>We'll process your order and send you a confirmation soon.</p>
    </div>
  );
}