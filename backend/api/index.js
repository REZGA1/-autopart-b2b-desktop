// Serverless entry point for Vercel
// Instead of app.listen(), we export the Express app as a module
// Vercel will invoke it as a serverless function for each request

const app = require('../app');

module.exports = app;
