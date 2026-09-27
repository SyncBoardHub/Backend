'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const corsOptions = require('./config/cors');
const requestId = require('./middleware/requestId');
const rateLimit = require('./middleware/rateLimit');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);

// Global API rate limit
app.use('/api', rateLimit(15 * 60 * 1000, 300));

// Mount all application routes
app.use(routes);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
