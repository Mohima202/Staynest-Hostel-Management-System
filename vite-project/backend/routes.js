import express from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db.js";
import fs from "fs";
import admin from "firebase-admin";

const JWT_SECRET = process.env.JWT_SECRET || "staynest-secret";
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "steynest-auth";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Initialize Firebase Admin SDK if service account is provided.
let firebaseAdmin = null;
try {
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saJson = process.env.FIREBASE_ADMIN_JSON;
  let serviceAccount = null;

  if (saPath && fs.existsSync(saPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
  } else if (saJson) {
    serviceAccount = JSON.parse(saJson);
  }

  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firebaseAdmin = admin;
    console.log("Firebase Admin initialized for user sync.");
  }
} catch (err) {
  console.warn("Firebase Admin init failed:", err && err.message);
}

let cachedFirebaseCerts = null;
let certsExpiry = 0;

const fetchFirebaseCert = async (kid) => {
  const now = Date.now();
  if (!cachedFirebaseCerts || now >= certsExpiry) {
    const response = await fetch(FIREBASE_CERTS_URL);
    const data = await response.json();
    if (!response.ok || !data) {
      throw new Error("Unable to fetch Firebase public keys.");
    }
    cachedFirebaseCerts = data;
    certsExpiry = now + 60 * 60 * 1000;
  }
  return cachedFirebaseCerts[kid];
};

const verifyFirebaseToken = async (token) => {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || !decodedHeader.header || !decodedHeader.header.kid) {
    throw new Error("Invalid Firebase token header.");
  }

  const publicKey = await fetchFirebaseCert(decodedHeader.header.kid);
  if (!publicKey) {
    throw new Error("Firebase public key not found.");
  }

  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
    audience: FIREBASE_PROJECT_ID,
    issuer: FIREBASE_ISSUER,
  });
};

const DEFAULT_HOSTELS = [
  {
    id: 1,
    name: "Green Hostel",
    location: "Bahaddarhut",
    rooms: 8,
    totalRooms: 12,
    priceAmount: 3000,
    price: "BDT 3000/month",
    rating: 4.5,
    facilities: ["WiFi", "Study Room", "Laundry", "Security"],
    contactWhatsapp: "+880 1700-000001",
    contactEmail: "greenhostel@staynest.com",
  },
  {
    id: 2,
    name: "City Hostel",
    location: "Chittagong",
    rooms: 3,
    totalRooms: 8,
    priceAmount: 2800,
    price: "BDT 2800/month",
    rating: 4.2,
    facilities: ["WiFi", "CCTV", "Dining", "Transport Access"],
    contactWhatsapp: "+880 1700-000002",
    contactEmail: "cityhostel@staynest.com",
  },
  {
    id: 3,
    name: "Dream Stay",
    location: "Kumira",
    rooms: 12,
    totalRooms: 16,
    priceAmount: 3200,
    price: "BDT 3200/month",
    rating: 4.8,
    facilities: ["WiFi", "Generator", "Dining", "Prayer Space"],
    contactWhatsapp: "+880 1700-000003",
    contactEmail: "dreamstay@staynest.com",
  },
];

const router = express.Router();

const normalizeHostel = (hostel) => {
  const rooms = Number(hostel.rooms) || 0;
  const totalRooms = Number(hostel.totalRooms) || rooms;
  const priceAmount = Number(hostel.priceAmount) || 0;
  const facilities = Array.isArray(hostel.facilities)
    ? hostel.facilities
    : String(hostel.facilities || "")
        .split(",")
        .map((facility) => facility.trim())
        .filter(Boolean);

  return {
    ...hostel,
    rooms,
    totalRooms: Math.max(totalRooms, rooms),
    priceAmount,
    price: hostel.price || `BDT ${priceAmount}/month`,
    rating: Number(hostel.rating) || 4.5,
    facilities,
    contactWhatsapp: hostel.contactWhatsapp || "+880 1700-000000",
    contactEmail: hostel.contactEmail || "info@staynest.com",
    createdAt: hostel.createdAt || new Date().toISOString(),
    updatedAt: hostel.updatedAt || new Date().toISOString(),
  };
};

const createId = () => randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const createToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
const sanitizeUser = (user) => {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
};

const getUserByEmail = async (email) => {
  const db = getDb();
  return db.collection("users").findOne({ email: email.trim().toLowerCase() });
};

