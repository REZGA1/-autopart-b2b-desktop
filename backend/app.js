const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet'); // ✅ إضافة
const app = express();


// ✅ Helmet لازم يكون في الأعلى
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);


// Allow multiple localhost ports and any configured client URL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin
    if (origin.includes('localhost') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/merchant', require('./routes/merchantRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/supplier/catalog', require('./routes/supplierCatalogRoutes'));
app.use('/api/store', require('./routes/storeRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', backend: 'supabase' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

module.exports = app;