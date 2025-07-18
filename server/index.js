const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));


app.use(rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
}));

// MySQL connection with better error handling
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'shoedbserver.mysql.database.azure.com',
  user: process.env.DB_USER || 'root123',
  password: process.env.DB_PASSWORD || 'WEhfT7?dW#y*RZ8',
  database: process.env.DB_NAME || 'shoe_store',
  ssl: {
    rejectUnauthorized: true
  },
  connectTimeout: 60000  
  });


// Connect to database with retry logic
const connectToDatabase = () => {
  db.connect((err) => {
    if (err) {
      console.error('Database connection failed:', err.message);
      console.log('Please ensure MySQL is running and the database exists.');
      console.log('You can create the database by running: CREATE DATABASE shoe_store;');

      // Don't exit the process, just log the error
      console.log('Server will continue running without database connection...');
      return;
    }
    console.log('Connected to MySQL database successfully');

    // Only create tables and insert sample data if connected
   // createTables();
    //setTimeout(insertSampleData, 1000);
  });
};

connectToDatabase();

// Handle database disconnection
db.on('error', (err) => {
  console.error('Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Attempting to reconnect to database...');
    connectToDatabase();
  }
});

// Create tables
const createTables = () => {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('customer', 'admin') DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      satus ENUM('active', 'inactive') DEFAULT 'active',
      phone VARCHAR(20),
      address TEXT,
      city VARCHAR(50),
      state VARCHAR(50),
      zip_code VARCHAR(10),
      country VARCHAR(50) DEFAULT 'USA',
      date_of_birth DATE,
      gender ENUM('male', 'female', 'other'),
      status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      email_verified BOOLEAN DEFAULT FALSE,
      last_login TIMESTAMP NULL,
      login_attempts INT DEFAULT 0,
      locked_until TIMESTAMP NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      main_category VARCHAR(100) NOT NULL,
      name VARCHAR(50) NOT NULL,
      description TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category_id INT,
      brand VARCHAR(50),
      image_url VARCHAR(255),
      stock_quantity INT DEFAULT 0,
      min_stock_level INT DEFAULT 10,
      max_stock_level INT DEFAULT 100,
      reorder_point INT DEFAULT 20,
      cost_price DECIMAL(10,2) DEFAULT 0,
      sku VARCHAR(50) UNIQUE,
      status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`,
    `CREATE TABLE IF NOT EXISTS product_sizes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT,
      size VARCHAR(10) NOT NULL,
      quantity INT DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT,
      transaction_type ENUM('in', 'out', 'adjustment') NOT NULL,
      quantity INT NOT NULL,
      previous_quantity INT NOT NULL,
      new_quantity INT NOT NULL,
      reason VARCHAR(255),
      reference_id INT,
      reference_type ENUM('order', 'purchase', 'adjustment', 'return'),
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT,
      alert_type ENUM('low_stock', 'out_of_stock', 'overstock') NOT NULL,
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      total_amount DECIMAL(10,2) NOT NULL,
      status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
      order_type ENUM('online', 'pos') DEFAULT 'online',
      payment_method ENUM('cash', 'card', 'check', 'bank_transfer') DEFAULT 'cash',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      product_id INT,
      size VARCHAR(10),
      quantity INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      product_id INT,
      size VARCHAR(10),
      quantity INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS cash_drawers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      current_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_open BOOLEAN DEFAULT FALSE,
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      closed_at TIMESTAMP NULL,
      opened_by VARCHAR(100),
      closed_by VARCHAR(100),
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS cash_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      drawer_id INT NOT NULL,
      transaction_type ENUM('add', 'remove', 'sale', 'expense') NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      reason VARCHAR(255),
      reference_id INT,
      reference_type ENUM('order', 'expense', 'manual', 'opening', 'closing'),
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (drawer_id) REFERENCES cash_drawers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      payment_method ENUM('cash', 'card', 'check', 'bank_transfer') NOT NULL,
      receipt_number VARCHAR(100),
      notes TEXT,
      user_id INT NOT NULL,
      drawer_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (drawer_id) REFERENCES cash_drawers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS product_reviews (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      verified_purchase BOOLEAN DEFAULT 0,
      helpful_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(product_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS review_votes (
      id INTEGER PRIMARY KEY AUTO_INCREMENT,
      review_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_helpful BOOLEAN NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (review_id) REFERENCES product_reviews (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(review_id, user_id)
    )`,
  ];

  tables.forEach(table => {
    db.query(table, (err) => {
      if (err) console.error('Error creating table:', err);
    });
  });
};

// Insert sample data
const insertSampleData = () => {
  // Categories
  const categories = [
    ['woman', 'Running', 'Athletic shoes for running and jogging'],
    ['woman', 'Casual', 'Everyday comfortable shoes'],
    ['woman', 'Formal', 'Professional and dress shoes'],
    ['woman', 'Heels', 'High heels and dress shoes'],
    ['woman', 'Boots', 'Ankle boots and knee-high boots'],
    ['man', 'Running', 'Athletic shoes for running and jogging'],
    ['man', 'Casual', 'Everyday comfortable shoes'],
    ['man', 'Formal', 'Professional and dress shoes'],
    ['man', 'Sports', 'Sports-specific footwear'],
    ['man', 'Work Boots', 'Heavy-duty work footwear'],
    ['man', 'Sneakers', 'Trendy casual sneakers'],
    ['kid', 'School Shoes', 'Comfortable shoes for school'],
    ['kid', 'Sports', 'Athletic shoes for kids'],
    ['kid', 'Casual', 'Everyday kids footwear'],
    ['kid', 'Sandals', 'Summer sandals for kids'],
    ['other', 'Accessories', 'Shoe care and accessories'],
    ['other', 'Specialty', 'Special purpose footwear'],
    ['other', 'Vintage', 'Classic and vintage styles']
  ];


  categories.forEach(category => {
    db.query('INSERT IGNORE INTO categories (main_category, name, description) VALUES (?, ?, ?)', category, (err) => {
      if (err) console.error('Error inserting category:', err);
    });
  });

  // Sample products with inventory data
  const products = [
    ['Nike Air Max 270', 'Comfortable running shoe with excellent cushioning', 149.99, 1, 'Nike', 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=500', 50, 10, 100, 20, 89.99, 'NK-AM270-001'],
    ['Adidas Ultraboost 22', 'Premium running shoe with responsive cushioning', 179.99, 1, 'Adidas', 'https://images.pexels.com/photos/1456706/pexels-photo-1456706.jpeg?auto=compress&cs=tinysrgb&w=500', 30, 10, 80, 15, 119.99, 'AD-UB22-001'],
    ['Converse Chuck Taylor', 'Classic canvas sneaker for everyday wear', 69.99, 2, 'Converse', 'https://images.pexels.com/photos/1598508/pexels-photo-1598508.jpeg?auto=compress&cs=tinysrgb&w=500', 75, 15, 120, 25, 39.99, 'CV-CT-001'],
    ['Vans Old Skool', 'Skateboard-inspired casual sneaker', 89.99, 2, 'Vans', 'https://images.pexels.com/photos/1464625/pexels-photo-1464625.jpeg?auto=compress&cs=tinysrgb&w=500', 40, 12, 90, 20, 54.99, 'VN-OS-001'],
    ['Oxford Dress Shoes', 'Premium leather formal shoes', 199.99, 3, 'Cole Haan', 'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=500', 25, 8, 60, 15, 129.99, 'CH-OX-001'],
    ['Basketball High-tops', 'Professional basketball shoes', 159.99, 4, 'Jordan', 'https://images.pexels.com/photos/2529375/pexels-photo-2529375.jpeg?auto=compress&cs=tinysrgb&w=500', 35, 10, 70, 18, 99.99, 'JD-BH-001']
  ];

  products.forEach(product => {
    db.query('INSERT IGNORE INTO products (name, description, price, category_id, brand, image_url, stock_quantity, min_stock_level, max_stock_level, reorder_point, cost_price, sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', product, (err) => {
      if (err) console.error('Error inserting product:', err);
    });
  });

  // Create admin user
  bcrypt.hash('admin123', 10, (err, hash) => {
    if (!err) {
      db.query('INSERT IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Admin User', 'admin@shoestore.com', hash, 'admin'], (err) => {
          if (err) console.error('Error creating admin user:', err);
        });
    }
  });
};

// Database health check middleware
const checkDatabaseConnection = (req, res, next) => {
  if (db.state === 'disconnected') {
    return res.status(503).json({
      message: 'Database connection unavailable. Please check your MySQL server.'
    });
  }
  next();
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      console.log("JWT Error", err);
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};





// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Inventory helper functions
const updateInventory = (productId, quantityChange, transactionType, reason, referenceId, referenceType, userId) => {
  return new Promise((resolve, reject) => {
    db.beginTransaction((err) => {
      if (err) return reject(err);

      // Get current stock
      db.query('SELECT stock_quantity FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) {
          return db.rollback(() => reject(err));
        }

        const currentStock = results[0]?.stock_quantity || 0;
        const newStock = currentStock + quantityChange;

        // Update product stock
        db.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, productId], (err) => {
          if (err) {
            return db.rollback(() => reject(err));
          }

          // Record transaction
          db.query(
            'INSERT INTO inventory_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, reference_id, reference_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [productId, transactionType, Math.abs(quantityChange), currentStock, newStock, reason, referenceId, referenceType, userId],
            (err) => {
              if (err) {
                return db.rollback(() => reject(err));
              }

              // Check for stock alerts
              checkStockAlerts(productId, newStock);

              db.commit((err) => {
                if (err) {
                  return db.rollback(() => reject(err));
                }
                resolve({ previousStock: currentStock, newStock });
              });
            }
          );
        });
      });
    });
  });
};





const checkStockAlerts = (productId, currentStock) => {
  db.query('SELECT min_stock_level, max_stock_level, reorder_point, name FROM products WHERE id = ?', [productId], (err, results) => {
    if (err || !results.length) return;

    const { min_stock_level, max_stock_level, reorder_point, name } = results[0];
    let alertType = null;
    let message = null;

    if (currentStock === 0) {
      alertType = 'out_of_stock';
      message = `${name} is out of stock`;
    } else if (currentStock <= min_stock_level) {
      alertType = 'low_stock';
      message = `${name} stock is low (${currentStock} remaining)`;
    } else if (currentStock > max_stock_level) {
      alertType = 'overstock';
      message = `${name} is overstocked (${currentStock} units)`;
    }

    if (alertType) {
      db.query(
        'INSERT INTO stock_alerts (product_id, alert_type, message) VALUES (?, ?, ?)',
        [productId, alertType, message],
        (err) => {
          if (err) console.error('Error creating stock alert:', err);
        }
      );
    }
  });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = db.state === 'authenticated' ? 'connected' : 'disconnected';
  res.json({
    status: 'Server is running',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.post('/api/auth/register', checkDatabaseConnection, async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword], (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
          }
          return res.status(500).json({ message: 'Registration failed' });
        }

        const token = jwt.sign(
          { userId: result.insertId, email, role: 'customer' },
          process.env.JWT_SECRET || 'your-secret-key'
        );

        res.json({ token, user: { id: result.insertId, name, email, role: 'customer' } });
      });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', checkDatabaseConnection, (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ? AND status = "active" ', [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials or User Disabled' });
    }

    const user = results[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials or User Disabled' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key'
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });
});

app.get('/api/users', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { page = 1, limit = 10, search = '', status = '', role = '', sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

  let query = `
    SELECT 
      id, name, email, phone, address, city, state, zip_code, country,
      date_of_birth, gender, role, status, email_verified, last_login,
      login_attempts, created_at, updated_at
    FROM users 
    WHERE 1=1
  `;
  const params = [];

  // Append filters properly
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  // Sorting
  const validSortFields = ['name', 'email', 'role', 'status', 'created_at', 'last_login'];
  const validSortOrders = ['ASC', 'DESC'];

  if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
  } else {
    query += ' ORDER BY created_at DESC';
  }

  // Build countQuery from working query
  const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');

  db.query(countQuery, params, (err, countResult) => {
    if (err) {
      console.error('Count query error:', err);  // Debugging
      return res.status(500).json({ message: 'Failed to get user count' });
    }

    const total = countResult[0].total;
    const offset = (page - 1) * limit;

    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, results) => {
      if (err) {
        console.error('User fetch query error:', err);  // Debugging
        return res.status(500).json({ message: 'Failed to fetch users' });
      }

      res.json({
        users: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    });
  });
});

app.get('/api/users/stats', (req, res) => {
  const queries = {
    totalUsers: 'SELECT COUNT(*) as count FROM users',
    activeUsers: 'SELECT COUNT(*) as count FROM users WHERE status = "active"',
    inactiveUsers: 'SELECT COUNT(*) as count FROM users WHERE status = "inactive"',
    suspendedUsers: 'SELECT COUNT(*) as count FROM users WHERE status = "suspended"',
    adminUsers: 'SELECT COUNT(*) as count FROM users WHERE role = "admin"',
    customerUsers: 'SELECT COUNT(*) as count FROM users WHERE role = "customer"',
    recentUsers: 'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
    recentLogins: 'SELECT COUNT(*) as count FROM users WHERE last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
  };

  const stats = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.query(query, (err, result) => {
      if (!err && result.length > 0) {
        stats[key] = result[0].count;
      } else {
        stats[key] = 0;
      }

      completed++;
      if (completed === total) {
        res.json(stats);
      }
    });
  });
});


app.get('/api/users/:id', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;

  db.query(`
    SELECT 
      id, name, email, phone, address, city, state, zip_code, country,
      date_of_birth, gender, role, status, email_verified, last_login,
      login_attempts, created_at, updated_at
    FROM users 
    WHERE id = ?
  `, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch user' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(results[0]);
  });
});

app.post('/api/users', authenticateToken, requireAdmin, checkDatabaseConnection, async (req, res) => {
  const {
    name, email, password, phone, address, city, state, zip_code, country,
    date_of_birth, gender, role = 'customer'
  } = req.body;
  console.log(req.body);

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    db.query(`
      INSERT INTO users (
        name, email, password, phone, address, city, state, zip_code, country,
        date_of_birth, gender, role, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `, [
      name, email, hashedPassword, phone, address, city, state, zip_code, country,
      date_of_birth, gender, role
    ], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to create user ' + err });
      }

      res.status(201).json({
        message: 'User created successfully',
        userId: result.insertId
      });
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, checkDatabaseConnection, async (req, res) => {
  const { id } = req.params;
  const {
    name, email, phone, address, city, state, zip_code, country,
    date_of_birth, gender, role, status
  } = req.body;

  // Validation
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  try {
    // Check if user exists
    const userExists = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM users WHERE id = ?', [id], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0);
      });
    });

    if (!userExists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is taken by another user
    const emailTaken = await new Promise((resolve, reject) => {
      db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id], (err, results) => {
        if (err) reject(err);
        else resolve(results.length > 0);
      });
    });

    if (emailTaken) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Update user
    db.query(`
      UPDATE users SET 
        name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, 
        zip_code = ?, country = ?, date_of_birth = ?, gender = ?, role = ?, status = ?
      WHERE id = ?
    `, [
      name, email, phone, address, city, state, zip_code, country,
      date_of_birth, gender, role, status, id
    ], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to update user' });
      }

      res.json({ message: 'User updated successfully' });
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  db.query('UPDATE users SET status = "inactive" WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to deactivate user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  });
});

app.put('/api/users/:id/reactivate', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;

  db.query('UPDATE users SET status = "active" WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to reactivate user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User reactivated successfully' });
  });
});

// Suspend user (Admin only)
app.put('/api/users/:id/suspend', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // Prevent admin from suspending themselves
  if (parseInt(id) === req.user.userId) {
    return res.status(400).json({ message: 'Cannot suspend your own account' });
  }

  db.query('UPDATE users SET status = "suspended" WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to suspend user' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // TODO: Log suspension reason in audit table
    res.json({ message: 'User suspended successfully' });
  });
});

// Reset user password (Admin only)
app.put('/api/users/:id/reset-password', authenticateToken, requireAdmin, checkDatabaseConnection, async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query(
      'UPDATE users SET password = ?, login_attempts = 0, locked_until = NULL WHERE id = ?',
      [hashedPassword, id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to reset password' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'Password reset successfully' });
      }
    );
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Get user statistics (Admin only)


// Bulk operations (Admin only)
app.post('/api/users/bulk-action', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { action, userIds } = req.body;

  if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Action and user IDs are required' });
  }

  // Prevent admin from performing bulk actions on themselves
  if (userIds.includes(req.user.userId)) {
    return res.status(400).json({ message: 'Cannot perform bulk actions on your own account' });
  }

  let query = '';
  let successMessage = '';

  switch (action) {
    case 'activate':
      query = 'UPDATE users SET status = "active" WHERE id IN (?)';
      successMessage = 'Users activated successfully';
      break;
    case 'deactivate':
      query = 'UPDATE users SET status = "inactive" WHERE id IN (?)';
      successMessage = 'Users deactivated successfully';
      break;
    case 'suspend':
      query = 'UPDATE users SET status = "suspended" WHERE id IN (?)';
      successMessage = 'Users suspended successfully';
      break;
    default:
      return res.status(400).json({ message: 'Invalid action' });
  }

  db.query(query, [userIds], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to perform bulk action' });
    }

    res.json({
      message: successMessage,
      affectedRows: result.affectedRows
    });
  });
});

// Export users data (Admin only)
app.get('/api/users/export', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { format = 'json' } = req.query;

  db.query(`
    SELECT 
      id, name, email, phone, address, city, state, zip_code, country,
      date_of_birth, gender, role, status, email_verified, last_login,
      created_at, updated_at
    FROM users 
    ORDER BY created_at DESC
  `, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to export users' });
    }

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(results[0] || {});
      const csvContent = [
        headers.join(','),
        ...results.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        users: results,
        exportDate: new Date().toISOString(),
        totalCount: results.length
      });
    }
  });
});

// Product routes
app.get('/api/products', checkDatabaseConnection, (req, res) => {
  const { category, search, brand } = req.query;
  let query = `
    SELECT p.*, c.main_category, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.status = 'active'
  `;
  const params = [];

  if (category) {
    query += ' AND p.category_id = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (brand) {
    query += ' AND p.brand = ?';
    params.push(brand);
  }

  query += ' ORDER BY p.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Failed to fetch products' });
    }
    res.json(results);
  });
});

app.get('/api/categories/main', checkDatabaseConnection, (req, res) => {
  const query = 'SELECT DISTINCT main_category FROM categories ORDER BY main_category';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Failed to fetch main categories' });
    }
    res.json(results);
  });
});

app.get('/api/categories/subcategories/:mainCategory', checkDatabaseConnection, (req, res) => {
  const { mainCategory } = req.params;
  const query = 'SELECT id, name, description FROM categories WHERE main_category = ? ORDER BY name';
  
  db.query(query, [mainCategory], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
    res.json(results);
  });
});

// Get products by main category
app.get('/api/products/main-category/:mainCategory', checkDatabaseConnection, (req, res) => {
  const { mainCategory } = req.params;
  const { search, brand } = req.query;
  
  let query = `
    SELECT p.*, c.main_category, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.status = 'active' AND c.main_category = ?
  `;
  const params = [mainCategory];

  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (brand) {
    query += ' AND p.brand = ?';
    params.push(brand);
  }

  query += ' ORDER BY p.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ message: 'Failed to fetch products' });
    }
    res.json(results);
  });
});

app.post('/api/products', authenticateToken, requireAdmin, checkDatabaseConnection, upload.single('image'), (req, res) => {
  const {
    name,
    description,
    price,
    category_id,
    brand,
    stock_quantity = 0,
    min_stock_level = 10,
    max_stock_level = 100,
    reorder_point = 20,
    cost_price = 0,
    status = 'active',
    sizes
  } = req.body;

  // Generate SKU if not provided
  const generateSKU = () => {
    const brandCode = brand ? brand.substring(0, 2).toUpperCase() : 'XX';
    const nameCode = name ? name.substring(0, 3).toUpperCase() : 'XXX';
    const timestamp = Date.now().toString().slice(-6);
    return `${brandCode}-${nameCode}-${timestamp}`;
  };

  const sku = req.body.sku || generateSKU();

  // Handle image URL
  let image_url = req.body.image_url || 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=500';
  if (req.file) {
    image_url = `/uploads/${req.file.filename}`;
  }

  // Validate required fields
  if (!name || !price || !category_id) {
    return res.status(400).json({ message: 'Name, price, and category are required' });
  }

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Transaction failed' });
    }

    //get sum of all size quantity 
    const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);

    // Insert product
    db.query(
      `INSERT INTO products 
         (name, description, price, category_id, brand, image_url, stock_quantity, 
          min_stock_level, max_stock_level, reorder_point, cost_price, sku, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, brand, image_url, totalQuantity,
        min_stock_level, max_stock_level, reorder_point, cost_price, sku, status],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(400).json({ message: 'SKU already exists' });
            }
            console.error('Product creation error:', err);
            res.status(500).json({ message: 'Failed to create product' });
          });
        }

        const productId = result.insertId;

        // Insert sizes if provided
        if (sizes && Array.isArray(sizes)) {
          const sizePromises = sizes.map(size => {
            return new Promise((resolve, reject) => {
              db.query(
                'INSERT INTO product_sizes (product_id, size, quantity) VALUES (?, ?, ?)',
                [productId, size.size, size.quantity || 0],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          });

          Promise.all(sizePromises)
            .then(() => {
              // Record initial inventory transaction if stock > 0
              if (stock_quantity > 0) {
                return updateInventory(
                  productId,
                  stock_quantity,
                  'in',
                  'Initial stock',
                  null,
                  'adjustment',
                  req.user.userId
                );
              }
            })
            .then(() => {
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Transaction commit failed' });
                  });
                }
                res.status(201).json({
                  message: 'Product created successfully',
                  productId,
                  sku
                });
              });
            })
            .catch((error) => {
              db.rollback(() => {
                console.error('Size insertion error:', error);
                res.status(500).json({ message: 'Failed to create product sizes' });
              });
            });
        } else {
          // No sizes, just commit the transaction
          if (stock_quantity > 0) {
            updateInventory(
              productId,
              stock_quantity,
              'in',
              'Initial stock',
              null,
              'adjustment',
              req.user.userId
            ).then(() => {
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Transaction commit failed' });
                  });
                }
                res.status(201).json({
                  message: 'Product created successfully',
                  productId,
                  sku
                });
              });
            }).catch((error) => {
              db.rollback(() => {
                console.error('Inventory update error:', error);
                res.status(500).json({ message: 'Failed to update inventory' });
              });
            });
          } else {
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Transaction commit failed' });
                });
              }
              res.status(201).json({
                message: 'Product created successfully',
                productId,
                sku
              });
            });
          }
        }
      }
    );
  });
});


