import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import styles from "./order.module.css";
import shared from "../../shared.module.css";

const API_URL = "http://127.0.0.1:8000"; // Убедитесь, что это правильный URL вашего FastAPI бэкенда

export default function OrderPage() {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    telegram_username: "",
    address: "",
    postcode: "",
    city: "",
    country: "",
  });
  const [orderStatusConfirmedPaid, setOrderStatusConfirmedPaid] = useState(false);
  const [initialOrderDetails, setInitialOrderDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Состояние для проверки заполненности формы
  // Все поля должны быть непустыми.
  const isFormValid = Object.values(form).every(value => value.trim() !== "");

  useEffect(() => {
    if (!orderId) {
      alert("Invalid access to delivery details page. Order ID is missing.");
      navigate('/');
      return;
    }

    const verifyOrderStatus = async () => {
        setIsLoading(true);
        try {
            setError(null); // Сброс ошибки при каждой попытке
            const res = await fetch(`${API_URL}/get_order_details/${orderId}`);
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to fetch initial order details.");
            }
            const data = await res.json();
            setInitialOrderDetails(data);

            if (data.status !== 'paid') {
                alert("Order not paid! Please pay for the order first.");
                navigate(`/payment/${orderId}`);
            } else {
                setOrderStatusConfirmedPaid(true);
                // Заполняем форму, если данные уже есть в заказе (например, если пользователь вернулся)
                setForm(prevForm => ({
                    ...prevForm,
                    name: data.name || prevForm.name || "",
                    telegram_username: data.telegram_username || prevForm.telegram_username || "",
                    address: data.address || prevForm.address || "",
                    postcode: data.postcode || prevForm.postcode || "",
                    city: data.city || prevForm.city || "",
                    country: data.country || prevForm.country || "",
                }));
            }
        } catch (err) {
            console.error("Error verifying order status:", err);
            setError(err.message);
            alert("Error verifying order status: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Если статус "paid" уже передан через navigate.state,
    // мы можем предположить, что заказ оплачен, но все равно перепроверить с бэкендом.
    if (location.state && location.state.orderStatus === 'paid') {
        console.log("Order status confirmed 'paid' from location.state. Verifying with backend.");
        setOrderStatusConfirmedPaid(true); // Предварительно устанавливаем статус, чтобы не показывать "Processing" слишком долго
        verifyOrderStatus();
    } else {
        // Если нет информации из location.state, всегда проверяем статус.
        verifyOrderStatus();
    }
  }, [orderId, navigate, location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!orderStatusConfirmedPaid) {
        alert("Please wait for payment confirmation to proceed.");
        setIsLoading(false);
        return;
    }

    if (!isFormValid) {
        alert("Please fill in all delivery details before submitting.");
        setIsLoading(false);
        return;
    }

    const deliveryData = {
      order_id: orderId,
      ...form, // Расширяем все поля формы
    };

    try {
      const res = await fetch(`${API_URL}/update_order_delivery/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData),
      });

      if (res.ok) {
        alert("Delivery details submitted successfully! Admin will contact you soon.");
        navigate('/'); // Перенаправляем на главную страницу после успешной отправки
      } else {
        const err = await res.json();
        // Улучшенная обработка ошибок для читаемости
        const errorMessage = err.detail ? (Array.isArray(err.detail) ? err.detail.map(d => d.msg).join(", ") : err.detail) : "Unknown error";
        alert("Error submitting delivery details: " + errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      alert("Network error submitting delivery details: " + error.message);
      console.error("Network error submitting delivery form:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!orderStatusConfirmedPaid || isLoading) {
      return (
        <div className={`${styles.orderPage} ${shared.wrapper}`}>
            <p>{isLoading ? "Processing..." : "Verifying order payment status..."}</p>
            {error && <p className={styles.error}>Error: {error}</p>}
        </div>
      );
  }

  return (
    <div className={`${styles.orderPage} ${shared.wrapper}`}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.title}>Enter Delivery Details</h2>
        <p className={styles.status}>
          Your Order ID: <strong>{orderId}</strong> <strong style={{ color: 'green' }}>paid! ✅</strong>
        </p>

        {initialOrderDetails && (
            <div className={styles.cartSummary}>
                <h3>Order Contents:</h3>
                {/* Убедитесь, что initialOrderDetails.items является массивом и не пуст */}
                {initialOrderDetails.items && initialOrderDetails.items.length > 0 ? (
                    initialOrderDetails.items.map((item, index) => (
                        <p key={index}>{item.name} x {item.quantity} = €{(item.price * item.quantity).toFixed(2)}</p>
                    ))
                ) : (
                    <p>No items in this order. That's weird, damn it.</p>
                )}
                <p className={styles.totalSum}>Total Sum: <strong>€{initialOrderDetails.total ? initialOrderDetails.total.toFixed(2) : '0.00'}</strong></p>
            </div>
        )}

        <input
          name="name"
          placeholder="Your Full Name"
          value={form.name}
          onChange={handleChange}
          required // Делаем поле обязательным
          className={styles.input}
        />

        <input
          name="telegram_username"
          placeholder="Telegram: "
          value={form.telegram_username}
          onChange={handleChange}
          required // Делаем поле обязательным
          className={styles.input}
        />

        <input
          name="country"
          placeholder="Country"
          value={form.country}
          onChange={handleChange}
          required // Делаем поле обязательным
          className={styles.input}
        />

        <input
          name="city"
          placeholder="City"
          value={form.city}
          onChange={handleChange}
          required // Делаем поле обязательным
          className={styles.input}
        />

        <input
          name="address"
          placeholder="Delivery Address (Street, House, Apartment)"
          value={form.address}
          onChange={handleChange}
          required // Делаем поле обязательным
          className={styles.input}
        />

        <input
          name="postcode"
          placeholder="Postal Code"
          value={form.postcode}
          onChange={handleChange}
          required // Делаем поле обязательным
          className={styles.input}
        />

        <button
            type="submit"
            className={shared.defaultButton}
            style={{ width: '100%', padding: '12px' }}
            disabled={isLoading || !isFormValid} // Кнопка неактивна, пока идет загрузка или форма не заполнена
        >
          {isLoading ? "Submitting..." : "Submit Delivery Details"}
        </button>
      </form>
    </div>
  );
}