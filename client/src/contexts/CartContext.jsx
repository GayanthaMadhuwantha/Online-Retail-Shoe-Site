import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();
const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CART':
      return {
        ...state,
        items: action.payload,
        loading: false
      };
    case 'ADD_ITEM':
      return {
        ...state,
        items: [...state.items, action.payload]
      };
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };
    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    loading: false
  });

  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      fetchCart();
    }
  }, [user, token]);

  const fetchCart = async () => {
    if (!token) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch(`${BASE_URL}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: 'SET_CART', payload: data });
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addToCart = async (productId, size, quantity) => {
    if (!token) return { success: false, message: 'Please login to add items to cart' };

    try {
      const response = await fetch(`${BASE_URL}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId, size, quantity })
      });

      const data = await response.json();

      if (response.ok) {
        fetchCart(); // Refresh cart
        return { success: true, message: 'Item added to cart' };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Failed to add item to cart' };
    }
  };

  const removeFromCart = async (itemId) => {
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/api/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        dispatch({ type: 'REMOVE_ITEM', payload: itemId });
      }
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getCartTotal = () => {
    return state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      ...state,
      addToCart,
      removeFromCart,
      clearCart,
      getCartTotal,
      getCartCount,
      fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};