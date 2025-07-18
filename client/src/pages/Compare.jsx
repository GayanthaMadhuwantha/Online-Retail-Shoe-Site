import React from 'react';
import { useCompare } from '../contexts/CompareContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { X, ShoppingCart, Heart, Star } from 'lucide-react';

const Compare = () => {
  const { items, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();

  const handleAddToCart = async (product) => {
    const result = await addToCart(product.id, '9', 1); // Default size 9
    if (result.success) {
      alert('Product added to cart!');
    } else {
      alert(result.message);
    }
  };

  const handleAddToWishlist = (product) => {
    const result = addToWishlist(product);
    alert(result.message);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-4xl">⚖️</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Products to Compare</h2>
          <p className="text-gray-600 mb-8">Add products to compare their features side by side</p>
          <a
            href="/products"
            className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors"
          >
            Browse Products
          </a>
        </div>
      </div>
    );
  }

  const features = [
    { key: 'price', label: 'Price', format: (value) => `LKR.${value}` },
    { key: 'brand', label: 'Brand' },
    { key: 'category_name', label: 'Category' },
    { key: 'stock_quantity', label: 'Stock', format: (value) => `${value} units` },
    { key: 'description', label: 'Description' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Compare Products</h1>
          <button
            onClick={clearCompare}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 w-32">
                    Features
                  </td>
                  {items.map((product) => (
                    <td key={product.id} className="px-6 py-4 text-center min-w-64">
                      <div className="relative">
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          className="absolute top-0 right-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-32 h-32 object-cover rounded-lg mx-auto mb-3"
                        />
                        <h3 className="font-semibold text-gray-900 text-sm mb-2">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-center space-x-1 mb-3">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                          <span className="text-xs text-gray-600 ml-1">(4.5)</span>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-blue-900 text-white py-2 px-3 rounded-lg hover:bg-blue-800 transition-colors text-sm flex items-center justify-center space-x-1"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span>Add to Cart</span>
                          </button>
                          <button
                            onClick={() => handleAddToWishlist(product)}
                            disabled={isInWishlist(product.id)}
                            className={`w-full py-2 px-3 rounded-lg transition-colors text-sm flex items-center justify-center space-x-1 ${
                              isInWishlist(product.id)
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            <Heart className="h-4 w-4" />
                            <span>{isInWishlist(product.id) ? 'In Wishlist' : 'Add to Wishlist'}</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {features.map((feature) => (
                  <tr key={feature.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                      {feature.label}
                    </td>
                    {items.map((product) => (
                      <td key={product.id} className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-900">
                          {feature.format 
                            ? feature.format(product[feature.key])
                            : product[feature.key] || 'N/A'
                          }
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Comparison Tips</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Compare up to 4 products at once for the best overview</li>
            <li>• Consider your primary use case when comparing features</li>
            <li>• Check stock availability before making your final decision</li>
            <li>• Read customer reviews for additional insights</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Compare;