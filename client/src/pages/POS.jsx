import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  X, 
  CreditCard, 
  DollarSign,
  AlertCircle,
  Check,
  Calculator,
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  Clock,
  FileText,
  Settings,
  Eye,
  Edit3,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';

const POS = () => {
  const { user, token } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Cash Drawer States
  const [cashDrawer, setCashDrawer] = useState({
    isOpen: false,
    opening_balance: 0.00,
    current_balance: 0.00,
    total_sales: 0.00,
    total_expenses: 0.00,
    cashTransactions: [],
    opened_at: null,
    opened_by: null
  });
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashAction, setCashAction] = useState(''); // 'add', 'remove', 'open', 'close'
  
  // Expense Management States
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    notes: ''
  });
  const [expenseCategories] = useState([
    'Office Supplies',
    'Utilities',
    'Rent',
    'Marketing',
    'Maintenance',
    'Travel',
    'Food & Beverages',
    'Equipment',
    'Professional Services',
    'Other'
  ]);
  
  // Cash Transaction States
  const [cashForm, setCashForm] = useState({
    amount: '',
    reason: '',
    type: 'add' // 'add' or 'remove'
  });
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

  // Helper function to safely convert to number and format
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return num.toFixed(2);
  };

  // Helper function to safely get numeric value
  const getNumericValue = (value) => {
    return parseFloat(value) || 0;
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProducts();
      fetchCategories();
      fetchCashDrawerData();
      fetchExpenses();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products`);
      const data = await response.json();
      setProducts(data.products || data); // Handle both paginated and non-paginated responses
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchCashDrawerData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/pos/cash-drawer`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure all numeric values are properly converted
        setCashDrawer({
          ...data,
          opening_balance: getNumericValue(data.opening_balance),
          current_balance: getNumericValue(data.current_balance),
          total_sales: getNumericValue(data.total_sales),
          total_expenses: getNumericValue(data.total_expenses),
          cashTransactions: data.cashTransactions || []
        });
        
      }

    } catch (error) {
      console.error('Failed to fetch cash drawer data:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${BASE_URL}/api/pos/expenses?date=${today}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    }
  };

  const openCashDrawer = async (openingBalance = 0.00) => {
    try {
      const response = await fetch(`${BASE_URL}/api/pos/cash-drawer/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ openingBalance: parseFloat(openingBalance) })
      });

      if (response.ok) {
        await fetchCashDrawerData();
        setShowCashModal(false);
        setCashForm({ amount: '', reason: '', type: 'add' });
        alert('Cash drawer opened successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to open cash drawer');
      }
    } catch (error) {
      console.error('Failed to open cash drawer:', error);
      alert('Failed to open cash drawer');
    }
  };

  const closeCashDrawer = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/pos/cash-drawer/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const report = data.report;
        
        alert(`Cash Drawer Closed!\nExpected: LKR.${formatCurrency(report.expectedBalance)}\nActual: LKR.${formatCurrency(report.actualBalance)}\nDifference: LKR.${formatCurrency(report.difference)}`);
        
        await fetchCashDrawerData();
        setShowCashModal(false);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to close cash drawer');
      }
    } catch (error) {
      console.error('Failed to close cash drawer:', error);
      alert('Failed to close cash drawer');
    }
  };

  const addCashTransaction = async () => {
    const amount = parseFloat(cashForm.amount);
    if (!amount || !cashForm.reason) {
      alert('Please enter amount and reason');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/pos/cash-drawer/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: cashForm.type,
          amount: amount,
          reason: cashForm.reason
        })
      });

      if (response.ok) {
        await fetchCashDrawerData();
        setShowCashModal(false);
        setCashForm({ amount: '', reason: '', type: 'add' });
        alert('Cash transaction recorded successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record transaction');
      }
    } catch (error) {
      console.error('Failed to record cash transaction:', error);
      alert('Failed to record transaction');
    }
  };

  const addExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/pos/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(expenseForm)
      });

      if (response.ok) {
        await fetchExpenses();
        await fetchCashDrawerData(); // Refresh cash drawer if it was a cash expense
        setShowExpenseModal(false);
        setExpenseForm({
          description: '',
          amount: '',
          category: '',
          paymentMethod: 'cash',
          receiptNumber: '',
          notes: ''
        });
        alert('Expense recorded successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to record expense');
      }
    } catch (error) {
      console.error('Failed to record expense:', error);
      alert('Failed to record expense');
    }
  };

  const deleteExpense = async (expenseId) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(`${BASE_URL}/api/pos/expenses/${expenseId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          await fetchExpenses();
          await fetchCashDrawerData(); // Refresh cash drawer if it was a cash expense
          alert('Expense deleted successfully');
        } else {
          const error = await response.json();
          alert(error.message || 'Failed to delete expense');
        }
      } catch (error) {
        console.error('Failed to delete expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || product.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1, size: '9' }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity }
        : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (getNumericValue(item.price) * item.quantity), 0);
  };

  const getCartTotalWithTax = () => {
    return getCartTotal() * 1.08;
  };

  const getChange = () => {
    if (paymentMethod === 'cash' && cashReceived) {
      return parseFloat(cashReceived) - getCartTotalWithTax();
    }
    return 0;
  };

  const processOrder = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'cash') {
      if (!cashReceived || parseFloat(cashReceived) < getCartTotalWithTax()) {
        alert('Insufficient cash received');
        return;
      }
      if (!cashDrawer.isOpen) {
        alert('Please open cash drawer first');
        return;
      }
    }

    setProcessing(true);
    try {
      const orderData = {
        items: cart,
        totalAmount: getCartTotalWithTax(),
        paymentMethod: paymentMethod,
        customerInfo: {
          type: 'walk-in'
        }
      };

      const response = await fetch(`${BASE_URL}/api/pos/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        // Refresh cash drawer data
        await fetchCashDrawerData();
        
        setCart([]);
        setCashReceived('');
        setPaymentMethod('cash');
        setShowPaymentModal(false);
        setOrderComplete(true);
        setTimeout(() => setOrderComplete(false), 3000);
      } else {
        const error = await response.json();
        alert(error.message || 'Order processing failed. Please try again.');
      }
    } catch (error) {
      console.error('Order processing error:', error);
      alert('Order processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const getTodaysExpenses = () => {
    return expenses.reduce((total, expense) => total + getNumericValue(expense.amount), 0);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the POS system.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-gray-600 mt-2">Process in-store purchases</p>
          </div>
          
          {/* Cash Drawer Status & Controls */}
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg ${cashDrawer.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span className="font-medium">
                  {cashDrawer.isOpen ? `LKR.${formatCurrency(cashDrawer.current_balance)}` : 'Drawer Closed'}
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setShowCashDrawer(!showCashDrawer)}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>Cash Drawer</span>
            </button>
            
            <button
              onClick={() => setShowExpenseModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
            >
              <TrendingDown className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Cash Drawer Panel */}
        {showCashDrawer && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Cash Drawer Management</h2>
              <button
                onClick={() => setShowCashDrawer(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600">Opening Balance</p>
                    <p className="text-2xl font-bold text-blue-900">LKR.{formatCurrency(cashDrawer.opening_balance)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600">Total Sales</p>
                    <p className="text-2xl font-bold text-green-900">LKR.{formatCurrency(cashDrawer.total_sales)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-900">LKR.{formatCurrency(cashDrawer.total_expenses)}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Current Balance</p>
                    <p className="text-2xl font-bold text-purple-900">LKR.{formatCurrency(cashDrawer.current_balance)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mb-6">
              {!cashDrawer.isOpen ? (
                <button
                  onClick={() => {
                    setCashAction('open');
                    setShowCashModal(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Open Drawer
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCashAction('add');
                      setCashForm({ ...cashForm, type: 'add' });
                      setShowCashModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Cash
                  </button>
                  <button
                    onClick={() => {
                      setCashAction('remove');
                      setCashForm({ ...cashForm, type: 'remove' });
                      setShowCashModal(true);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Remove Cash
                  </button>
                  <button
                    onClick={() => {
                      setCashAction('close');
                      setShowCashModal(true);
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Close Drawer
                  </button>
                </>
              )}
            </div>

            {/* Recent Transactions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Transactions</h3>
              <div className="max-h-40 overflow-y-auto">
                {!cashDrawer.cashTransactions || cashDrawer.cashTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {cashDrawer.cashTransactions.slice(-10).reverse().map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <span className="text-sm font-medium">{transaction.reason}</span>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className={`font-bold ${transaction.transaction_type === 'add' || transaction.transaction_type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.transaction_type === 'add' || transaction.transaction_type === 'sale' ? '+' : '-'}${formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => addToCart(product)}
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-md mb-3"
                    />
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">{product.brand}</p>
                    <p className="text-lg font-bold text-blue-900">LKR.{formatCurrency(product.price)}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="w-full mt-2 bg-blue-900 text-white py-1 px-3 rounded-md hover:bg-blue-800 transition-colors text-sm"
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Current Sale</h2>
                <ShoppingCart className="h-5 w-5 text-gray-600" />
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No items in cart</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-600">{item.brand}</p>
                          <p className="text-sm font-bold text-blue-900">
                            LKR.{formatCurrency(item.price)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="text-sm font-medium">LKR.{formatCurrency(getCartTotal())}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Tax (8%)</span>
                      <span className="text-sm font-medium">LKR.{formatCurrency(getCartTotal() * 0.08)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-4 pt-2 border-t">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-blue-900">
                        LKR.{formatCurrency(getCartTotalWithTax())}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <CreditCard className="h-5 w-5" />
                        <span>Process Payment</span>
                      </button>
                      <button
                        onClick={() => setCart([])}
                        className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Cash Sales</p>
              <p className="text-2xl font-bold text-green-900">LKR.{formatCurrency(cashDrawer.total_sales)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Expenses</p>
              <p className="text-2xl font-bold text-red-900">LKR.{formatCurrency(getTodaysExpenses())}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Net Cash</p>
              <p className="text-2xl font-bold text-blue-900">
                LKR.{formatCurrency(getNumericValue(cashDrawer.total_sales) - getTodaysExpenses())}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Process Payment</h2>
              
              <div className="mb-4">
                <p className="text-lg font-semibold">Total: LKR.{formatCurrency(getCartTotalWithTax())}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="check">Check</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  {cashReceived && (
                    <p className="mt-2 text-sm">
                      Change: <span className="font-bold text-green-600">LKR.{formatCurrency(getChange())}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={processOrder}
                  disabled={processing}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Complete Sale'}
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cash Drawer Modal */}
        {showCashModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {cashAction === 'open' && 'Open Cash Drawer'}
                {cashAction === 'close' && 'Close Cash Drawer'}
                {cashAction === 'add' && 'Add Cash'}
                {cashAction === 'remove' && 'Remove Cash'}
              </h2>

              {cashAction === 'open' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opening Balance
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashForm.amount}
                      onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="200.00"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => openCashDrawer(cashForm.amount || 200)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Open Drawer
                    </button>
                    <button
                      onClick={() => setShowCashModal(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {cashAction === 'close' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Expected Balance:</p>
                    <p className="text-lg font-bold">
                      LKR.{formatCurrency(getNumericValue(cashDrawer.opening_balance) + getNumericValue(cashDrawer.total_sales) - getNumericValue(cashDrawer.total_expenses))}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Current Balance:</p>
                    <p className="text-lg font-bold">LKR.{formatCurrency(cashDrawer.current_balance)}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={closeCashDrawer}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Close Drawer
                    </button>
                    <button
                      onClick={() => setShowCashModal(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {(cashAction === 'add' || cashAction === 'remove') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashForm.amount}
                      onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={cashForm.reason}
                      onChange={(e) => setCashForm({ ...cashForm, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter reason..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={addCashTransaction}
                      className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors ${
                        cashAction === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      {cashAction === 'add' ? 'Add Cash' : 'Remove Cash'}
                    </button>
                    <button
                      onClick={() => setShowCashModal(false)}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Expense Modal */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Expense</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter expense description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Credit/Debit Card</option>
                    <option value="check">Check</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={expenseForm.receiptNumber}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receiptNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Receipt/Invoice number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={addExpense}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Add Expense
                </button>
                <button
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Recent Expenses */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Expenses</h3>
                <div className="max-h-40 overflow-y-auto">
                  {expenses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No expenses recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.slice(-5).reverse().map((expense) => (
                        <div key={expense.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{expense.description}</span>
                            <p className="text-xs text-gray-500">
                              {expense.category} - {new Date(expense.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-red-600">LKR.{formatCurrency(expense.amount)}</span>
                            <button
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Complete Modal */}
        {orderComplete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Complete!</h2>
                <p className="text-gray-600 mb-6">
                  Payment processed successfully. Thank you for your purchase!
                </p>
                {paymentMethod === 'cash' && cashReceived && (
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <p className="text-green-800">
                      Change Due: <span className="font-bold text-xl">LKR.{formatCurrency(getChange())}</span>
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setOrderComplete(false)}
                  className="bg-blue-900 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;