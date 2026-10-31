'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const apiRoutes = require('./routes/api.routes');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & defensive middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline scripts & external images in static frontend
  crossOriginEmbedderPolicy: false,
}));
app.use(cors());
app.use(express.json());

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// API router
app.use('/api/v1', apiRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// Error handling middleware
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Buggy Bazaar server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
