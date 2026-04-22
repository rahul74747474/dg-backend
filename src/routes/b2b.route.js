import express from "express";
import { handleB2B } from "../controllers/b2b.controller.js";

const b2bRouter = express.Router();

b2bRouter.post("/b2b", handleB2B);

export default b2bRouter;