const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const decoded = firebaseAdmin
      ? await firebaseAdmin.auth().verifyIdToken(token)
      : await verifyFirebaseToken(token);

    req.firebaseToken = decoded;
    return next();
  } catch {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token." });
    }
  }
};

const syncFirebaseUser = async (firebaseUser, role = "user") => {
  if (!firebaseUser || !firebaseUser.email) {
    throw new Error("Invalid Firebase user data");
  }

  const db = getDb();
  const users = db.collection("users");
  const normalizedEmail = firebaseUser.email.trim().toLowerCase();

  // Try to find existing user by firebaseUid first, then by email
  let existing = await users.findOne({ firebaseUid: firebaseUser.uid });
  if (!existing) {
    existing = await users.findOne({ email: normalizedEmail });
  }

  if (existing) {
    // User exists - do not overwrite actual registered role
    if (existing.role !== role) {
      throw new Error(`Role mismatch: account is registered as ${existing.role}`);
    }

    const updates = {
      firebaseUid: firebaseUser.uid,
      name: firebaseUser.displayName || existing.name || "User",
      email: normalizedEmail,
      updatedAt: new Date().toISOString(),
    };

    // Only update authProvider to firebase if user doesn't have local auth (passwordHash)
    if (!existing.passwordHash) {
      updates.authProvider = "firebase";
    }

    await users.updateOne({ _id: existing._id }, { $set: updates });
    console.log(`✅ Firebase user synced (updated):`, normalizedEmail, `role: ${role}`);
    return sanitizeUser({ ...existing, ...updates });
  }

  // User doesn't exist - create new entry
  const newUser = {
    id: createId(),
    firebaseUid: firebaseUser.uid,
    name: firebaseUser.displayName || normalizedEmail.split("@")[0] || "User",
    email: normalizedEmail,
    role: role || "user",
    joinedDate: new Date().toLocaleDateString(),
    authProvider: "firebase",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await users.insertOne(newUser);
  console.log(`✅ Firebase user synced (created):`, normalizedEmail, `role: ${role}, id:`, newUser.id);
  return sanitizeUser(newUser);
};

export const initDefaultData = async () => {
  const db = getDb();
  const users = db.collection("users");
  const hostels = db.collection("hostels");
  const bookings = db.collection("bookings");
  const notifications = db.collection("notifications");
  const loginActivity = db.collection("loginActivity");

  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    hostels.createIndex({ id: 1 }, { unique: true }),
    bookings.createIndex({ id: 1 }, { unique: true }),
    notifications.createIndex({ id: 1 }, { unique: true }),
    loginActivity.createIndex({ id: 1 }, { unique: true }),
  ]);

  const hostelCount = await hostels.countDocuments();
  if (hostelCount === 0) {
    await hostels.insertMany(DEFAULT_HOSTELS.map(normalizeHostel));
  }
};

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "staynest-backend" });
});

router.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  const requestedRole = String(req.body?.role || "user").toLowerCase();
  const role = requestedRole === "admin" ? "admin" : "user";

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Please fill in all fields." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({ error: "This email is already registered. Please login." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: createId(),
    name: name.trim(),
    email: normalizedEmail,
    role,
    joinedDate: new Date().toLocaleDateString(),
    passwordHash,
    authProvider: "local",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = getDb();
  await db.collection("users").insertOne(newUser);

  // Try to create user in Firebase Auth (if Firebase Admin initialized).
  if (firebaseAdmin) {
    try {
      const fbUser = await firebaseAdmin.auth().createUser({
        uid: newUser.id,
        email: newUser.email,
        emailVerified: false,
        password: password,
        displayName: newUser.name,
      });
      // set custom claims for role
      await firebaseAdmin.auth().setCustomUserClaims(fbUser.uid, { role: newUser.role });
      console.log("Synced user to Firebase Auth:", fbUser.uid);
    } catch (err) {
      console.warn("Firebase user sync failed:", err && err.message);
    }
  }

  return res.status(201).json({ user: sanitizeUser(newUser), token: createToken(newUser) });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const requestedRole = String(req.body?.role || "user").toLowerCase();
  const role = requestedRole === "admin" ? "admin" : "user";

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await getUserByEmail(normalizedEmail);

  if (!user) {
    return res.status(404).json({ error: "User not found. Please sign up." });
  }

  if (user.role !== role) {
    return res.status(403).json({ error: `This account is registered as ${user.role}. Please choose the correct login role.` });
  }

  if (!user.passwordHash || user.authProvider !== "local") {
    return res.status(403).json({ error: "This account must sign in with Firebase. Please use the appropriate login method." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid password." });
  }

  const token = createToken(user);
  return res.json({ user: sanitizeUser(user), token });
});