app.put('/api/products/:id', authenticateToken, requireAdmin, checkDatabaseConnection, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    category_id,
    brand,
    min_stock_level,
    max_stock_level,
    reorder_point,
    cost_price,
    status,
    sizes
  } = req.body;

  // Get current product data
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, currentProduct) => {
    if (err || currentProduct.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const current = currentProduct[0];

    // Handle image URL
    let image_url = req.body.image_url || current.image_url;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    db.beginTransaction((err) => {
      if (err) {
        return res.status(500).json({ message: 'Transaction failed' });
      }

      // Update product
      db.query(
        `UPDATE products SET 
           name = ?, description = ?, price = ?, category_id = ?, brand = ?, 
           image_url = ?, min_stock_level = ?, max_stock_level = ?, 
           reorder_point = ?, cost_price = ?, status = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        [name || current.name, description || current.description, price || current.price,
        category_id || current.category_id, brand || current.brand, image_url,
        min_stock_level || current.min_stock_level, max_stock_level || current.max_stock_level,
        reorder_point || current.reorder_point, cost_price || current.cost_price,
        status || current.status, id],
        (err) => {
          if (err) {
            return db.rollback(() => {
              console.error('Product update error:', err);
              res.status(500).json({ message: 'Failed to update product' });
            });
          }

          // Update sizes if provided
          if (sizes && Array.isArray(sizes)) {
            // Delete existing sizes
            db.query('DELETE FROM product_sizes WHERE product_id = ?', [id], (err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Failed to update sizes' });
                });
              }

              // Insert new sizes
              const sizePromises = sizes.map(size => {
                return new Promise((resolve, reject) => {
                  db.query(
                    'INSERT INTO product_sizes (product_id, size, quantity) VALUES (?, ?, ?)',
                    [id, size.size, size.quantity || 0],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                });
              });

              Promise.all(sizePromises)
                .then(() => {
                  // Check stock alerts with new levels
                  checkStockAlerts(id, current.stock_quantity);

                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ message: 'Transaction commit failed' });
                      });
                    }
                    res.json({ message: 'Product updated successfully' });
                  });
                })
                .catch((error) => {
                  db.rollback(() => {
                    console.error('Size update error:', error);
                    res.status(500).json({ message: 'Failed to update product sizes' });
                  });
                });
            });
          } else {
            // Check stock alerts with new levels
            checkStockAlerts(id, current.stock_quantity);

            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Transaction commit failed' });
                });
              }
              res.json({ message: 'Product updated successfully' });
            });
          }
        }
      );
    });
  });
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;
  const { permanent = false } = req.query;

  // Check if product exists
  db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = results[0];

    // Check if product has any orders
    db.query('SELECT COUNT(*) as order_count FROM order_items WHERE product_id = ?', [id], (err, orderCheck) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to check product orders' });
      }

      const hasOrders = orderCheck[0].order_count > 0;

      if (permanent === 'true' && !hasOrders) {
        // Permanent delete (only if no orders)
        db.beginTransaction((err) => {
          if (err) {
            return res.status(500).json({ message: 'Transaction failed' });
          }

          // Delete related data
          const deleteQueries = [
            'DELETE FROM product_sizes WHERE product_id = ?',
            'DELETE FROM cart_items WHERE product_id = ?',
            'DELETE FROM inventory_transactions WHERE product_id = ?',
            'DELETE FROM stock_alerts WHERE product_id = ?',
            'DELETE FROM products WHERE id = ?'
          ];

          let completed = 0;
          let hasError = false;

          deleteQueries.forEach((query) => {
            db.query(query, [id], (err) => {
              if (err && !hasError) {
                hasError = true;
                return db.rollback(() => {
                  console.error('Delete error:', err);
                  res.status(500).json({ message: 'Failed to delete product' });
                });
              }

              completed++;
              if (completed === deleteQueries.length && !hasError) {
                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ message: 'Transaction commit failed' });
                    });
                  }
                  res.json({ message: 'Product permanently deleted' });
                });
              }
            });
          });
        });
      } else {
        // Soft delete (change status to discontinued)
        db.query(
          'UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['discontinued', id],
          (err) => {
            if (err) {
              return res.status(500).json({ message: 'Failed to delete product' });
            }

            // Record inventory transaction for discontinuation
            updateInventory(
              id,
              -product.stock_quantity,
              'out',
              'Product discontinued',
              null,
              'adjustment',
              req.user.userId
            ).then(() => {
              res.json({
                message: hasOrders
                  ? 'Product discontinued (has order history)'
                  : 'Product discontinued'
              });
            }).catch((error) => {
              console.error('Inventory update error:', error);
              res.json({ message: 'Product discontinued (inventory update failed)' });
            });
          }
        );
      }
    });
  });
});

// Bulk operations
app.post('/api/products/bulk', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { action, productIds, data } = req.body;

  if (!action || !productIds || !Array.isArray(productIds)) {
    return res.status(400).json({ message: 'Invalid bulk operation data' });
  }

  const placeholders = productIds.map(() => '?').join(',');

  switch (action) {
    case 'updateStatus':
      if (!data.status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      db.query(
        `UPDATE products SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [data.status, ...productIds],
        (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to update products' });
          }
          res.json({
            message: `${result.affectedRows} products updated successfully`,
            affectedRows: result.affectedRows
          });
        }
      );
      break;

    case 'updateCategory':
      if (!data.category_id) {
        return res.status(400).json({ message: 'Category is required' });
      }

      db.query(
        `UPDATE products SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [data.category_id, ...productIds],
        (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to update products' });
          }
          res.json({
            message: `${result.affectedRows} products updated successfully`,
            affectedRows: result.affectedRows
          });
        }
      );
      break;

    case 'delete':
      db.query(
        `UPDATE products SET status = 'discontinued', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        productIds,
        (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to delete products' });
          }
          res.json({
            message: `${result.affectedRows} products discontinued successfully`,
            affectedRows: result.affectedRows
          });
        }
      );
      break;

    default:
      res.status(400).json({ message: 'Invalid bulk action' });
  }
});

