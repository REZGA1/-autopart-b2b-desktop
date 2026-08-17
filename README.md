# AutoPart B2B Desktop Application

Welcome to AutoPart B2B, a modern desktop application designed to simplify automotive parts management. This project was developed as a graduation project to connect auto parts merchants with suppliers, providing a complete and intuitive solution for managing inventory, vehicles, documents, and product catalogs.

## About the Project

### The Problem
In the automotive parts industry, inventory management, vehicle tracking, and supplier coordination can quickly become a nightmare without the right tools. Merchants lose time manually managing their inventories, checking availability, and communicating with suppliers.

### The Solution
AutoPart B2B is an allinone application that solves these problems by providing:

 **Centralized inventory management**: Track your products in realtime with stockout alerts
 **Vehicle database**: Easily manage your customers' vehicles and link them to compatible parts
 **Supplier catalog**: Browse your suppliers' products and compare prices
 **Document management**: Store and verify official documents (ID card, driver's license)
 **Modern interface**: A smooth and intuitive user experience thanks to React and Electron

### Why this application?
Unlike complex and expensive solutions on the market, AutoPart B2B is:
 **Free and opensource**
 **Easy to install and use**
 **Designed for the specific needs of the auto parts market**
 **Available as a desktop application for full accessibility**

## Tech Stack

We have chosen a modern and highperformance tech stack to ensure a smooth user experience and easy maintenance:

### Frontend (User Interface)
 **React 19**: The latest version of React for a reactive and highperformance interface
 **Vite 8**: An ultrafast build tool that makes development enjoyable
 **Tailwind CSS 4**: For modern and responsive design without writing tons of CSS
 **shadcn/ui 4**: Readytouse and customizable UI components
 **Zustand 5**: Simple and efficient state management (lightweight alternative to Redux)
 **React Router DOM 7**: For navigation between different pages
 **Axios**: For HTTP requests to our backend API
 **i18next**: Builtin multilingual support for future internationalization

### Backend (API Server)
 **Express 5.2**: Robust Node.js framework for our REST API
 **Supabase**: Cloudmanaged PostgreSQL database with builtin authentication
 **JWT (JSON Web Tokens)**: For secure and stateless authentication
 **Multer**: File upload management (images, documents)
 **Joi**: Serverside data validation to avoid errors
 **Vercel**: Used as a backup/fallback serverless hosting for the backend API (in case the primary Railway server is unavailable)

### Desktop (Desktop Application)
 **Electron**: To convert our web application into a native desktop application
 Allows running the app on Windows, Mac, and Linux without modification

## Installation Guide

### What you need before starting

Before installing AutoPart B2B, make sure you have:

 **Node.js**: The required version is specified in the `.nvmrc` file at the project root
 **npm or yarn**: To manage dependencies (npm is recommended)
 **A Supabase account**: You will need a Supabase project configured with the necessary tables
 **Git**: To clone the repository (if you don't have it already)

### Step 1: Clone the project

Start by cloning the repository to your local machine:

```bash
git clone <repositoryurl>
cd AutoPartB2BDesktop
```

### Step 2: Install dependencies

The project is divided into three parts (root, desktop, backend, frontend). Install dependencies for each:

```bash
# Install root dependencies
npm install

# Install Desktop dependencies
cd desktop && npm install && cd ..

# Install Backend dependencies
cd backend && npm install && cd ..

# Install Frontend dependencies
cd frontend && npm install && cd ..
```

> Tip: If you use npm 7+, you can simply run `npm install` at the root and it will automatically install all dependencies.

### Step 3: Configure Supabase

Before continuing, you need to configure your Supabase project:

1. Create a new project on [supabase.com](https://supabase.com)
2. In your Supabase dashboard, go to **Settings > API**
3. Note your **Project URL** and **keys** (anon and service_role)

### Step 4: Configure environment variables

Create your `.env` file from the template:

```bash
cp .env.example .env
```

Then, open the `.env` file and configure the following variables:

```env
# Supabase configuration
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=youranonkeyhere
SUPABASE_SERVICE_ROLE_KEY=yourservicerolekeyhere

# Server configuration
PORT=3000
NODE_ENV=development

# Document configuration
ALLOW_DOCUMENT_REUPLOAD=false
```

**Variable explanation:**

 **SUPABASE_URL**: Your Supabase project URL (available in the dashboard)
 **SUPABASE_ANON_KEY**: Public key for requests from the frontend
 **SUPABASE_SERVICE_ROLE_KEY**: Admin key (NEVER expose it on the frontend, used only by the backend)
 **PORT**: The port the backend server will listen on (3000 by default)
 **NODE_ENV**: `development` for dev, `production` for production
 **ALLOW_DOCUMENT_REUPLOAD**: Whether to allow reuploading of already validated documents

### Step 5: Initialize the database

You need to create the necessary tables in Supabase. The project includes the necessary SQL scripts (to be added in a `database/` folder or executed manually in Supabase's SQL Editor).

The main tables are:
 `merchants`: Information about merchants
 `products`: Product catalog
 `inventory_transactions`: Inventory movement history
 `vehicles`: Vehicle database
 `merchant_vehicles`: Merchantvehicles association
 `supplier_products`: Supplier catalog

## Running the Application

Once installation is complete, you have several options to run the application depending on your needs:

### Full Development Mode (Backend + Frontend)

This is the recommended method for development. It runs the backend server and frontend simultaneously:

```bash
npm run dev
```

This command will:
 Start the Express server on port 3000 (or the one configured in `.env`)
 Launch the Vite development server for the frontend
 Automatically open your browser on `http://localhost:5173`

### Run Backend only

If you want to work only on the API or test endpoints:

```bash
npm run dev:api
```

The backend will be available on `http://localhost:3000`

### Run Frontend only

To work only on the user interface:

```bash
npm run dev:web
```

The frontend will be available on `http://localhost:5173`

> Note: The frontend alone will not work properly without the backend running.

### Run Desktop Application (Electron)

To test the application in its desktop environment:

```bash
npm run desktop:dev
```

This will:
 Compile the frontend
 Launch an Electron window with your application
 Allow testing desktopspecific features

### Build Desktop Application

To create a build version of the desktop application:

```bash
npm run desktop:build
```

The build will be created in the `desktop/dist/` folder

### Create Installer

To generate an installation file (.exe on Windows, .dmg on Mac, .AppImage on Linux):

```bash
npm run desktop:installer
```

The installer will be created in the `desktop/dist/` folder

> ⚠️ **Important**: After changing the backend URL (e.g., switching to Vercel), you must rebuild the installer so that the new URL is embedded into the app.

## Backend Deployment — Vercel (Backup Server)

The backend API is primarily hosted on **Railway**. However, we also deploy it to **[Vercel](https://vercel.com)** as a **backup/fallback server** to ensure high availability. If the Railway server goes down or its free-tier period ends, the backend continues to work seamlessly via Vercel.

### How it works

The backend is a standard **Express.js** app. To make it work on Vercel (which uses serverless functions instead of a traditional long-running server), we added:

- **`backend/vercel.json`** — Routes all incoming requests to the Express app
- **`backend/api/index.js`** — Serverless entry point that exports `app` instead of calling `app.listen()`
- **`.env.production`** at the root — Points `VITE_API_URL` to the active backend URL (Railway or Vercel)

### Current active backend (production)

```
https://autopart-b2b-desktop.vercel.app/api
```

You can verify the backend is running by visiting:

```
https://autopart-b2b-desktop.vercel.app/api/health
```

Expected response:
```json
{ "status": "ok", "backend": "supabase" }
```

### Switching between Railway and Vercel

To switch the backend URL, update `.env.production` in the project root:

```env
# Use Vercel (backup)
VITE_API_URL=https://autopart-b2b-desktop.vercel.app/api

# Use Railway (primary)
# VITE_API_URL=https://autopart-b2b-desktop-production.up.railway.app/api
```

Then rebuild the desktop installer:

```bash

```

### Deploying to Vercel

If you need to redeploy the backend to Vercel:

1. Push your changes to GitHub — Vercel will auto-deploy from the `backend/` root directory
2. Or use the Vercel CLI:

```bash
cd backend
npx vercel --prod
```

3. Make sure all environment variables are set in the **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server-side only) |
| `JWT_SECRET` | Secret key for JWT token signing |
| `NODE_ENV` | Set to `production` |
| `CLIENT_URL` | Frontend/Desktop origin URL (for CORS) |


## Main Features

AutoPart B2B offers a complete set of features to manage your auto parts business:

### Inventory Management

The heart of the application. Manage your inventory with precision:

 **Full CRUD**: Add, edit, and delete products with just a few clicks
 **Image upload**: Associate photos with each product for easy identification
 **Movement history**: Every entry/exit is automatically recorded with date and reason
 **Smart alerts**: Receive notifications when a product is out of stock
 **Advanced filtering**: Filter by category, price, availability, etc.
 **Flexible sorting**: Sort by name, price, addition date, etc.
 **Quick search**: Find any product in seconds

### Vehicle Management

Manage your customers' vehicle database:

 **Add vehicles**: Register vehicles with their characteristics (make, model, year, engine)
 **Link productsvehicles**: Easily link compatible parts to each vehicle
 **Search by criteria**: Find a vehicle by license plate, make, model, etc.
 **History**: View the history of parts used for each vehicle

### Document Management

Secure and verify official documents:

 **ID card upload**: Store ID cards securely
 **License upload**: Manage your customers' driver's licenses
 **Verification**: Document verification status (pending, verified, rejected)
 **Reupload control**: Option to prevent reuploading of already verified documents
 **Secure storage**: Documents are stored in Supabase Storage with strict access control

### Supplier Catalog

Browse and compare your suppliers' products:

 **Full catalog**: Access all products available from your suppliers
 **Smart search**: Find products by reference, name, or category
 **Price comparison**: Compare prices between different suppliers
 **Supplier filters**: View products by specific supplier
 **Realtime update**: The catalog is synchronized with the database

### Secure Authentication

A robust authentication system to protect your data:

 **Login/Logout**: Simple and secure login interface
 **Registration**: Account creation with data validation
 **Session management**: Persistent sessions with JWT tokens
 **Automatic refresh**: Tokens are automatically renewed before expiration
 **Route protection**: Sensitive pages are protected by authentication
 **Password recovery**: (Feature to be implemented)

### Multilingual Interface

Prepared for internationalization:

 **i18next support**: Infrastructure ready to add new languages
 **English by default**: The interface is currently in English
 **Extensible**: Easily add French, Arabic, etc.

## Security

Security is a priority in AutoPart B2B. Here are the measures in place to protect your data:

### Authentication and Authorization

 **JWT (JSON Web Tokens)**: Use of tokens for stateless authentication
 **Tokens with expiration**: Tokens expire after a certain time to limit risks
 **Automatic refresh**: The system renews tokens before expiration
 **Roles and permissions**: Access control based on roles (merchant, admin, etc.)

### Data Protection

 **Password encryption**: Passwords are hashed with bcrypt before storage
 **Input validation**: All data is validated on the server side with Joi
 **Sanitization**: User inputs are cleaned to prevent injections
 **HTTPS recommended**: In production, always use HTTPS to encrypt communications

### API Security

 **Route protection**: Sensitive routes require authentication
 **Token verification**: Every protected request checks token validity
 **CORS configured**: CrossOrigin Resource Sharing properly configured to allow only authorized domains
 **Rate limiting**: (To be implemented) Limits the number of requests per user

### File Security

 **Upload validation**: Verification of the type and size of uploaded files
 **Secure storage**: Files are stored in Supabase Storage with access policies
 **Unique names**: Files are renamed to avoid collisions and attacks

### Best Practices

 **Never serviceRoleKey on frontend**: The admin key is never exposed to the client
 **Environment variables**: Secrets are stored in `.env` and never in code
 **Git ignore**: The `.env` file is in `.gitignore` to avoid leaks

## Important Notes

Some important points to keep in mind when using and developing AutoPart B2B:

### Configuration

 **.env file**: This file contains sensitive information (API keys, secrets). It is in `.gitignore` and should NEVER be committed to GitHub. Use `.env.example` as a template.
 **serviceRoleKey**: This Supabase admin key gives full access to the database. It should NEVER be used on the frontend. It is reserved only for the backend.
 **Supabase database**: Make sure to configure your database correctly before running the application. The necessary tables must be created with the correct relationships and RLS (Row Level Security) policies.

### Development

 **Pure JavaScript**: The project uses pure JavaScript (no TypeScript) according to project rules
 **CommonJS for backend**: The backend uses CommonJS (`require`) while the frontend uses ES Modules (`import`)
 **Zustand for state**: Do not use Redux or Context API for state management. Use Zustand as specified in the project rules
 **Tailwind CSS**: For styling, use Tailwind CSS with shadcn/ui components. Avoid CSS modules or custom CSS files

### Deployment

 **Environment variables in production**: In production, use `.env.production` for production environment specific variables
 **Production build**: Before deploying, make sure to build the application with `npm run build` for the frontend
 **Railway**: The project is configured to be deployed on Railway (see `railway.json` in the backend folder)

### Performance

 **Images**: Uploaded images are stored in Supabase Storage. Make sure to compress images before upload to optimize storage
 **Pagination**: For large product lists, use pagination to avoid overloading the interface

## Contribution

AutoPart B2B is an opensource project and contributions are welcome! Whether you are a developer, designer, or just a user, your help is valuable.

### How to contribute?

1. **Fork the project**: Create a copy of the repository on your GitHub account
2. **Create a branch**: `git checkout b feature/mynewfeature`
3. **Make your changes**: Code, test, and make sure everything works
4. **Commit your changes**: `git commit m 'Add my new feature'`
5. **Push to your branch**: `git push origin feature/mynewfeature`
6. **Open a Pull Request**: Describe your changes and submit for review

### Contribution guidelines

 **Follow the existing code style**: Respect project conventions (indentation, naming, etc.)
 **Test your changes**: Make sure everything works before submitting
 **Document**: Add comments if necessary and update documentation
 **Be patient**: Reviews may take time, we will do our best to respond quickly

### Types of contributions

 **Bug fixes**: Fix existing bugs
 **New features**: Add useful new features
 **UI/UX improvements**: Improve the interface and user experience
 **Documentation**: Improve documentation (README, comments, etc.)
 **Tests**: Add tests to improve coverage
 **Translations**: Add new languages (i18next infrastructure is ready)

### Bug reporting

If you find a bug, open an issue on GitHub with:
 A clear description of the problem
 Steps to reproduce the bug
 Screenshots if relevant
 Your environment (OS, Node.js version, browser, etc.)

## License

This project is licensed under **ISC**.

This means you are free to:
 Use the software for commercial or personal purposes
 Modify the software
 Distribute the software
 Sublicense the software

Under the following conditions:
 The license must be included with all copies of the software

For more details, see the LICENSE file at the project root.

## About the Team

AutoPart B2B is a **graduation project** developed by students passionate about web development and technological innovation.

### Project Goal

This project was designed to address a real need in the auto parts industry: simplify inventory management and improve communication between merchants and suppliers.

### Technologies Learned

During this project, we deepened our knowledge in:
 **Full Stack Development**: React and Express
 **Databases**: Supabase and PostgreSQL
 **Desktop Architecture**: Electronz **State Management**: Zustand
 **Design System**: Tailwind CSS and shadcn/ui
 **Security**: JWT, authentication, validation

### Acknowledgments

We would like to thank:
 Our professors for their guidance and support
 The opensource community for the tools and libraries used
 Supabase for their excellent BaaS platform
 Everyone who contributed closely or remotely to this project

## Roadmap / Future Features

Here are some features we plan to add in the future:

### Short Term
  Password recovery via email
  Data export to CSV/Excel
  Push notifications for stock alerts
  Dark/light mode

### Medium Term
  Mobile app (React Native)
  Online payment integration
  Billing system
  Dashboard with statistics and charts

### Long Term
 Artificial intelligence for stock prediction
 Integrated marketplace for transactions
 Public API for thirdparty integrations
 Full multicurrency and multilanguage support

### Useful Resources

 **Supabase Documentation**: [https://supabase.com/docs](https://supabase.com/docs)
 **React Documentation**: [https://react.dev](https://react.dev)
 **Electron Documentation**: [https://www.electronjs.org/docs](https://www.electronjs.org/docs)
 **Tailwind CSS Documentation**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)

## Conclusion

Thank you for your interest in AutoPart B2B! We hope this application will be useful for your auto parts business.

This project is constantly evolving and we appreciate any form of feedback or contribution.


**Last updated:** May 2026
**Version:** 1.0.0


