import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes.js";
const app = express();
console.log("🔥 app.js LOADED");

import errorHandler from "./middlewares/errorHandler.js";



// Middlewares
const allowedOrigins = [
  "http://localhost:8080",
  "https://www.desiiglobal.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
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