// Get product statistics
app.get('ap/products/stats/overview', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const queries = {
    totalProducts: 'SELECT COUNT(*) as count FROM products WHERE status != "discontinued"',
    activeProducts: 'SELECT COUNT(*) as count FROM products WHERE status = "active"',
    inactiveProducts: 'SELECT COUNT(*) as count FROM products WHERE status = "inactive"',
    discontinuedProducts: 'SELECT COUNT(*) as count FROM products WHERE status = "discontinued"',
    totalValue: 'SELECT SUM(stock_quantity * cost_price) as value FROM products WHERE status = "active"',
    averagePrice: 'SELECT AVG(price) as average FROM products WHERE status = "active"',
    topBrands: `
        SELECT brand, COUNT(*) as count 
        FROM products 
        WHERE status = 'active' AND brand IS NOT NULL 
        GROUP BY brand 
        ORDER BY count DESC 
        LIMIT 5
      `,
    categoryDistribution: `
        SELECT c.name, COUNT(p.id) as count 
        FROM categories c 
        LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
        GROUP BY c.id, c.name 
        ORDER BY count DESC
      `
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.query(query, (err, result) => {
      if (!err) {
        results[key] = result;
      }
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});


app.get('/api/products/:id', checkDatabaseConnection, (req, res) => {
  const { id } = req.params;

  db.query(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.id = ?
  `, [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get available sizes
    db.query('SELECT size, quantity FROM product_sizes WHERE product_id = ?', [id], (err, sizes) => {
      const product = results[0];
      product.sizes = sizes || [];
      res.json(product);
    });
  });
});

app.get('/api/categories', checkDatabaseConnection, (req, res) => {
  db.query('SELECT * FROM sub_category ORDER BY name;', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch categories' });
    }
    res.json(results);
  });
});

app.get('/api/products/sizes/:id', checkDatabaseConnection, (req, res) => {
  const { id } = req.params;

  db.query('SELECT size, quantity FROM product_sizes WHERE product_id = ? and quantity > 0', [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch sizes' });
    }
    res.json(results);
  });
});

// Cash Drawer Management Routes
app.get('/api/pos/cash-drawer', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const userId = req.user.userId;

  db.query(
    'SELECT * FROM cash_drawers WHERE user_id = ? AND is_open = TRUE ORDER BY opened_at DESC LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch cash drawer' });
      }

      if (results.length === 0) {
        return res.json({ isOpen: false });
      }

      const drawer = results[0];

      // Get cash transactions for this drawer
      db.query(
        'SELECT * FROM cash_transactions WHERE drawer_id = ? ORDER BY created_at DESC',
        [drawer.id],
        (err, transactions) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to fetch transactions' });
          }

          res.json({
            ...drawer,
            isOpen: drawer.is_open,
            cashTransactions: transactions
          });
        }
      );
    }
  );
});

app.post('/api/pos/cash-drawer/open', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { openingBalance } = req.body;
  const userId = req.user.userId;

  // Check if there's already an open drawer
  db.query(
    'SELECT id FROM cash_drawers WHERE user_id = ? AND is_open = TRUE',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: 'Cash drawer is already open' });
      }

      // Create new cash drawer
      db.query(
        'INSERT INTO cash_drawers (user_id, opening_balance, current_balance, is_open, opened_by) VALUES (?, ?, ?, ?, ?)',
        [userId, openingBalance, openingBalance, 1, req.user.email],
        (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to open cash drawer' });
          }

          const drawerId = result.insertId;

          // Record opening transaction
          db.query(
            'INSERT INTO cash_transactions (drawer_id, transaction_type, amount, reason, reference_type, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [drawerId, 'add', openingBalance, 'Opening balance', 'opening', userId],
            (err) => {
              if (err) {
                console.error('Failed to record opening transaction:', err);
              }

              res.json({ message: 'Cash drawer opened successfully', drawerId });
            }
          );
        }
      );
    }
  );
});

app.post('/api/pos/cash-drawer/close', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const userId = req.user.userId;

  db.query(
    'SELECT * FROM cash_drawers WHERE user_id = ? AND is_open = TRUE ORDER BY opened_at DESC LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'No open cash drawer found' });
      }

      const drawer = results[0];

      // Close the drawer
      db.query(
        'UPDATE cash_drawers SET is_open = FALSE, closed_at = NOW(), closed_by = ? WHERE id = ?',
        [req.user.email, drawer.id],
        (err) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to close cash drawer' });
          }

          const expectedBalance = drawer.opening_balance + drawer.total_sales - drawer.total_expenses;
          const difference = drawer.current_balance - expectedBalance;

          res.json({
            message: 'Cash drawer closed successfully',
            report: {
              openingBalance: drawer.opening_balance,
              totalSales: drawer.total_sales,
              totalExpenses: drawer.total_expenses,
              expectedBalance,
              actualBalance: drawer.current_balance,
              difference
            }
          });
        }
      );
    }
  );
});

app.post('/api/pos/cash-drawer/transaction', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { type, amount, reason } = req.body;
  const userId = req.user.userId;

  // Get current open drawer
  db.query(
    'SELECT * FROM cash_drawers WHERE user_id = ? AND is_open = TRUE ORDER BY opened_at DESC LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'No open cash drawer found' });
      }

      const drawer = results[0];
      const newBalance = type === 'add'
        ? drawer.current_balance + parseFloat(amount)
        : drawer.current_balance - parseFloat(amount);

      db.beginTransaction((err) => {
        if (err) {
          return res.status(500).json({ message: 'Transaction failed' });
        }

        // Update drawer balance
        db.query(
          'UPDATE cash_drawers SET current_balance = ? WHERE id = ?',
          [newBalance, drawer.id],
          (err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ message: 'Failed to update drawer balance' });
              });
            }

            // Record transaction
            db.query(
              'INSERT INTO cash_transactions (drawer_id, transaction_type, amount, reason, reference_type, user_id) VALUES (?, ?, ?, ?, ?, ?)',
              [drawer.id, type, amount, reason, 'manual', userId],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Failed to record transaction' });
                  });
                }

                db.commit((err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ message: 'Transaction commit failed' });
                    });
                  }

                  res.json({ message: 'Transaction recorded successfully', newBalance });
                });
              }
            );
          }
        );
      });
    }
  );
});

// Expense Management Routes
app.get('/api/pos/expenses', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { date } = req.query;
  let query = 'SELECT * FROM expenses WHERE user_id = ?';
  const params = [req.user.userId];

  if (date) {
    query += ' AND DATE(created_at) = ?';
    params.push(date);
  }

  query += ' ORDER BY created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch expenses' });
    }
    res.json(results);
  });
});

app.post('/api/pos/expenses', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { description, amount, category, paymentMethod, receiptNumber, notes } = req.body;
  const userId = req.user.userId;

  db.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ message: 'Transaction failed' });
    }

    // Get current open drawer if payment is cash
    if (paymentMethod === 'cash') {
      db.query(
        'SELECT * FROM cash_drawers WHERE user_id = ? AND is_open = TRUE ORDER BY opened_at DESC LIMIT 1',
        [userId],
        (err, drawerResults) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: 'Database error' });
            });
          }

          if (drawerResults.length === 0) {
            return db.rollback(() => {
              res.status(400).json({ message: 'No open cash drawer found for cash expense' });
            });
          }

          const drawer = drawerResults[0];
          const newBalance = drawer.current_balance - parseFloat(amount);
          const newTotalExpenses = drawer.total_expenses + parseFloat(amount);

          // Update drawer
          db.query(
            'UPDATE cash_drawers SET current_balance = ?, total_expenses = ? WHERE id = ?',
            [newBalance, newTotalExpenses, drawer.id],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Failed to update cash drawer' });
                });
              }

              // Insert expense
              insertExpense(drawer.id);
            }
          );
        }
      );
    } else {
      insertExpense(null);
    }

    function insertExpense(drawerId) {
      db.query(
        'INSERT INTO expenses (description, amount, category, payment_method, receipt_number, notes, user_id, drawer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [description, amount, category, paymentMethod, receiptNumber, notes, userId, drawerId],
        (err, result) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ message: 'Failed to record expense' });
            });
          }

          // Record cash transaction if cash payment
          if (paymentMethod === 'cash' && drawerId) {
            db.query(
              'INSERT INTO cash_transactions (drawer_id, transaction_type, amount, reason, reference_id, reference_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [drawerId, 'expense', amount, `Expense: ${description}`, result.insertId, 'expense', userId],
              (err) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ message: 'Failed to record cash transaction' });
                  });
                }

                commitTransaction();
              }
            );
          } else {
            commitTransaction();
          }

          function commitTransaction() {
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Transaction commit failed' });
                });
              }

              res.json({ message: 'Expense recorded successfully', expenseId: result.insertId });
            });
          }
        }
      );
    }
  });
});

app.delete('/api/pos/expenses/:id', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const expenseId = req.params.id;
  const userId = req.user.userId;

  // Get expense details first
  db.query(
    'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
    [expenseId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Expense not found' });
      }

      const expense = results[0];

      db.beginTransaction((err) => {
        if (err) {
          return res.status(500).json({ message: 'Transaction failed' });
        }

        // If it was a cash expense, reverse the cash drawer changes
        if (expense.payment_method === 'cash' && expense.drawer_id) {
          db.query(
            'SELECT * FROM cash_drawers WHERE id = ?',
            [expense.drawer_id],
            (err, drawerResults) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Database error' });
                });
              }

              if (drawerResults.length > 0) {
                const drawer = drawerResults[0];
                const newBalance = drawer.current_balance + parseFloat(expense.amount);
                const newTotalExpenses = drawer.total_expenses - parseFloat(expense.amount);

                db.query(
                  'UPDATE cash_drawers SET current_balance = ?, total_expenses = ? WHERE id = ?',
                  [newBalance, newTotalExpenses, drawer.id],
                  (err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ message: 'Failed to update cash drawer' });
                      });
                    }

                    deleteExpenseRecord();
                  }
                );
              } else {
                deleteExpenseRecord();
              }
            }
          );
        } else {
          deleteExpenseRecord();
        }

        function deleteExpenseRecord() {
          // Delete related cash transactions
          db.query(
            'DELETE FROM cash_transactions WHERE reference_id = ? AND reference_type = "expense"',
            [expenseId],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: 'Failed to delete cash transactions' });
                });
              }

              // Delete expense
              db.query(
                'DELETE FROM expenses WHERE id = ?',
                [expenseId],
                (err) => {
                  if (err) {
                    return db.rollback(() => {
                      res.status(500).json({ message: 'Failed to delete expense' });
                    });
                  }

                  db.commit((err) => {
                    if (err) {
                      return db.rollback(() => {
                        res.status(500).json({ message: 'Transaction commit failed' });
                      });
                    }

                    res.json({ message: 'Expense deleted successfully' });
                  });
                }
              );
            }
          );
        }
      });
    }
  );
});

// Inventory Management Routes
app.get('/api/inventory', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const query = `
    SELECT 
      p.*,
      c.name as category_name,
      CASE 
        WHEN p.stock_quantity = 0 THEN 'out_of_stock'
        WHEN p.stock_quantity <= p.min_stock_level THEN 'low_stock'
        WHEN p.stock_quantity > p.max_stock_level THEN 'overstock'
        ELSE 'normal'
      END as stock_status
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.name
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch inventory' });
    }
    res.json(results);
  });
});