router.post("/auth/verify", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const requestedRole = String(req.body?.role || "").toLowerCase();
  const role = requestedRole === "admin" ? "admin" : requestedRole === "user" ? "user" : "";

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (!role) {
    return res.status(400).json({ error: "Role is required for verification." });
  }

  try {
    let firebaseUser = null;
    let decoded = null;

    if (firebaseAdmin) {
      decoded = await firebaseAdmin.auth().verifyIdToken(token);
      firebaseUser = await firebaseAdmin.auth().getUser(decoded.uid);
    } else {
      decoded = await verifyFirebaseToken(token);
      firebaseUser = {
        uid: decoded.user_id || decoded.sub,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split("@")[0] || "Anonymous",
      };
    }

    const user = await syncFirebaseUser(firebaseUser, role);
    return res.json({ user });
  } catch (error) {
    console.warn("Auth verify failed:", error?.message || error);
    const status = error?.message?.includes("Role mismatch") ? 403 : 401;
    return res.status(status).json({ error: error?.message || "Invalid or expired Firebase token." });
  }
});

router.get("/app-data", async (_req, res) => {
  const db = getDb();
  const [users, bookings, hostels, notifications, loginActivity] = await Promise.all([
    db.collection("users").find().project({ passwordHash: 0 }).toArray(),
    db.collection("bookings").find().sort({ updatedAt: -1 }).toArray(),
    db.collection("hostels").find().sort({ id: 1 }).toArray(),
    db.collection("notifications").find().sort({ createdAt: -1 }).toArray(),
    db.collection("loginActivity").find().sort({ createdAt: -1 }).toArray(),
  ]);

  return res.json({ users, bookings, hostels, notifications, loginActivity });
});

router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Name, email, and message are required." });
  }

  const db = getDb();
  const contactMessage = {
    id: createId(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    message: String(message).trim(),
    status: "new",
    type: "contact",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection("notifications").insertOne(contactMessage);
  return res.status(201).json({ message: "Contact message received.", contact: contactMessage });
});

router.post("/bookings", verifyToken, async (req, res) => {
  const booking = req.body || {};
  const db = getDb();
  const nextBooking = {
    ...booking,
    id: booking.id || createId(),
    status: booking.status || "Pending",
    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection("bookings").updateOne({ id: nextBooking.id }, { $set: nextBooking }, { upsert: true });
  return res.status(201).json({ booking: nextBooking });
});

router.patch("/bookings/:id/status", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!status) {
    return res.status(400).json({ error: "Booking status is required." });
  }

  const db = getDb();
  const existing = await db.collection("bookings").findOne({ id });
  if (!existing) {
    return res.status(404).json({ error: "Booking not found." });
  }

  const updatedBooking = { ...existing, status, updatedAt: new Date().toISOString() };
  await db.collection("bookings").updateOne({ id }, { $set: updatedBooking });
  return res.json({ booking: updatedBooking });
});

router.post("/hostels", verifyToken, async (req, res) => {
  const hostel = req.body || {};
  const db = getDb();
  const nextHostel = normalizeHostel({
    ...hostel,
    id: hostel.id || createId(),
    createdAt: hostel.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await db.collection("hostels").insertOne(nextHostel);
  return res.status(201).json({ hostel: nextHostel });
});

router.patch("/hostels/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const db = getDb();
  const numericId = Number(id);
  const existing = await db.collection("hostels").findOne({ id: Number.isNaN(numericId) ? id : numericId });

  if (!existing) {
    return res.status(404).json({ error: "Hostel not found." });
  }

  const nextHostel = normalizeHostel({ ...existing, ...updates, updatedAt: new Date().toISOString() });
  await db.collection("hostels").updateOne({ id: existing.id }, { $set: nextHostel });
  return res.json({ hostel: nextHostel });
});

router.delete("/hostels/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const numericId = Number(id);
  const existing = await db.collection("hostels").findOne({ id: Number.isNaN(numericId) ? id : numericId });
  if (!existing) {
    return res.status(404).json({ error: "Hostel not found." });
  }

  await db.collection("hostels").deleteOne({ id: existing.id });
  return res.json({ ok: true });
});

/* eslint-disable no-unused-vars */
router.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error." });
});

export default router;
