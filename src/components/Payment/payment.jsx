import "./payment.css";
import React, { useEffect, useState, useRef, useCallback } from "react"; // Добавлен useCallback
import { useParams, useLocation, useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";
const CHECK_INTERVAL = 10000; // Check status every 10 seconds (10000 ms)

export default function Payment() {
    const { id: orderIdFromParams } = useParams(); // Order ID from URL (now a string/UUID)
    const location = useLocation();
    const navigate = useNavigate();

    const [paymentDetails, setPaymentDetails] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState("pending");
    const [isLoadingPaymentStatus, setIsLoadingPaymentStatus] = useState(false);

    const orderIdRef = useRef(orderIdFromParams);
    const paymentAddressRef = useRef(null);
    const paymentAmountRef = useRef(null);

    // Добавим fetchOrderDetails в useCallback, так как он используется в useEffect
    const fetchOrderDetails = useCallback(async (id) => {
        setIsLoadingPaymentStatus(true); // Установим флаг загрузки
        try {
            const res = await fetch(`${API_URL}/get_order_details/${id}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Failed to fetch order details by ID.");
            }
            const data = await res.json();
            console.log("Fetched order details for payment:", data);

            if (data.id && data.payment_address && data.payment_amount !== undefined) {
                setPaymentDetails({
                    orderId: data.id,
                    paymentAddress: data.payment_address,
                    paymentAmount: data.payment_amount,
                    currency: data.currency || 'BTC' // Убедимся, что валюта тоже передается, если есть
                });
                orderIdRef.current = data.id;
                paymentAddressRef.current = data.payment_address;
                paymentAmountRef.current = data.payment_amount;
                setPaymentStatus(data.status); // Set initial status from fetched data
            } else {
                throw new Error("Missing critical payment details from fetched data.");
            }
        } catch (error) {
            console.error("Error fetching payment details for existing order:", error);
            alert("Failed to load order details for payment. " + error.message);
            navigate('/');
        } finally {
            setIsLoadingPaymentStatus(false); // Сбросим флаг загрузки
        }
    }, [navigate]); // navigate стабилен, можно добавить в зависимости

    useEffect(() => {
        if (location.state && location.state.orderId) {
            console.log("Initializing paymentDetails from location.state:", location.state);
            setPaymentDetails(location.state);
            orderIdRef.current = location.state.orderId;
            paymentAddressRef.current = location.state.paymentAddress;
            paymentAmountRef.current = location.state.paymentAmount;
            // Установим начальный статус из location.state, если он есть, иначе pending
            setPaymentStatus(location.state.status || "pending"); 
        } else if (orderIdFromParams) {
            console.warn(`No payment details in state. Attempting to fetch order ${orderIdFromParams} from backend.`);
            fetchOrderDetails(orderIdFromParams); // Вызываем обёрнутую функцию
        } else {
            console.error("No order ID or payment details available to display payment page.");
            alert("Invalid access to payment page. Please start from the cart.");
            navigate('/');
            return;
        }
    }, [location.state, orderIdFromParams, navigate, fetchOrderDetails]); // Добавлен fetchOrderDetails в зависимости

    useEffect(() => {
        let intervalId;

        const checkPaymentStatus = async () => {
            if (!orderIdRef.current) {
                console.warn("No orderId available for status check.");
                return false;
            }

            setIsLoadingPaymentStatus(true);
            try {
                const res = await fetch(`${API_URL}/check_payment/${orderIdRef.current}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.detail || "Failed to check payment status.");
                }
                const data = await res.json();
                console.log("Payment status check response:", data);

                setPaymentStatus(data.status);
                
                if (data.status === "paid") {
                    alert("Payment confirmed! Now fill in delivery details.");
                    navigate(`/order/${orderIdRef.current}`, { state: { orderStatus: 'paid' } }); 
                    return true;
                }
                // Если статус не paid, но и не pending (например, "unpaid"), продолжаем проверять
                return false; 
            } catch (error) {
                console.error("Error checking payment status:", error);
                setPaymentStatus("failed"); 
                return true; // Stop checking on error
            } finally {
                setIsLoadingPaymentStatus(false);
            }
        };

        // Запускаем проверку статуса, если paymentDetails загружены и статус не "paid" и не "failed"
        if (paymentDetails && paymentStatus !== "paid" && paymentStatus !== "failed") {
            checkPaymentStatus(); // Проверяем немедленно при первом запуске или изменении зависимостей
            intervalId = setInterval(async () => {
                const finished = await checkPaymentStatus();
                if (finished) {
                    clearInterval(intervalId);
                }
            }, CHECK_INTERVAL);
        }

        // Очистка интервала при размонтировании компонента или изменении зависимостей
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [paymentDetails, paymentStatus, navigate]); // Зависимости от paymentDetails и paymentStatus

    if (!paymentDetails) {
        return <div className="wrapper">Loading payment details...</div>;
    }

    return (
        <div className="wrapper">
            <h1 className="title">Bitcoin Payment</h1>
            {/* DEBUG: Выводим текущий статус для отладки */}
            {/* <p>DEBUG: Current Payment Status: {paymentStatus}</p> */}

            {/* Отображаем инструкции по оплате, если статус "pending" или "unpaid" */}
            { (paymentStatus === "pending" || paymentStatus === "unpaid") && ( 
                <>
                    <p className="instruction">
                        Please send <strong>{paymentDetails.paymentAmount ? paymentDetails.paymentAmount.toFixed(8) : '...'} BTC</strong> to the address below for Order ID: <strong>{paymentDetails.orderId}</strong>
                    </p>
                    <div className="address-box">
                        <code>{paymentDetails.paymentAddress || 'Loading address...'}</code>
                    </div>
                    <p className="note">⚠️ Make sure you send from a wallet supporting Bitcoin. Be aware of network fees. The total is calculated based on EUR. This amount includes a small buffer for potential price fluctuations. Your order status will update after payment confirmation.</p>
                    {isLoadingPaymentStatus ? (
                        <p className="status-message loading">Checking payment status...</p>
                    ) : (
                        <p className="status-message pending">
                           {paymentStatus === "pending" ? "Awaiting Payment..." : "Payment is awaiting confirmation..."}
                        </p>
                    )}
                </>
            )}
            {paymentStatus === "paid" && (
                <div className="payment-success">
                    <h2 className="success-title">Payment Confirmed! ✅</h2>
                    <p>Your Order ID: <strong>{paymentDetails.orderId}</strong> has been successfully paid.</p>
                    <p>Redirecting you to the delivery details page...</p>
                </div>
            )}
            {paymentStatus === "failed" && (
                <div className="payment-failure">
                    <h2 className="failure-title">Payment Error ❌</h2>
                    <p>Failed to verify payment status. Please try again or contact support.</p>
                    <button onClick={() => window.location.reload()}>Try Again</button>
                </div>
            )}
        </div>
    );
}