app.post('/api/inventory/adjust', authenticateToken, requireAdmin, checkDatabaseConnection, async (req, res) => {
  const { productId, quantity, reason, size } = req.body;

  try {
    const result = await updateInventory(
      productId,
      quantity,
      'adjustment',
      reason,
      null,
      'adjustment',
      req.user.userId
    );

    db.query(
      'UPDATE product_sizes SET quantity = quantity + ? WHERE product_id = ? AND size = ?',
      [quantity, productId, size],
      (err) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to update product sizes' });
        }
      }
    );

    res.json({
      message: 'Inventory adjusted successfully',
      previousStock: result.previousStock,
      newStock: result.newStock
    });
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    res.status(500).json({ message: 'Failed to adjust inventory' });
  }
});

app.put('/api/inventory/product/:id', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;
  const { min_stock_level, max_stock_level, reorder_point, cost_price, status } = req.body;

  db.query(
    'UPDATE products SET min_stock_level = ?, max_stock_level = ?, reorder_point = ?, cost_price = ?, status = ? WHERE id = ?',
    [min_stock_level, max_stock_level, reorder_point, cost_price, status, id],
    (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to update product inventory settings' });
      }
      res.json({ message: 'Product inventory settings updated successfully' });
    }
  );
});

app.get('/api/inventory/transactions', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { productId, limit = 50 } = req.query;

  let query = `
    SELECT 
      it.*,
      p.name as product_name,
      p.sku,
      u.name as user_name
    FROM inventory_transactions it
    LEFT JOIN products p ON it.product_id = p.id
    LEFT JOIN users u ON it.user_id = u.id
  `;

  const params = [];

  if (productId) {
    query += ' WHERE it.product_id = ?';
    params.push(productId);
  }

  query += ' ORDER BY it.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch inventory transactions' });
    }
    res.json(results);
  });
});

