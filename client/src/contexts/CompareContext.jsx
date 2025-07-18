import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CompareContext = createContext();

const compareReducer = (state, action) => {
  switch (action.type) {
    case 'SET_COMPARE':
      return {
        ...state,
        items: action.payload
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
    case 'CLEAR_COMPARE':
      return {
        ...state,
        items: []
      };
    default:
      return state;
  }
};

export const CompareProvider = ({ children }) => {
  const [state, dispatch] = useReducer(compareReducer, {
    items: []
  });

  useEffect(() => {
    const savedCompare = localStorage.getItem('compare_items');
    if (savedCompare) {
      dispatch({ type: 'SET_COMPARE', payload: JSON.parse(savedCompare) });
    }
  }, []);

  const saveCompare = (items) => {
    localStorage.setItem('compare_items', JSON.stringify(items));
  };

  const addToCompare = (product) => {
    if (state.items.length >= 4) {
      return { success: false, message: 'You can compare maximum 4 products' };
    }

    const isAlreadyInCompare = state.items.some(item => item.id === product.id);
    if (isAlreadyInCompare) {
      return { success: false, message: 'Product already in compare list' };
    }

    const newItems = [...state.items, product];
    dispatch({ type: 'ADD_ITEM', payload: product });
    saveCompare(newItems);
    return { success: true, message: 'Product added to compare' };
  };

  const removeFromCompare = (productId) => {
    const newItems = state.items.filter(item => item.id !== productId);
    dispatch({ type: 'REMOVE_ITEM', payload: productId });
    saveCompare(newItems);
  };

  const isInCompare = (productId) => {
    return state.items.some(item => item.id === productId);
  };

  const clearCompare = () => {
    dispatch({ type: 'CLEAR_COMPARE' });
    localStorage.removeItem('compare_items');
  };

  return (
    <CompareContext.Provider value={{
      ...state,
      addToCompare,
      removeFromCompare,
      isInCompare,
      clearCompare
    }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};