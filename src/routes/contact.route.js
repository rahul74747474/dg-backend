// routes/contact.ts
import express from "express";
import { handleContact } from "../controllers/contact.controller.js";

const contactRoutes = express.Router();

contactRoutes.post("/contact", handleContact);

export default contactRoutes;