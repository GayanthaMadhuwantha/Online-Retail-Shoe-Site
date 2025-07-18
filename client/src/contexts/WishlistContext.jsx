import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

const WishlistContext = createContext();

const wishlistReducer = (state, action) => {
  switch (action.type) {
    case 'SET_WISHLIST':
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
    case 'CLEAR_WISHLIST':
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

export const WishlistProvider = ({ children }) => {
  const [state, dispatch] = useReducer(wishlistReducer, {
    items: [],
    loading: false
  });

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      dispatch({ type: 'CLEAR_WISHLIST' });
    }
  }, [user]);

  const loadWishlist = () => {
    const savedWishlist = localStorage.getItem(`wishlist_${user.id}`);
    if (savedWishlist) {
      dispatch({ type: 'SET_WISHLIST', payload: JSON.parse(savedWishlist) });
    } else {
      dispatch({ type: 'SET_WISHLIST', payload: [] });
    }
  };

  const saveWishlist = (items) => {
    if (user) {
      localStorage.setItem(`wishlist_${user.id}`, JSON.stringify(items));
    }
  };

  const addToWishlist = (product) => {
    if (!user) return { success: false, message: 'Please login to add items to wishlist' };

    const isAlreadyInWishlist = state.items.some(item => item.id === product.id);
    if (isAlreadyInWishlist) {
      return { success: false, message: 'Item already in wishlist' };
    }

    const newItems = [...state.items, product];
    dispatch({ type: 'ADD_ITEM', payload: product });
    saveWishlist(newItems);
    return { success: true, message: 'Item added to wishlist' };
  };

  const removeFromWishlist = (productId) => {
    const newItems = state.items.filter(item => item.id !== productId);
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
    saveWishlist(newItems);
  };

  const isInWishlist = (productId) => {
    return state.items.some(item => item.id === productId);
  };

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
    if (user) {
      localStorage.removeItem(`wishlist_${user.id}`);
    }
  };

  return (
    <WishlistContext.Provider value={{
      ...state,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};