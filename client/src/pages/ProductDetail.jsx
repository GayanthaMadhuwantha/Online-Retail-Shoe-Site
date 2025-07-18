import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useCompare } from '../contexts/CompareContext';
import { Star, ShoppingCart, ArrowLeft, Heart, Share2, GitCompare } from 'lucide-react';
import { recentlyViewed, analytics } from '../utils/cookies';
import ProductReviews from '../components/ProductReviews';
import axios from 'axios';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, token } = useAuth();
  const { addToWishlist, isInWishlist, removeFromWishlist } = useWishlist();
  const { addToCompare, isInCompare } = useCompare();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [sizes, setSizes] = useState([]);
  const [sizeQuantity, setSizeQuantity] = useState(0);
  const [sizeData, setSizeData] = useState([]);
  const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    fetchSizes();
  }, [id]);

  // Update sizeQuantity whenever selectedSize changes
  useEffect(() => {
    if (selectedSize && sizeData.length > 0) {
      const selected = sizeData.find(s => s.size === selectedSize);
      setSizeQuantity(selected ? selected.quantity : 0);
    }
  }, [selectedSize, sizeData]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/${id}`);
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/reviews/product/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setReviews(response.data.reviews);
      setSummary(response.data.summary);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSizes = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products/sizes/${id}`);
      const data = await response.json();
      setSizes(data.map(size => size.size));
      setSizeData(data); // Save all size/quantity pairs
      // Set initial size quantity if a size is already selected
      if (selectedSize) {
        const selected = data.find(s => s.size === selectedSize);
        setSizeQuantity(selected ? selected.quantity : 0);
      }
    } catch (error) {
      console.error('Failed to fetch sizes:', error);
    }
  };

  //checks when increase size quantity  exist or not
  const handleIncreaseQuantity = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    // Find the selected size's available quantity
    const selected = sizeData.find(s => s.size === selectedSize);
    const available = selected ? selected.quantity : 0;
    if (quantity < available) {
      setQuantity(quantity + 1);
    } else {
      alert('No more stock available for this size.');
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!selectedSize) {
      alert('Please select a size');
      return;
    }

    setAdding(true);
    const result = await addToCart(product.id, selectedSize, quantity);
    
    if (result.success) {
      setSizeQuantity(sizeQuantity - quantity);
      alert('Product added to cart!');
    } else {
      alert(result.message || 'Failed to add product to cart');
    }
    
    setAdding(false);
  };

  const handleWishlistToggle = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      const result = addToWishlist(product);
      alert(result.message);
    }
  };
  const handleAddToCompare = () => {
    const result = addToCompare(product);
    alert(result.message);
  };

  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <button
            onClick={() => navigate('/products')}
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/products')}
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Products</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="aspect-square bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-2">{summary && summary.average_rating ? summary.average_rating : '0.0'}</span>
                </div>
                <span className="text-sm text-gray-600">Brand: {product.brand}</span>
              </div>
              <p className="text-4xl font-bold text-blue-900 mb-4">
                LKR.{product.price}
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Size Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Size</h3>
              <div className="grid grid-cols-6 gap-2">
                {(sizes.length > 0) ? sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`p-3 text-center border rounded-lg transition-colors ${
                      selectedSize === size
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-900'
                    }`}
                  >
                    {size}
                  </button>
                )) : (
                  <p className="text-gray-600">No sizes available</p>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quantity</h3>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                >
                  -
                </button>
                <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
                <button
                  onClick={() => handleIncreaseQuantity()}
                  className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Stock Status */}
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
  (selectedSize
    ? sizeQuantity > 0
    : sizeData.some(size => size.quantity > 0))
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-800'
}`}>
  {(selectedSize
    ? sizeQuantity > 0
    : sizeData.some(size => size.quantity > 0))
    ? 'In Stock'
    : 'Out of Stock'}
</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleAddToCart}
                disabled={adding || sizeQuantity === 0}
                className={`w-full bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center space-x-2 ${
                  adding || sizeQuantity === 0 || selectedSize === '' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{adding ? 'Adding...' : 'Add to Cart'}</span>
              </button>
              
              <div className="flex space-x-4">
                <button 
                  onClick={handleWishlistToggle}
                  className={`flex-1 border rounded-lg py-3 px-4 font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    isInWishlist(product.id)
                      ? 'bg-red-500 text-white border-red-500'
                      : 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-500 hover:border-red-300'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                  <span>{isInWishlist(product.id) ? 'In Wishlist' : 'Add to Wishlist'}</span>
                </button>
                
                <button 
                  onClick={handleAddToCompare}
                  disabled={isInCompare(product.id)}
                  className={`flex-1 border rounded-lg py-3 px-4 font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    isInCompare(product.id)
                      ? 'bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-purple-50 hover:text-purple-500 hover:border-purple-300'
                  }`}
                >
                  <GitCompare className="h-5 w-5" />
                  <span>{isInCompare(product.id) ? 'In Compare' : 'Compare'}</span>
                </button>
                
                <button className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Share2 className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Additional Info */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Details</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Premium quality materials</li>
                <li>• Comfortable fit for all-day wear</li>
                <li>• Easy care and maintenance</li>
                <li>• 30-day return policy</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16">
          <ProductReviews productId={product.id} />
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;