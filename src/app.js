import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes.js";
import dns from 'dns'
// Change DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const app = express();
console.log("🔥 app.js LOADED");

import errorHandler from "./middlewares/errorHandler.js";



// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "DesiiGlobal Backend is running 🚀",
  });
});

// API Routes
app.use("/api", routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);
export default app;






