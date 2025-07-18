import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { Star, ShoppingCart, Heart, GitCompare } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';


const ProductCard = ({ product, showAddToCart = false, onAddToCart }) => {
  const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();
  const { user, token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

  useEffect(() => {
    fetchReviews();
  }, [product.id]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };


  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/reviews/product/${product.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log("response.data.summary", response.data.summary);
      setSummary(response.data.summary);
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      const result = addToWishlist(product);
      if (!result.success) {
        alert(result.message);
      }
    }
  };

  const handleAddToCompare = (e) => {
    e.preventDefault();
    const result = addToCompare(product);
    alert(result.message);
  };



  return (
    <Link to={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="relative aspect-w-1 aspect-h-1 w-full overflow-hidden bg-gray-200 group-hover:opacity-90 transition-opacity">
          <img
            src={product.image_url}
            alt={product.name}
            className="h-64 w-full object-cover object-center"
          />
          
          {/* Action buttons overlay */}
          <div className="absolute top-2 right-2 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleWishlistToggle}
              className={`p-2 mx-1 rounded-full shadow-md transition-colors ${
                isInWishlist(product.id)
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={handleAddToCompare}
              disabled={isInCompare(product.id)}
              className={`p-2 rounded-full shadow-md transition-colors ${
                isInCompare(product.id)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-500'
              }`}
            >
              <GitCompare className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">{summary && summary.average_rating ? summary.average_rating : '0.0'}</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
          
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-blue-900">
              LKR.{product.price}
            </span>
            
            {showAddToCart && (
              <button
                onClick={handleAddToCart}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add</span>
              </button>
            )}
          </div>
          
          <div className="mt-2">
            <span className="text-sm text-gray-500">
              {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;