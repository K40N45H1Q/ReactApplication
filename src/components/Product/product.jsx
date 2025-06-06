import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import styles from "./product.module.css";
import shared from "../../shared.module.css" // Предполагается, что shared.module.css содержит общие стили кнопок
import { CartContext } from '../Cart/cartProvider'; 

const API_URL = "https://reactapplicationbot.onrender.com";

export default function Product() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/get_product/${id}`);
        if (!res.ok) throw new Error(`Ошибка HTTP: ${res.status}`);
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        console.error("Ошибка загрузки товара:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <div className={styles.loading}>Загрузка товара...</div>;
  if (!product) return <div className={styles.error}>Товар не найдена</div>; // Исправлено "Товар не найден" на "Товар не найдена"

  const handleAddToCart = () => {
    if (quantity < 1) {
      alert("Количество должно быть не меньше 1");
      return;
    }
    addToCart(product.id, quantity); 
    alert(`Добавлено ${quantity} шт. товара "${product.name}" в корзину`);
  };

  const handleDecrementQuantity = () => {
    setQuantity(prevQuantity => Math.max(1, prevQuantity - 1));
  };

  const handleIncrementQuantity = () => {
    setQuantity(prevQuantity => prevQuantity + 1);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.productCard}>
        <h2 className={styles.productTitle}>{product.name}</h2>

        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className={styles.productImage}
          />
        )}

        <p className={styles.productPrice}>
          <strong>Цена:</strong> €{product.price}
        </p>

        <div className={styles.quantityControl}>
            <button
                className={styles.quantityButton}
                onClick={handleDecrementQuantity}
                disabled={quantity <= 1}
            >
                –
            </button>
            <span className={styles.quantityDisplay}>{quantity}</span>
            <button
                className={styles.quantityButton}
                onClick={handleIncrementQuantity}
            >
                +
            </button>
        </div>

        {/* --- ВОССТАНОВЛЕН ИСХОДНЫЙ СТИЛЬ КНОПКИ --- */}
        <button
          className={shared.defaultButton} // Используем только shared.defaultButton
          style={{ padding: '3%', fontSize: '1.2rem' }} // Твои inline-стили остаются
          onClick={handleAddToCart}
        >
          Добавить в корзину
        </button>
        {/* ------------------------------------------- */}
      </div>
    </div>
  );
}