app.get('/api/inventory/alerts', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const query = `
    SELECT 
      sa.*,
      p.name as product_name,
      p.sku,
      p.stock_quantity
    FROM stock_alerts sa
    LEFT JOIN products p ON sa.product_id = p.id
    WHERE sa.is_read = FALSE
    ORDER BY sa.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch stock alerts' });
    }
    res.json(results);
  });
});

app.put('/api/inventory/alerts/:id/read', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;

  db.query('UPDATE stock_alerts SET is_read = TRUE WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to mark alert as read' });
    }
    res.json({ message: 'Alert marked as read' });
  });
});

app.get('/api/inventory/reports', authenticateToken, requireAdmin, checkDatabaseConnection, (req, res) => {
  const { type = 'summary' } = req.query;

  if (type === 'summary') {
    const queries = {
      totalProducts: 'SELECT COUNT(*) as count FROM products WHERE status = "active"',
      totalValue: 'SELECT SUM(stock_quantity * cost_price) as value FROM products WHERE status = "active"',
      lowStockItems: 'SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level AND status = "active"',
      outOfStockItems: 'SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND status = "active"'
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
      db.query(query, (err, result) => {
        if (!err) {
          results[key] = result[0];
        }
        completed++;
        if (completed === total) {
          res.json(results);
        }
      });
    });
  } else {
    res.status(400).json({ message: 'Invalid report type' });
  }
});

// Cart routes
app.get('/api/cart', authenticateToken, checkDatabaseConnection, (req, res) => {
  const userId = req.user.userId;

  db.query(`
    SELECT ci.*, p.name, p.price, p.image_url, p.brand
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch cart' });
    }
    res.json(results);
  });
});

