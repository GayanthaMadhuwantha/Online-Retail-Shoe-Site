# SoleStyle - Complete Shoe Store Application

A full-stack e-commerce application built with React.js, Express.js, and MySQL featuring both online shopping and Point of Sale (POS) functionality.

## Features

### Customer Features
- Browse products with search and filtering
- Product details with size selection
- Shopping cart management
- User authentication (register/login)
- Order checkout and tracking
- Order history

### Admin Features
- Admin dashboard with sales analytics
- Point of Sale (POS) system for in-store purchases
- Order management
- Product inventory viewing

### Technical Features
- Responsive design for all devices
- RESTful API backend
- JWT authentication
- MySQL database with proper relationships
- Modern UI with Tailwind CSS

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL server
- npm or yarn package manager

### Database Setup
1. Create a MySQL database named `shoe_store`
2. Update the database credentials in `.env` file:
   ```
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=shoe_store
   ```

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

This will start both the frontend (port 5173) and backend (port 3001) servers.

### Default Admin Account
- Email: admin@shoestore.com
- Password: admin123

## API Endpoints

### Authentication
- POST /api/auth/register - User registration
- POST /api/auth/login - User login

### Products
- GET /api/products - Get all products
- GET /api/products/:id - Get product by ID
- GET /api/categories - Get all categories

### Cart
- GET /api/cart - Get user's cart
- POST /api/cart - Add item to cart
- DELETE /api/cart/:id - Remove item from cart

### Orders
- POST /api/orders - Create new order
- GET /api/orders - Get user's orders (admin gets all)
- POST /api/pos/order - Create POS order

## Database Schema

### Tables
- users (id, name, email, password, role, created_at)
- categories (id, name, description)
- products (id, name, description, price, category_id, brand, image_url, stock_quantity, created_at)
- product_sizes (id, product_id, size, quantity)
- orders (id, user_id, total_amount, status, order_type, created_at)
- order_items (id, order_id, product_id, size, quantity, price)
- cart_items (id, user_id, product_id, size, quantity, created_at)

## Technologies Used

### Frontend
- React 18
- React Router DOM
- Tailwind CSS
- Lucide React (icons)
- Context API for state management

### Backend
- Express.js
- MySQL2
- JWT for authentication
- bcrypt for password hashing
- CORS for cross-origin requests

## Project Structure

```
src/
├── components/         # Reusable UI components
├── contexts/          # React Context providers
├── pages/             # Page components
├── App.jsx            # Main application component
├── main.jsx           # Application entry point
└── index.css          # Global styles

server/
└── index.js           # Express server and API routes
```

## Usage

1. **Customer Flow:**
   - Browse products on the homepage
   - Search and filter products
   - Add items to cart
   - Create account or login
   - Complete checkout process

2. **Admin Flow:**
   - Login with admin credentials
   - Access dashboard for analytics
   - Use POS system for in-store sales
   - View and manage orders

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.