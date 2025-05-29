import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import styles from "./product.module.css";
import shared from "../../shared.module.css"
import { CartContext } from "../Cart/cart";

const API_URL = "http://127.0.0.1:8000";

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
  if (!product) return <div className={styles.error}>Товар не найден</div>;

  const handleAddToCart = () => {
    if (quantity < 1) {
      alert("Количество должно быть не меньше 1");
      return;
    }
    addToCart(product, quantity);
    alert(`Добавлено ${quantity} шт. товара "${product.name}" в корзину`);
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

        <label className={styles.quantityLabel}>
          Количество:
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={styles.quantityInput}
          />
        </label>

        <button className={shared.defaultButton} style={{ padding: '3%', fontSize: '1.2rem' }} onClick={handleAddToCart}>
          Добавить в корзину
        </button>
      </div>
    </div>
  );
}