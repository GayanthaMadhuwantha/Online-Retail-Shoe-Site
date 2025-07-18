import React, { useState, useEffect, } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  AlertCircle,
  Calendar,
  Clock,
  Star,
  Eye,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Truck,
  CreditCard,
  MapPin,
  Phone
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalProducts: 0,
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0
  });
  const [orders, setOrders] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('7'); // days
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    }
  }, [user, dateRange]);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchOrders(),
        fetchInventoryAlerts(),
        fetchInventoryData(),
        fetchProducts(),
        fetchInventoryReports()
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const ordersData = await response.json();
        setOrders(ordersData.slice(0, 10)); // Latest 10 orders
        
        // Calculate stats
        const totalRevenue = ordersData.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        const uniqueCustomers = new Set(
          ordersData
            .filter(order => order.user_id)
            .map(order => order.user_id)
        ).size;
        
        // Today's stats
        const today = new Date().toDateString();
        const todayOrders = ordersData.filter(order => 
          new Date(order.created_at).toDateString() === today
        );
        const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        
        // Pending orders
        const pendingOrders = ordersData.filter(order => 
          order.status === 'pending' || order.status === 'processing'
        ).length;
        
        setStats(prev => ({
          ...prev,
          totalOrders: ordersData.length,
          totalRevenue: totalRevenue,
          totalCustomers: uniqueCustomers,
          todayOrders: todayOrders.length,
          todayRevenue: todayRevenue,
          pendingOrders: pendingOrders
        }));

        // Extract recent customers from orders
        const customerMap = new Map();
        ordersData.forEach(order => {
          if (order.customer_name && order.user_id) {
            if (!customerMap.has(order.user_id)) {
              customerMap.set(order.user_id, {
                id: order.user_id,
                name: order.customer_name,
                email: order.customer_email,
                lastOrder: order.created_at,
                totalSpent: 0,
                orderCount: 0
              });
            }
            const customer = customerMap.get(order.user_id);
            customer.totalSpent += parseFloat(order.total_amount || 0);
            customer.orderCount += 1;
            // Keep the most recent order date
            if (new Date(order.created_at) > new Date(customer.lastOrder)) {
              customer.lastOrder = order.created_at;
            }
          }
        });

        const customers = Array.from(customerMap.values())
          .sort((a, b) => new Date(b.lastOrder) - new Date(a.lastOrder))
          .slice(0, 5);
        setRecentCustomers(customers);

        // Generate sales data for the last 7 days
        generateSalesData(ordersData);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const fetchInventoryAlerts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory/alerts`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(alertsData.slice(0, 5));
        
        const lowStockCount = alertsData.filter(alert => 
          alert.alert_type === 'low_stock' || alert.alert_type === 'out_of_stock'
        ).length;
        
        setStats(prev => ({
          ...prev,
          lowStockItems: lowStockCount
        }));
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const inventory = await response.json();
        setInventoryData(inventory);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/products`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const products = await response.json();
        setStats(prev => ({
          ...prev,
          totalProducts: products.length
        }));

        // Calculate top products based on recent orders
        calculateTopProducts(products);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchInventoryReports = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/inventory/reports?type=summary`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const reports = await response.json();
        // Update stats with inventory report data if available
        if (reports.totalProducts) {
          setStats(prev => ({
            ...prev,
            totalProducts: reports.totalProducts.count || prev.totalProducts
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory reports:', error);
    }
  };

  const generateSalesData = (ordersData) => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayOrders = ordersData.filter(order => 
        order.created_at.startsWith(dateString)
      );
      
      const dayRevenue = dayOrders.reduce((sum, order) => 
        sum + parseFloat(order.total_amount || 0), 0
      );
      
      last7Days.push({
        date: dateString,
        sales: dayRevenue,
        orders: dayOrders.length
      });
    }
    
    setSalesData(last7Days);
  };

  const calculateTopProducts = (products) => {
    // This is a simplified calculation since we don't have order_items endpoint
    // In a real scenario, you'd want to fetch order items and calculate actual sales
    const topProductsData = products
      .slice(0, 5)
      .map((product, index) => ({
        id: product.id,
        name: product.name,
        sales: Math.floor(Math.random() * 50) + 10, // Simulated sales count
        revenue: parseFloat(product.price) * (Math.floor(Math.random() * 50) + 10),
        stock: product.stock_quantity,
        price: parseFloat(product.price)
      }))
      .sort((a, b) => b.revenue - a.revenue);
    
    setTopProducts(topProductsData);
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const markAlertAsRead = async (alertId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventory/alerts/${alertId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
        setStats(prev => ({
          ...prev,
          lowStockItems: Math.max(0, prev.lowStockItems - 1)
        }));
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const exportData = () => {
    const data = {
      stats,
      orders: orders.slice(0, 5),
      topProducts,
      alerts,
      recentCustomers,
      salesData,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
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

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      change: '+12%',
      changeType: 'positive',
      icon: ShoppingBag,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Revenue',
      value: `LKR.${stats.totalRevenue.toFixed(2)}`,
      change: '+8.2%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      change: '+15%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      change: '+2',
      changeType: 'positive',
      icon: Package,
      color: 'bg-orange-500'
    },
    {
      title: "Today's Orders",
      value: stats.todayOrders,
      change: '+5',
      changeType: 'positive',
      icon: Calendar,
      color: 'bg-indigo-500'
    },
    {
      title: "Today's Revenue",
      value: `LKR.${stats.todayRevenue.toFixed(2)}`,
      change: '+18%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      change: '-2',
      changeType: 'negative',
      icon: Clock,
      color: 'bg-yellow-500'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      change: '+3',
      changeType: 'negative',
      icon: AlertCircle,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportData}
              className="bg-blue-900 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <div className="flex items-center mt-2">
                    <span className={`text-sm font-medium ${
                      card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {card.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                Critical Alerts
              </h2>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {alerts.length} active
              </span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{alert.message}</span>
                      <p className="text-xs text-gray-600">
                        Product: {alert.product_name} | Stock: {alert.stock_quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={() => markAlertAsRead(alert.id)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Mark Read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
                { id: 'customers', label: 'Customers', icon: Users },
                { id: 'products', label: 'Top Products', icon: Star }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Order #{order.id}</p>
                          <p className="text-sm text-gray-600">
                            {order.customer_name || 'Walk-in Customer'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()} - {order.order_type?.toUpperCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">LKR.{parseFloat(order.total_amount || 0).toFixed(2)}</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left" onClick={() => navigate('/inventory')}>
                      <Package className="h-8 w-8 text-blue-600 mb-2" />
                      <p className="font-medium text-gray-900">Manage Inventory</p>
                      <p className="text-sm text-gray-600">View & adjust stock</p>
                    </button>
                    <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left" onClick={() => navigate('/pos')}>
                      <CreditCard className="h-8 w-8 text-green-600 mb-2" />
                      <p className="font-medium text-gray-900">POS System</p>
                      <p className="text-sm text-gray-600">Process sales</p>
                    </button>
                    <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left" onClick={() => navigate('/orders')}>
                      <Users className="h-8 w-8 text-purple-600 mb-2" />
                      <p className="font-medium text-gray-900">View Orders</p>
                      <p className="text-sm text-gray-600">Order management</p>
                    </button>
                    <button className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left" onClick={() => navigate('/expenses')}>
                      <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
                      <p className="font-medium text-gray-900">Cash Drawer</p>
                      <p className="text-sm text-gray-600">Manage cash flow</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sales' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Performance</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-4">Last 7 Days Sales</h4>
                      <div className="space-y-3">
                        {salesData.map((day, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div>
                              <p className="font-medium text-gray-900">
                                {new Date(day.date).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-600">{day.orders} orders</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">LKR.{day.sales.toFixed(2)}</p>
                              <p className="text-sm text-gray-600">
                                Avg: LKR.{day.orders > 0 ? (day.sales / day.orders).toFixed(2) : '0.00'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                      <h4 className="font-semibold">Average Order Value</h4>
                      <p className="text-2xl font-bold">
                        LKR.{(stats.totalRevenue / Math.max(stats.totalOrders, 1)).toFixed(2)}
                      </p>
                      <p className="text-sm opacity-90">Based on all orders</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                      <h4 className="font-semibold">Daily Average</h4>
                      <p className="text-2xl font-bold">
                        LKR.{(stats.totalRevenue / Math.max(salesData.length, 1)).toFixed(2)}
                      </p>
                      <p className="text-sm opacity-90">Revenue per day</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                      <h4 className="font-semibold">Pending Orders</h4>
                      <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                      <p className="text-sm opacity-90">Require attention</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Customers</h3>
                {recentCustomers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Spent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Orders
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentCustomers.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(customer.lastOrder).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              LKR.{customer.totalSpent.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.orderCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No customer data available</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl font-bold text-blue-600">#{index + 1}</span>
                        <Star className="h-5 w-5 text-yellow-500" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">Price: LKR.{product.price}</p>
                        <p className="text-sm text-gray-600">Stock: {product.stock} units</p>
                        <p className="text-sm text-gray-600">Est. Sales: {product.sales} units</p>
                        <p className="text-sm font-medium text-green-600">
                          Est. Revenue: LKR.{product.revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;