app.post('/api/cart', authenticateToken, checkDatabaseConnection, (req, res) => {
  const userId = req.user.userId;
  const { productId, size, quantity } = req.body;

  // Check if item already exists in cart
  db.query('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ?',
    [userId, productId, size], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to add to cart' });
      }

      if (results.length > 0) {
        // Update existing item
        db.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
          [quantity, results[0].id], (err) => {
            if (err) {
              return res.status(500).json({ message: 'Failed to update cart' });
            }
            res.json({ message: 'Cart updated successfully' });
          });
      } else {
        // Add new item
        db.query('INSERT INTO cart_items (user_id, product_id, size, quantity) VALUES (?, ?, ?, ?)',
          [userId, productId, size, quantity], (err) => {
            if (err) {
              return res.status(500).json({ message: 'Failed to add to cart' });
            }
            res.json({ message: 'Item added to cart' });
          });
      }
    });
});

app.delete('/api/cart/:id', authenticateToken, checkDatabaseConnection, (req, res) => {
  const userId = req.user.userId;
  const itemId = req.params.id;

  db.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [itemId, userId], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to remove item' });
    }
    res.json({ message: 'Item removed from cart' });
  });
});

// Order routes
app.post('/api/orders', authenticateToken, checkDatabaseConnection, async (req, res) => {
  const userId = req.user.userId;
  const { items, totalAmount, orderType = 'online' } = req.body;

  db.beginTransaction(async (err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to create order' });
    }

    try {
      // Create order
      const orderResult = await new Promise((resolve, reject) => {
        db.query('INSERT INTO orders (user_id, total_amount, order_type) VALUES (?, ?, ?)',
          [userId, totalAmount, orderType], (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
      });

      const orderId = orderResult.insertId;

      // Insert order items and update inventory
      for (const item of items) {
        await new Promise((resolve, reject) => {
          db.query('INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (?, ?, ?, ?, ?)',
            [orderId, item.productId, item.size, item.quantity, item.price], (err) => {
              if (err) reject(err);
              else resolve();
            });
        });

        // reduce procuct according to size
         await new Promise((resolve, reject) => {
          db.query('UPDATE product_sizes SET quantity = quantity - ? WHERE product_id = ? AND size = ?',
            [item.quantity, item.productId, item.size], (err) => {
              if (err) reject(err);
              else resolve();
            });
        });

        // Update inventory
        await updateInventory(
          item.productId,
          -item.quantity,
          'out',
          `Order #${orderId}`,
          orderId,
          'order',
          userId
        );
      }

      // Clear cart for online orders
      if (orderType === 'online') {
        await new Promise((resolve, reject) => {
          db.query('DELETE FROM cart_items WHERE user_id = ?', [userId], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      db.commit((err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: 'Failed to complete order' });
          });
        }
        res.json({ message: 'Order created successfully', orderId });
      });

    } catch (error) {
      db.rollback(() => {
        console.error('Order creation error:', error);
        res.status(500).json({ message: 'Failed to create order' });
      });
    }
  });
});

