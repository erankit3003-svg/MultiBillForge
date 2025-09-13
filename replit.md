# BillMaster Pro - Multi-Tenant Billing Management System

## Overview

BillMaster Pro is a comprehensive multi-tenant billing and invoice management system built with React, Express.js, and PostgreSQL. The application supports multiple companies, role-based access control, and complete billing workflows including customers, products, invoices, and reporting. It features a modern UI built with shadcn/ui components and provides secure authentication with JWT tokens.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The client-side is built with React 18 and TypeScript, utilizing a modern component-based architecture:

- **Build System**: Vite for fast development and optimized production builds
- **UI Framework**: React with functional components and hooks
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Design System**: Custom theme with CSS variables supporting light/dark modes

The frontend follows a page-based routing structure with shared components for layout (sidebar, header) and reusable UI components. Authentication state is managed through a React context provider with automatic token handling.

### Backend Architecture

The server is built with Express.js and follows a RESTful API design:

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js with middleware for JSON parsing, CORS, and error handling
- **Data Storage**: File-based JSON storage for development (designed for easy migration to PostgreSQL)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Authorization**: Role-based access control with granular permissions
- **API Structure**: Modular route handlers with middleware for authentication and permission checking

The backend implements a service layer pattern with separate services for authentication and PDF generation. Company-scoped data access ensures proper multi-tenant isolation.

### Data Storage Solutions

Currently uses file-based JSON storage for rapid development and testing:

- **Storage Interface**: Abstract storage interface allowing easy database migration
- **Data Models**: Strongly typed with Zod schemas for validation
- **Multi-tenancy**: Company-scoped data access with proper isolation
- **Migration Ready**: Drizzle ORM configuration prepared for PostgreSQL transition

### Authentication and Authorization

Implements a comprehensive security model:

- **Authentication**: JWT tokens with configurable expiration
- **Password Security**: bcrypt hashing with salt rounds
- **Session Management**: Stateless JWT approach with localStorage persistence
- **Authorization**: Role-based permissions system with module-level access control
- **Multi-tenant Security**: Company-scoped data access with user role validation

### External Dependencies

The system integrates several key external services and libraries:

- **UI Components**: Radix UI primitives for accessible component foundation
- **PDF Generation**: jsPDF for invoice PDF creation and export
- **Database**: Neon (PostgreSQL) serverless database for production deployment
- **Form Validation**: Zod schemas for runtime type checking and validation
- **Build Tools**: Vite with TypeScript support and hot module replacement
- **Development**: Replit-specific plugins for cartographer and dev banner

The architecture is designed for scalability with clear separation of concerns, making it easy to migrate from file-based storage to PostgreSQL and add new features while maintaining security and performance.