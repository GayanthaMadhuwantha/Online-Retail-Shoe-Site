import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CompareProvider } from './contexts/CompareContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Orders from './pages/Orders';
import About from './pages/About';
import Contact from './pages/Contact';
import Compare from './pages/Compare';
import Wishlist from './pages/Wishlist';
import Inventory from './pages/Inventory';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import CustomerManagement from './components/CustomerManagement';
import UserManagement from './components/UserManagement';
import OrderManagement from './components/OrderManagement';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <Router>
              <div className="min-h-screen bg-gray-50 flex flex-col">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pos" element={<POS />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/compare" element={<Compare />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/order-management" element={<OrderManagement />} />
                    <Route path="*" element={<div className="text-center text-gray-500 text-2xl mt-5 ">404 - Page Not Found</div>} />
                  </Routes>
                </main>
                <Footer />
                 <CookieConsent />
              </div>
            </Router>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App