app.get('/api/orders', authenticateToken, checkDatabaseConnection, (req, res) => {
  const userId = req.user.userId;
  const isAdmin = req.user.role === 'admin';

  let query = `
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o
    JOIN users u ON o.user_id = u.id
  `;
  let params = [];

  if (!isAdmin) {
    query += ' WHERE o.user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY o.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch orders' });
    }
    res.json(results);
  });
});

app.post('/api/orders/:id', authenticateToken, checkDatabaseConnection, (req, res) => {
  const { id } = req.params;
  const user = req.body;
  
  // Get order details
  const orderQuery = `
    SELECT 
      o.*, 
      u.name as customer_name, 
      u.email as customer_email, 
      u.phone as customer_phone,
      u.address as customer_address,
      u.city as customer_city,
      u.state as customer_state,
      u.zip_code as customer_zip
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
    ${user.role !== 'admin' ? 'AND o.user_id = ?' : ''}
  `;
  
  const orderParams = user.role !== 'admin' ? [id, user.userId] : [id];
  
  db.query(orderQuery, orderParams, (err, orderResults) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch order' });
    }
    
    if (orderResults.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orderResults[0];
    
    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*, 
        p.name as product_name, 
        p.brand, 
        p.image_url,
        p.sku
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    
    db.query(itemsQuery, [id], (err, itemsResults) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch order items' });
      }
      
      order.items = itemsResults;
      res.json(order);
    });
  });
});





app.get('/api/manage/orders', authenticateToken, (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status = '', 
    order_type = '', 
    payment_method = '',
    search = '',
    date_from = '',
    date_to = '',
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.query;

  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: 'Access denied. User role not found.' });
  }
  
  let query = `
    SELECT 
      o.id, o.user_id, o.total_amount, o.status, o.order_type, 
      o.payment_method, o.created_at,
      u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
      COUNT(oi.id) as item_count,
      GROUP_CONCAT(CONCAT(p.name, ' (', oi.quantity, ')') SEPARATOR ', ') as items_summary
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE 1=1
  `;
  const params = [];
  
  // Apply filters
  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  
  if (order_type) {
    query += ' AND o.order_type = ?';
    params.push(order_type);
  }
  
  if (payment_method) {
    query += ' AND o.payment_method = ?';
    params.push(payment_method);
  }
  
  if (search) {
    query += ' AND (o.id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (date_from) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(date_from);
  }
  
  if (date_to) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(date_to);
  }
  
  // Non-admin users can only see their own orders
  if (req.user.role !== 'admin') {
    query += ' AND o.user_id = ?';
    params.push(req.user.id);
  }
  
  query += ' GROUP BY o.id';
  
  // Sorting
  const validSortFields = ['id', 'total_amount', 'status', 'created_at', 'customer_name'];
  const validSortOrders = ['ASC', 'DESC'];
  
  if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
    if (sortBy === 'customer_name') {
      query += ` ORDER BY u.name ${sortOrder.toUpperCase()}`;
    } else {
      query += ` ORDER BY o.${sortBy} ${sortOrder.toUpperCase()}`;
    }
  } else {
    query += ' ORDER BY o.created_at DESC';
  }
  
  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as total 
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE 1=1 ${status ? 'AND o.status = ?' : ''} 
    ${order_type ? 'AND o.order_type = ?' : ''}
    ${payment_method ? 'AND o.payment_method = ?' : ''}
    ${search ? 'AND (o.id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)' : ''}
    ${date_from ? 'AND DATE(o.created_at) >= ?' : ''}
    ${date_to ? 'AND DATE(o.created_at) <= ?' : ''}
    ${req.user.role !== 'admin' ? 'AND o.user_id = ?' : ''}
  `;
  
  db.query(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to get order count' });
    }
    
    const total = countResult[0].total;
    const offset = (page - 1) * limit;
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.query(query, params, (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch orders' });
      }
      
      res.json({
        orders: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    });
  });
});



// POS specific route
app.post('/api/pos/order', authenticateToken, checkDatabaseConnection, async (req, res) => {
  const { items, totalAmount, paymentMethod = 'cash', customerInfo } = req.body;
  const userId = req.user.userId;

  db.beginTransaction(async (err) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to create POS order' });
    }

    try {
      // Create order without user_id for walk-in customers
      const orderResult = await new Promise((resolve, reject) => {
        db.query('INSERT INTO orders (total_amount, order_type, payment_method, status) VALUES (?, ?, ?, ?)',
          [totalAmount, 'pos', paymentMethod, 'processing'], (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
      });

      const orderId = orderResult.insertId;

      // Insert order items and update inventory
      for (const item of items) {
        await new Promise((resolve, reject) => {
          db.query('INSERT INTO order_items (order_id, product_id, size, quantity, price) VALUES (?, ?, ?, ?, ?)',
            [orderId, item.id, item.size, item.quantity, item.price], (err) => {
              if (err) reject(err);
              else resolve();
            });
        });

        // Update inventory
        await updateInventory(
          item.id,
          -item.quantity,
          'out',
          `POS Order #${orderId}`,
          orderId,
          'order',
          userId
        );
      }

      // Update cash drawer if cash payment
      if (paymentMethod === 'cash') {
        await new Promise((resolve, reject) => {
          db.query(
            'SELECT * FROM cash_drawers WHERE user_id = ? AND is_open = TRUE ORDER BY opened_at DESC LIMIT 1',
            [userId],
            (err, drawerResults) => {
              if (err) {
                reject(err);
                return;
              }

              if (drawerResults.length > 0) {
                const drawer = drawerResults[0];
                const newBalance = drawer.current_balance + parseFloat(totalAmount);
                const newTotalSales = drawer.total_sales + parseFloat(totalAmount);

                db.query(
                  'UPDATE cash_drawers SET current_balance = ?, total_sales = ? WHERE id = ?',
                  [newBalance, newTotalSales, drawer.id],
                  (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }

                    // Record cash transaction
                    db.query(
                      'INSERT INTO cash_transactions (drawer_id, transaction_type, amount, reason, reference_id, reference_type, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                      [drawer.id, 'sale', totalAmount, 'POS Sale', orderId, 'order', userId],
                      (err) => {
                        if (err) {
                          reject(err);
                        } else {
                          resolve();
                        }
                      }
                    );
                  }
                );
              } else {
                resolve(); // No open drawer, continue without updating
              }
            }
          );
        });
      }

      db.commit((err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ message: 'Failed to complete order' });
          });
        }
        res.json({ message: 'POS order created successfully', orderId });
      });

    } catch (error) {
      db.rollback(() => {
        console.error('POS order creation error:', error);
        res.status(500).json({ message: 'Failed to create POS order' });
      });
    }
  });
});

