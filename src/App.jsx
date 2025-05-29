import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import Header from "./components/Header/Header";
import Catalog from "./components/Catalog/catalog";
import CartProvider, { Cart } from "./components/Cart/cart"; // CartProvider — default, Cart — именованный экспорт
import Product from "./components/Product/product";
import OrderPage from "./components/Order/order";

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/order" element={<OrderPage />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;