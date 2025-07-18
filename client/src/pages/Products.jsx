import React, { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { Search, Filter, SlidersHorizontal, ChevronRight, ArrowLeft, Grid, List } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('main'); // 'main', 'subcategories', 'products'
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState(['All Categories']);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    brand: '',
    minPrice: '',
    maxPrice: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Category images mapping
  const categoryImages = {
    woman: 'https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg?auto=compress&cs=tinysrgb&w=500',
    man: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=500',
    kid: 'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=500',
    other: 'https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=500'
  };

  // Category display names
  const categoryDisplayNames = {
    woman: 'Women',
    man: 'Men',
    kid: 'Kids',
    other: 'Other'
  };

  const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

  useEffect(() => {
    fetchMainCategories();
  }, []);

  useEffect(() => {
    if (currentView === 'products') {
      fetchProducts();
    }
  }, [currentView, filters]);

  const fetchMainCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/categories/main`);
      const data = await response.json();
      
      // Transform the data to include display names and images
      const transformedCategories = data.map(item => ({
        id: item.main_category,
        name: categoryDisplayNames[item.main_category] || item.main_category,
        image: categoryImages[item.main_category] || categoryImages.other
      }));
      
      setMainCategories(transformedCategories);
    } catch (error) {
      console.error('Failed to fetch main categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (mainCategory) => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/categories/subcategories/${mainCategory}`);
      const data = await response.json();
      setSubCategories(data);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.brand) params.append('brand', filters.brand);

      const response = await fetch(`${BASE_URL}/api/products?${params}`);
      const data = await response.json();
      
      // Apply price filters on frontend
      let filteredProducts = data;
      if (filters.minPrice) {
        filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(filters.maxPrice));
      }
      
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMainCategoryClick = async (category) => {
    setSelectedMainCategory(category);
    setCurrentView('subcategories');
    setBreadcrumb(['All Categories', category.name]);
    await fetchSubCategories(category.id);
  };

  const handleSubCategoryClick = (subcategory) => {
    setSelectedSubCategory(subcategory);
    setCurrentView('products');
    setFilters(prev => ({ ...prev, category: subcategory.id }));
    setBreadcrumb(['All Categories', selectedMainCategory.name, subcategory.name]);
  };

  const handleBackClick = () => {
    if (currentView === 'products') {
      setCurrentView('subcategories');
      setBreadcrumb(['All Categories', selectedMainCategory.name]);
      setSelectedSubCategory(null);
      setFilters(prev => ({ ...prev, category: '' }));
    } else if (currentView === 'subcategories') {
      setCurrentView('main');
      setBreadcrumb(['All Categories']);
      setSelectedMainCategory(null);
      setSubCategories([]);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: selectedSubCategory ? selectedSubCategory.id : '',
      brand: '',
      minPrice: '',
      maxPrice: ''
    });
  };

  const brands = [...new Set(products.map(p => p.brand))].filter(Boolean);

  // Render breadcrumb navigation
  const renderBreadcrumb = () => (
    <div className="flex items-center space-x-2 mb-6">
      {breadcrumb.map((crumb, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
          <span 
            className={`${index === breadcrumb.length - 1 ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600 cursor-pointer'}`}
            onClick={() => {
              if (index === 0) {
                setCurrentView('main');
                setBreadcrumb(['All Categories']);
                setSelectedMainCategory(null);
                setSelectedSubCategory(null);
                setSubCategories([]);
              } else if (index === 1 && breadcrumb.length > 2) {
                setCurrentView('subcategories');
                setBreadcrumb(['All Categories', selectedMainCategory.name]);
                setSelectedSubCategory(null);
              }
            }}
          >
            {crumb}
          </span>
        </React.Fragment>
      ))}
    </div>
  );

  // Render main categories view
  const renderMainCategories = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-300"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainCategories.map((category) => (
          <div
            key={category.id}
            onClick={() => handleMainCategoryClick(category)}
            className="group relative bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <div className="aspect-w-16 aspect-h-12 relative">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-2xl font-bold text-white mb-2">{category.name}</h3>
                <p className="text-white/80 text-sm">Explore Collection</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-medium">View Categories</span>
                <ChevronRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render subcategories view
  const renderSubCategories = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-8 w-48 bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-6 bg-gray-300 rounded mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Categories</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-900">{selectedMainCategory?.name} Collection</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subCategories.map((subcategory) => (
            <div
              key={subcategory.id}
              onClick={() => handleSubCategoryClick(subcategory)}
              className="group bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {subcategory.name}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-gray-600 mb-4">{subcategory.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600 font-medium">View Products</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render products view
  const renderProducts = () => (
    <div className="space-y-6">
      {/* Header with back button and view controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackClick}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to {selectedMainCategory?.name}</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <h2 className="text-2xl font-bold text-gray-900">{selectedSubCategory?.name}</h2>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Brand Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={filters.brand}
                  onChange={(e) => handleFilterChange('brand', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Brands</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Price
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price
                </label>
                <input
                  type="number"
                  placeholder="1000"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Count */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {loading ? 'Loading...' : `${products.length} products found`}
        </p>
      </div>

      {/* Products Grid/List */}
      {loading ? (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="h-64 bg-gray-300"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products found matching your criteria.</p>
          <button
            onClick={clearFilters}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {currentView === 'main' ? 'Shop by Category' : 'Our Products'}
          </h1>
          <p className="text-gray-600">
            {currentView === 'main' 
              ? 'Discover our complete collection organized by category'
              : 'Find the perfect shoes for your style'
            }
          </p>
        </div>

        {/* Breadcrumb */}
        {currentView !== 'main' && renderBreadcrumb()}

        {/* Content based on current view */}
        {currentView === 'main' && renderMainCategories()}
        {currentView === 'subcategories' && renderSubCategories()}
        {currentView === 'products' && renderProducts()}
      </div>
    </div>
  );
};

export default Products;