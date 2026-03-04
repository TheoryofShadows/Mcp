const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
    : ["http://localhost:5173", "http://localhost:3001"],
  nodeEnv: process.env.NODE_ENV || "development",
  dbPath: process.env.DB_PATH || "mcpx.db",
};

export default config;
