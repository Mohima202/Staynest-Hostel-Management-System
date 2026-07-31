import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DB_NAME || "staynest";
let cachedClient = null;
let cachedDb = null;

export const connectDb = async () => {
  if (cachedDb && cachedClient) return { client: cachedClient, db: cachedDb };

  const client = new MongoClient(MONGO_URI, {
    serverApi: "1",
  });

  await client.connect();
  const db = client.db(DB_NAME);
  cachedClient = client;
  cachedDb = db;

  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ firebaseUid: 1 }, { unique: true, sparse: true });
  await db.collection("bookings").createIndex({ id: 1 }, { unique: true });
  await db.collection("hostels").createIndex({ id: 1 }, { unique: true });

  return { client, db };
};

export const getDb = () => {
  if (!cachedDb) throw new Error("Database not connected.");
  return cachedDb;
};