app.get('/api/reviews/product/:productId', (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = ['created_at', 'rating', 'helpful_count'];
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const query = `
    SELECT 
      pr.*,
      u.name,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM orders o 
          JOIN order_items oi ON o.id = oi.order_id 
          WHERE o.user_id = pr.user_id AND oi.product_id = pr.product_id
        ) THEN 1 
        ELSE 0 
      END as verified_purchase
    FROM product_reviews pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.product_id = ?
    ORDER BY pr.${validSortBy} ${validSortOrder}
    LIMIT ${parseInt(limit)} OFFSET ${offset}
  `;

  db.execute(query, [productId], (err, reviews) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    db.execute(
      'SELECT COUNT(*) as total FROM product_reviews WHERE product_id = ?',
      [productId],
      (err, countResult) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Get rating summary
        db.execute(
          `SELECT 
            AVG(rating) as average_rating,
            COUNT(*) as total_reviews,
            SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
            SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
            SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
            SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
            SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
           FROM product_reviews WHERE product_id = ?`,
          [productId],
          (err, summaryResult) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            const summary = summaryResult[0] || {
              average_rating: 0,
              total_reviews: 0,
              five_star: 0,
              four_star: 0,
              three_star: 0,
              two_star: 0,
              one_star: 0
            };

            res.json({
              reviews,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / parseInt(limit))
              },
              summary
            });
          }
        );
      }
    );
  });
});

// Add a review
app.post('/api/reviews', authenticateToken, (req, res) => {
  const { productId, rating, title, comment, userId } = req.body;
  console.log('User ID:', userId);

  if (!productId || !rating || !title || !comment) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  // Check if user has already reviewed this product
  db.execute(
    'SELECT id FROM product_reviews WHERE product_id = ? AND user_id = ?',
    [productId, userId],
    (err, existingReview) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingReview.length > 0) {
        return res.status(500).json({ error: 'You have already reviewed this product' });
      }
      
      // Check if user has purchased this product
      db.execute(
        `SELECT 1 FROM orders o 
         JOIN order_items oi ON o.id = oi.order_id 
         WHERE o.user_id = ? AND oi.product_id = ?`,
        [userId, productId],
        (err, purchase) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          const verifiedPurchase = purchase.length > 0 ? 1 : 0;
          console.log('Verified purchase');
          // Insert review
          db.execute(
            `INSERT INTO product_reviews (product_id, user_id, rating, title, comment, verified_purchase) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [productId, userId, rating, title, comment, verifiedPurchase],
            (err, result) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to add review' });
              }

              // Update product rating
              updateProductRating(productId);

              res.status(201).json({
                message: 'Review added successfully',
                reviewId: result.insertId
              });
            }
          );
        }
      );
    }
  );
});

// Update a review
app.put('/api/reviews/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { rating, title, comment, userId } = req.body;


  if (!rating || !title || !comment) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  db.execute(
    `UPDATE product_reviews 
     SET rating = ?, title = ?, comment = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`,
    [rating, title, comment, id, userId],
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Review not found or unauthorized' });
      }

      // Get product ID to update rating
      db.execute(
        'SELECT product_id FROM product_reviews WHERE id = ?',
        [id],
        (err, reviewResult) => {
          if (!err && reviewResult.length > 0) {
            updateProductRating(reviewResult[0].product_id);
          }
        }
      );

      res.json({ message: 'Review updated successfully' });
    }
  );
});

// Delete a review
app.delete('/api/reviews/:userId/:id', authenticateToken, (req, res) => {
  const { userId, id } = req.params;

  // Get product ID before deletion
  db.execute(
    'SELECT product_id FROM product_reviews WHERE id = ? AND user_id = ?',
    [id, userId],
    (err, reviewResult) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (reviewResult.length === 0) {
        return res.status(404).json({ error: 'Review not found or unauthorized' });
      }

      const productId = reviewResult[0].product_id;

      db.execute(
        'DELETE FROM product_reviews WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, result) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Update product rating
          updateProductRating(productId);

          res.json({ message: 'Review deleted successfully' });
        }
      );
    }
  );
});

// Vote on review helpfulness
app.post('/api/reviews/:id/vote', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { isHelpful } = req.body;
  const userId = req.user.userId;

  if (typeof isHelpful !== 'boolean') {
    return res.status(400).json({ error: 'isHelpful must be a boolean' });
  }

  // Check if user has already voted on this review
  db.execute(
    'SELECT id FROM review_votes WHERE review_id = ? AND user_id = ?',
    [id, userId],
    (err, existingVote) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingVote.length > 0) {
        // Update existing vote
        db.execute(
          'UPDATE review_votes SET is_helpful = ? WHERE id = ?',
          [isHelpful, existingVote[0].id],
          (err, result) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            updateReviewHelpfulness(id);
            res.json({ message: 'Vote updated successfully' });
          }
        );
      } else {
        // Insert new vote
        db.execute(
          'INSERT INTO review_votes (review_id, user_id, is_helpful) VALUES (?, ?, ?)',
          [id, userId, isHelpful],
          (err, result) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            updateReviewHelpfulness(id);
            res.json({ message: 'Vote recorded successfully' });
          }
        );
      }
    }
  );
});

// Get user's review for a product
app.get('/api/reviews/user/:userId/:productId', authenticateToken, (req, res) => {
  const { productId, userId } = req.params;
  db.execute(
    'SELECT * FROM product_reviews WHERE product_id = ? AND user_id = ?',
    [productId, userId],
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    
      res.json(result.length > 0 ? result[0] : null);
    }
  );
});



// Helper function to update product rating
function updateProductRating(productId) {
  db.execute(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM product_reviews WHERE product_id = ?',
    [productId],
    (err, result) => {
      if (!err && result.length > 0) {
        const { avg_rating, review_count } = result[0];
        db.execute(
          'UPDATE product_reviews SET rating = ?, helpful_count = ? WHERE id = ?',
          [avg_rating || 0, review_count || 0, productId],
          (err) => {
            if (err) {
              console.error('Error updating product rating:', err);
            }
          }
        );
      }
    }
  );
}

// Helper function to update review helpfulness count
function updateReviewHelpfulness(reviewId) {
  db.execute(
    'SELECT COUNT(*) as helpful_count FROM review_votes WHERE review_id = ? AND is_helpful = 1',
    [reviewId],
    (err, result) => {
      if (!err && result.length > 0) {
        const { helpful_count } = result[0];
        db.execute(
          'UPDATE product_reviews SET helpful_count = ? WHERE id = ?',
          [helpful_count || 0, reviewId],
          (err) => {
            if (err) {
              console.error('Error updating review helpfulness:', err);
            }
          }
        );
      }
    }
  );
}






//=================================order Management API====================================








// =========================== End Order Management API ===========================











// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

console.log('Serving from:', path.join(__dirname, '..', 'client', 'dist'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.end(() => {
    console.log('Database connection closed.');
    process.exit(0);
  });
});

