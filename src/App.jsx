import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import "./App.css";
import Header from "./components/Header/Header";
import Catalog from "./components/Catalog/catalog";
import CartProvider from './components/Cart/cartProvider';
import { Cart } from './components/Cart/cart';
import Product from "./components/Product/product";

import OrderPage from "./components/Order/order"; 
import Payment from "./components/Payment/payment"; 

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
            
            {/* ID is now expected as a string/UUID */}
            <Route path="/payment/:id" element={<Payment />} /> 
            <Route path="/order/:id" element={<OrderPage />} /> 

          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;