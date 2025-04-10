# E-commerce API

A RESTful API for an e-commerce platform built with Node.js, Express, and MongoDB.

## Overview

This API provides endpoints for managing users, products, and categories for an e-commerce application. It includes features such as user authentication, role-based access control, product management with image uploads, and more.

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Bcrypt for password hashing

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd <repository-directory>
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
API_URL=/api/v1
MONGO_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_jwt_secret
```

4. Create directory for uploads
```bash
mkdir -p public/uploads
```

5. Start the server
```bash
npm start
```

## API Routes

### User Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/v1/users/register` | Register a new user | Public |
| POST | `/api/v1/users/login` | Authenticate user and get token | Public |
| GET | `/api/v1/users/profile` | Get user profile | User |
| PUT | `/api/v1/users/profile` | Update user profile | User |
| DELETE | `/api/v1/users/profile` | Delete user account | User |
| GET | `/api/v1/users` | Get all users | Admin |
| GET | `/api/v1/users/:id` | Get user by ID | Admin |
| PUT | `/api/v1/users/:id` | Update user | Admin |
| DELETE | `/api/v1/users/:id` | Delete user | Admin |
| GET | `/api/v1/users/sellers` | Get all sellers | Public |

### Product Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/products` | Get all products with filters and pagination | Public |
| GET | `/api/v1/products/:id` | Get product by ID | Public |
| POST | `/api/v1/products` | Create new product | Admin/Seller |
| PUT | `/api/v1/products/:id` | Update product | Admin/Seller |
| DELETE | `/api/v1/products/:id` | Delete product | Admin/Seller |
| PUT | `/api/v1/products/gallery-images/:id` | Update product image gallery | Admin/Seller |
| GET | `/api/v1/products/get/count` | Get total product count | Public |
| GET | `/api/v1/products/get/featured/:count?` | Get featured products | Public |
| GET | `/api/v1/products/get/categories/:categories` | Get products by categories | Public |
| GET | `/api/v1/products/get/attributes` | Get unique product attributes | Public |

## Request & Response Examples

### User Registration

**Request:**
```http
POST /api/v1/users/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "user",
  "state": "Lagos",
  "country": "Nigeria"
}
```

**Response:**
```json
{
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phone": "+1234567890"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Create Product

**Request:**
```http
POST /api/v1/products
Content-Type: multipart/form-data
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "name": "Product Name",
  "description": "Product description",
  "brand": "Brand Name",
  "price": 99.99,
  "colour": "red",
  "size": "XL",
  "category": "60d21b4667d0d8992e610c85",
  "countInStock": 10,
  "image": [file upload]
}
```

**Response:**
```json
{
  "id": "60d21b4667d0d8992e610c86",
  "name": "Product Name",
  "description": "Product description",
  "image": "http://localhost:3000/public/uploads/product-image-1624291123456.jpeg",
  "brand": "Brand Name",
  "price": 99.99,
  "colour": "red",
  "size": "XL",
  "category": "60d21b4667d0d8992e610c85",
  "countInStock": 10,
  "rating": 0,
  "dateCreated": "2023-06-21T12:58:43.456Z"
}
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected routes, include the JWT token in the request headers as follows:

```
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## File Upload

Product images can be uploaded using multipart/form-data. The API accepts the following image formats:
- PNG (.png)
- JPEG/JPG (.jpg, .jpeg)

Images are stored in the `public/uploads` directory.

## Role-based Access Control

The API implements role-based access with three roles:
- **user**: Regular customer with basic privileges
- **seller**: Can manage their own products
- **admin**: Has full access to all resources

## Models

### User Model

```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, min length: 8),
  passwordHash: String (required),
  phone: String (required),
  role: String (enum: ['user', 'admin', 'seller'], default: 'user'),
  marketLocation: String (required for sellers),
  description: String (required for sellers),
  localGovernmentArea: String (required for sellers, max length: 500),
  state: String (required),
  country: String (required)
}
```

### Product Model

```javascript
{
  name: String (required),
  description: String (required),
  image: String,
  images: [String],
  brand: String,
  price: Number (required, min: 0),
  colour: String (required),
  size: Mixed (required),
  category: ObjectId (reference to Category model, required),
  countInStock: Number (required, min: 0, max: 1000),
  rating: Number (default: 0, min: 0, max: 5),
  dateCreated: Date (default: Date.now)
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 200: Success
- 201: Resource created
- 400: Bad request (validation error)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Resource not found
- 500: Server error

## License

[MIT License](LICENSE)