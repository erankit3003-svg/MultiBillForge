# BillMaster Pro - Multi-Tenant Billing Management System

A comprehensive multi-company, multi-user billing management system built with React, Express.js, and JWT authentication.

## 🚀 Features

### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control** with 4 user roles:
  - **Super Admin**: Full system access across all companies
  - **Company Admin**: Full access within company scope
  - **Manager**: Limited management access within company
  - **User**: Basic read-only access within company

### Multi-Tenant Architecture
- **Company isolation**: Complete data separation between companies
- **Company management**: Super Admin can create and manage multiple companies
- **User management**: Role-based user creation and permission assignment
- **Data scoping**: All data is automatically scoped to user's company

### Core Modules
- **Product Management**: Create, manage, and organize products/services
- **Customer Management**: Comprehensive customer relationship management
- **Invoice Management**: Multi-product invoices with automatic calculations
- **PDF Generation**: Professional invoice PDFs with company branding
- **Dashboard Analytics**: Revenue tracking and business insights
- **Sales Reporting**: Advanced reporting with filtering capabilities

### Data Storage
- **JSON file-based storage** for simplicity and portability
- **Separate data files** for each module (companies, users, products, etc.)
- **Tenant isolation** using company_id in all records
- **Role-based permissions** stored in dedicated files

## 🏃 Quick Start

### Prerequisites
- Node.js 20+ installed
- npm or yarn package manager

### Installation & Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Open your browser to `http://localhost:5000`
   - The system will be running with pre-loaded demo data

## 🔐 Demo Accounts

### Super Admin Account
- **Email**: `super@admin.com`
- **Password**: `password`
- **Access**: Full system access, can manage all companies and users

### Company Admin Account
- **Email**: `admin@acme.com`  
- **Password**: `password`
- **Access**: Full access to Acme Corporation data only

### Manager Account
- **Email**: `manager@acme.com`
- **Password**: `password`
- **Access**: Limited management access to Acme Corporation

## 📁 Project Structure

```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages/views
│   │   ├── lib/           # Utility functions and auth helpers
│   │   └── hooks/         # Custom React hooks
├── server/                # Express.js backend application
│   ├── data/              # JSON data storage files
│   ├── services/          # Business logic services
│   ├── routes.ts          # API route definitions
│   └── storage.ts         # Data access layer
├── shared/                # Shared types and schemas
│   └── schema.ts          # Zod validation schemas
└── README.md             # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login with email/password
- `GET /api/auth/me` - Get current user information

### Company Management
- `GET /api/companies` - List all companies (Super Admin only)
- `POST /api/companies` - Create new company (Super Admin only)
- `PUT /api/companies/:id` - Update company (Super Admin only)
- `DELETE /api/companies/:id` - Delete company (Super Admin only)

### User Management
- `GET /api/users` - List company users (permission-based)
- `POST /api/users` - Create new user (permission-based)
- `PUT /api/users/:id` - Update user (permission-based)
- `DELETE /api/users/:id` - Delete user (permission-based)

### Product Management
- `GET /api/products` - List company products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Customer Management
- `GET /api/customers` - List company customers
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Invoice Management
- `GET /api/invoices` - List company invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `GET /api/invoices/:id/pdf` - Download invoice PDF

### Analytics
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/roles` - Get available user roles

## 🎨 Technology Stack

### Frontend
- **React** - User interface library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Modern component library
- **Wouter** - Lightweight routing
- **TanStack Query** - Data fetching and caching
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Backend
- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe JavaScript
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **jsPDF** - PDF generation
- **Zod** - Input validation

### Storage
- **JSON Files** - Simple file-based data storage
- **File System** - Direct file operations for data persistence

## 🛡️ Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt with salt rounds
- **Role-Based Permissions** for fine-grained access control
- **Company Data Isolation** preventing cross-tenant data access
- **Input Validation** using Zod schemas on all endpoints
- **Middleware Protection** on all authenticated routes

## 📊 Data Model

### Companies
- Company information, branding, and settings
- Isolated tenant boundaries

### Users
- User accounts with role assignments
- Company-scoped access control

### Products
- Products/services catalog
- Pricing and categorization

### Customers
- Customer contact information
- Company-scoped customer base

### Invoices
- Multi-line invoices with calculations
- Status tracking and PDF generation

### Permissions
- Granular CRUD permissions per role and module
- Configurable access control matrix

## 🔄 Development Workflow

1. **Make Changes**: Edit source files in `client/` or `server/`
2. **Auto-Reload**: Development server automatically restarts
3. **Test Features**: Use demo accounts to test functionality
4. **Check Logs**: Monitor console for errors or issues

## 📝 Configuration

### Environment Variables
- `SESSION_SECRET` - JWT signing secret (automatically configured)
- `NODE_ENV` - Development/production environment

### Default Settings
- **JWT Expiry**: 24 hours
- **Password Salt Rounds**: 12
- **Default Tax Rate**: 8%
- **Server Port**: 5000

## 🚀 Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   export NODE_ENV=production
   export SESSION_SECRET=your-secure-secret-key
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

## 🤝 Support

For issues, questions, or feature requests, please refer to the application logs and check the browser console for detailed error information.

## 📄 License

This project is built as a demonstration of modern multi-tenant SaaS architecture patterns.