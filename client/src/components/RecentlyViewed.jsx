import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import { recentlyViewed, cookieConsent } from '../utils/cookies';
import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

const RecentlyViewed = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const consent = cookieConsent.hasConsent() && cookieConsent.canUse('functional');
    setHasConsent(consent);
    
    if (consent) {
      fetchRecentlyViewed();
    }
  }, []);

  const fetchRecentlyViewed = async () => {
    const productIds = recentlyViewed.get();
    if (productIds.length === 0) return;

    setLoading(true);
    try {
      const productPromises = productIds.map(id => 
        axios.get(`${BASE_URL}/api/products/${id}`).catch(() => null)
      );
      const responses = await Promise.all(productPromises);
      const validProducts = responses
        .filter(response => response !== null)
        .map(response => response.data);
      
      setProducts(validProducts);
    } catch (error) {
      console.error('Error fetching recently viewed products:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearRecentlyViewed = () => {
    recentlyViewed.clear();
    setProducts([]);
  };

  if (!hasConsent || products.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recently Viewed
        </h2>
        <button
          onClick={clearRecentlyViewed}
          className="text-slate-500 hover:text-slate-700 transition-colors"
          title="Clear recently viewed"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex space-x-4 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-32">
              <div className="bg-slate-200 h-32 rounded-lg animate-pulse mb-2"></div>
              <div className="bg-slate-200 h-4 rounded animate-pulse mb-1"></div>
              <div className="bg-slate-200 h-3 rounded animate-pulse w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex space-x-4 overflow-x-auto">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/products/${product.id}`}
              className="flex-shrink-0 w-32 group"
            >
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-200"
              />
              <h3 className="text-sm font-medium text-slate-800 mt-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                {product.name}
              </h3>
              <p className="text-sm text-amber-600 font-semibold">
                ${product.price.toFixed(2)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentlyViewed;