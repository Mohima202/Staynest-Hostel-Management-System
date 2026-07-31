import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");

export const DEFAULT_HOSTELS = [
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

const initialData = () => ({
  users: [],
  loginActivity: [],
  bookings: [],
  hostels: DEFAULT_HOSTELS,
  notifications: [],
  updatedAt: new Date().toISOString(),
});

export const normalizeHostel = (hostel) => {
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
  };
};

export const readDatabase = async () => {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      ...initialData(),
      ...data,
      hostels: (data.hostels?.length ? data.hostels : DEFAULT_HOSTELS).map(normalizeHostel),
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const data = initialData();
    await writeDatabase(data);
    return data;
  }
};

export const writeDatabase = async (data) => {
  await mkdir(DATA_DIR, { recursive: true });
  const nextData = {
    ...initialData(),
    ...data,
    hostels: (data.hostels?.length ? data.hostels : DEFAULT_HOSTELS).map(normalizeHostel),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(DB_FILE, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");
  return nextData;
};
