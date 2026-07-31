import express from "express";
import cors from "cors";
import apiRouter, { initDefaultData } from "./routes.js";
import { connectDb } from "./db.js";

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5050);
const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use("/api", apiRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Server error." });
});

connectDb()
  .then(async () => {
    await initDefaultData();
    app.listen(PORT, () => {
      console.log(`StayNest backend running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB.", error);
    process.exit(1);
  });
