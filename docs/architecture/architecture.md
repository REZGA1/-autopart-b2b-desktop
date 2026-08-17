# AutoPart B2B Desktop - Architecture Overview

## Project Structure

This is a full-stack B2B auto parts management application with desktop deployment support.

### Directory Structure

```
AutoPart B2B Desktop/
├── frontend/          # React 19 + Vite frontend application
├── backend/           # Express.js backend API
├── desktop/           # Electron desktop wrapper
└── docs/             # Documentation
```

## Frontend Architecture

### Technology Stack
- **Framework**: React 19 with Vite 8
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui 4
- **State Management**: Zustand 5 with persistence
- **Forms**: react-hook-form 7 + Zod 4
- **HTTP Client**: Axios with interceptors for JWT refresh

### Frontend Structure
```
frontend/src/
├── api/              # API client and API function exports
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   ├── common/      # Shared components
│   └── admin/       # Admin-specific components
├── pages/           # Page components organized by feature
│   ├── auth/        # Authentication pages
│   ├── home/        # Home page
│   ├── inventory/   # Inventory management
│   ├── suppliers/   # Supplier catalog
│   ├── store/       # Store management
│   ├── vehicles/    # Vehicle management
│   ├── statistics/  # Statistics and reports
│   └── profile/     # User profile
├── services/        # Business logic API calls
├── stores/          # Zustand state stores
├── hooks/           # Custom React hooks
├── schemas/         # Zod validation schemas
├── constants/       # Shared constants
└── lib/             # Utility functions
```

## Backend Architecture

### Technology Stack
- **Framework**: Express.js 5.2 (CommonJS)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with refresh tokens
- **File Upload**: Multer with memory storage
- **Security**: Helmet, CORS with credentials

### Backend Structure
```
backend/
├── api/              # API entry point
├── config/          # Configuration files
├── controllers/     # Request handlers
├── services/        # Business logic layer
├── repositories/    # Data access layer (formerly models)
├── routes/          # Express route definitions
├── middleware/      # Express middleware
├── validators/      # Input validation logic
├── constants/       # Shared constants
├── utils/           # Utility functions
└── supabase/        # Supabase functions and migrations
```

## Key Architectural Patterns

### Backend Layered Architecture
1. **Routes**: Define API endpoints and route middleware
2. **Controllers**: Handle HTTP requests/responses
3. **Services**: Contain business logic
4. **Repositories**: Handle data access to Supabase
5. **Validators**: Validate input data

### Frontend Component Organization
- **Feature-based**: Pages organized by business feature
- **Shared components**: Common UI elements in `components/common/`
- **UI components**: Base UI components from shadcn/ui in `components/ui/`

### Authentication Flow
- JWT access token stored in localStorage
- Refresh token stored in HTTP-only cookie
- Automatic token refresh via Axios interceptors
- Token refresh event system for state synchronization

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/upload-avatar` - Upload avatar
- `POST /api/auth/upload-document` - Upload document

### Inventory
- `GET /api/inventory/products` - Get products
- `POST /api/inventory/products` - Create product
- `PUT /api/inventory/products/:id` - Update product
- `DELETE /api/inventory/products/:id` - Delete product
- `GET /api/inventory/transactions` - Get transactions

### Supplier Catalog
- `GET /api/supplier/catalog/products` - Get supplier products
- `POST /api/supplier/catalog/products` - Create supplier product
- `PUT /api/supplier/catalog/products/:id` - Update supplier product
- `DELETE /api/supplier/catalog/products/:id` - Delete supplier product

### Store
- `GET /api/store/requests` - Get purchase requests
- `POST /api/store/requests` - Create purchase request
- `PUT /api/store/requests/:id` - Update request status

## Database Schema

### Main Tables
- `profiles` - User profiles and merchant/supplier data
- `products` - Merchant inventory products
- `supplier_products` - Supplier catalog products
- `inventory_transactions` - Stock movement records
- `purchase_requests` - Store purchase requests
- `vehicles` - Vehicle compatibility data

## Desktop Deployment

The Electron wrapper (`desktop/`) packages the frontend as a desktop application with:
- Main process: Electron main entry point
- Preload script: Secure context bridge
- Build scripts: Renderer copying and build automation

## Security Considerations

- JWT tokens with automatic refresh
- HTTP-only cookies for refresh tokens
- CORS configuration for credential-based auth
- Helmet.js for security headers
- Input validation at multiple layers
- Supabase Row Level Security (RLS) policies

## Development Workflow

1. **Frontend**: Vite dev server on port 5173
2. **Backend**: Express server on port 3000
3. **Desktop**: Electron development mode
4. **Database**: Supabase development instance

## Code Conventions

- **Backend**: CommonJS modules
- **Frontend**: ES6 modules
- **No TypeScript**: Pure JavaScript only
- **State**: Zustand for state management
- **Styling**: Tailwind CSS utility classes
- **Validation**: Joi (backend) + Zod (frontend)