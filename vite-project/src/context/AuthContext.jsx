import { useCallback, useEffect, useState, useRef } from "react";
import { AuthContext } from "./authContextInstance";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";

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

const readStorage = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

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
  };
};

const getAuthToken = () => window.localStorage.getItem("staynestToken") || "";

const apiRequest = async (path, options = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStorage("staynestUser", null));
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(readStorage("staynestUser", null)));
  const [authLoading, setAuthLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");
  const [loginActivity, setLoginActivity] = useState(() => readStorage("staynestActivity", []));
  const [bookings, setBookings] = useState(() => readStorage("staynestBookings", []));
  const [hostels, setHostels] = useState(() =>
    readStorage("staynestHostels", DEFAULT_HOSTELS).map(normalizeHostel)
  );
  const [globalNotifications, setGlobalNotifications] = useState(() =>
    readStorage("staynestNotifications", [])
  );

  const addLoginActivity = useCallback((activity) => {
    setLoginActivity((prev) => [activity, ...prev]);
  }, []);

  const authPrevUid = useRef(null);

  const applyAppData = useCallback((data) => {
    setLoginActivity((prev) => {
      const serverActivities = Array.isArray(data.loginActivity) ? data.loginActivity : [];
      const combined = [...prev, ...serverActivities];
      const seen = new Set();
      return combined.filter((activity) => {
        if (!activity) return false;
        const key = activity.id || `${activity.email}:${activity.action}:${activity.timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    setBookings(data.bookings || []);
    setHostels((data.hostels?.length ? data.hostels : DEFAULT_HOSTELS).map(normalizeHostel));
    setGlobalNotifications(data.notifications || []);
  }, []);

  const loadAppData = useCallback(async () => {
    const data = await apiRequest("/api/app-data", { method: "GET" });
    applyAppData(data);
    return data;
  }, [applyAppData]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadAppData().catch((error) => {
        console.warn("App data load failed:", error.message);
      });
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadAppData]);

  // Keep `user` state in sync with Firebase auth profile updates (displayName/email)
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        // record logout activity if previously signed in
        const prevStored = readStorage("staynestUser", null);
        if (authPrevUid.current) {
          const logoutEntry = {
            id: `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            userName: (prevStored && prevStored.name) || "Unknown",
            email: (prevStored && prevStored.email) || "",
            role: (prevStored && prevStored.role) || "user",
            action: "Logout",
            timestamp: new Date().toLocaleString(),
            status: "Offline",
          };
          setLoginActivity((prev) => [logoutEntry, ...prev]);
        }
        authPrevUid.current = null;
        setUser(null);
        setIsLoggedIn(false);
        return;
      }

      // new or changed signin
      if (authPrevUid.current !== fbUser.uid) {
        // avoid duplicate if last recorded activity is already a login for this email
        const prevActs = readStorage("staynestActivity", []);
        const last = prevActs && prevActs.length ? prevActs[0] : null;
        if (!(last && last.email === fbUser.email && last.action === "Login")) {
          const loginEntry = {
            id: `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            userName: fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "Unknown"),
            email: fbUser.email || "",
            role: "user",
            action: "Login",
            timestamp: new Date().toLocaleString(),
            status: "Active",
          };
          setLoginActivity((prev) => [loginEntry, ...prev]);
        }
      }
      authPrevUid.current = fbUser.uid;

      // Merge Firebase profile info into existing user state (prefer backend id if present)
      setUser((prev) => {
        const merged = {
          id: (prev && prev.id) || fbUser.uid,
          email: fbUser.email || (prev && prev.email) || null,
          name: fbUser.displayName || (prev && prev.name) || (fbUser.email ? fbUser.email.split("@")[0] : ""),
          role: (prev && prev.role) || "user",
        };
        try {
          window.localStorage.setItem("staynestUser", JSON.stringify(merged));
        } catch (e) {
          // ignore storage errors
        }
        return merged;
      });
      setIsLoggedIn(true);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("staynestUser", JSON.stringify(user || null));
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem("staynestActivity", JSON.stringify(loginActivity));
  }, [loginActivity]);

  useEffect(() => {
    window.localStorage.setItem("staynestBookings", JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    window.localStorage.setItem("staynestHostels", JSON.stringify(hostels));
  }, [hostels]);

  useEffect(() => {
    window.localStorage.setItem("staynestNotifications", JSON.stringify(globalNotifications));
  }, [globalNotifications]);

  const refreshServerData = async () => {
    try {
      await loadAppData();
    } catch (error) {
      console.warn("Server refresh failed:", error.message);
    }
  };

  const login = async (email, password, role) => {
    setLoginError("");
    setAuthLoading(true);

    try {
      // Try Firebase first if available
      if (auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const firebaseToken = await userCredential.user.getIdToken();

          const data = await apiRequest("/api/auth/verify", {
            method: "POST",
            body: { role },
          });

          window.localStorage.setItem("staynestToken", firebaseToken);
          window.localStorage.setItem("staynestUser", JSON.stringify({
            id: data.user.id || userCredential.user.uid,
            email: data.user.email || userCredential.user.email,
            name: data.user.name || userCredential.user.displayName,
            role: data.user.role || role,
          }));
          setUser({
            id: data.user.id || userCredential.user.uid,
            email: data.user.email || userCredential.user.email,
            name: data.user.name || userCredential.user.displayName,
            role: data.user.role || role,
          });
          setIsLoggedIn(true);
          addLoginActivity({
            id: `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            userName: data.user.name || userCredential.user.displayName || (data.user.email || userCredential.user.email || "Unknown").split("@")[0],
            email: data.user.email || userCredential.user.email || "",
            role: data.user.role || role || "user",
            action: "Login",
            timestamp: new Date().toLocaleString(),
            status: "Active",
          });

          await refreshServerData();
          return data.user?.role || role;
        } catch (firebaseError) {
          if (firebaseError.message?.includes("Role mismatch")) {
            setLoginError(firebaseError.message);
            await firebaseSignOut(auth);
            window.localStorage.removeItem("staynestToken");
            window.localStorage.removeItem("staynestUser");
            setUser(null);
            setIsLoggedIn(false);
            return false;
          }
          console.warn("Firebase login failed, trying backend:", firebaseError.message);
        }
      }

      // Fallback to backend login
      const data = await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password, role },
      });

      if (data.user && data.token) {
        window.localStorage.setItem("staynestToken", data.token);
        window.localStorage.setItem("staynestUser", JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        }));
        setUser(data.user);
        setIsLoggedIn(true);
        addLoginActivity({
          id: `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          userName: data.user.name || "",
          email: data.user.email || "",
          role: data.user.role || role || "user",
          action: "Login",
          timestamp: new Date().toLocaleString(),
          status: "Active",
        });
        await refreshServerData();
        return data.user.role || role;
      }

      throw new Error("Login failed.");
    } catch (error) {
      setLoginError(error.message || "Login failed.");
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (name, email, password, role) => {
    setSignupError("");

    if (password.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      return false;
    }

    setAuthLoading(true);

    try {
      // Create local backend user (ensures passwordHash is saved and can login with password)
      const backendSignup = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: { name, email, password, role },
      });

      if (!backendSignup.user || !backendSignup.token) {
        throw new Error(backendSignup.error || "Signup failed.");
      }

      window.localStorage.setItem("staynestToken", backendSignup.token);
      window.localStorage.setItem("staynestUser", JSON.stringify({
        id: backendSignup.user.id,
        email: backendSignup.user.email,
        name: backendSignup.user.name,
        role: backendSignup.user.role,
      }));
      setUser(backendSignup.user);
      setIsLoggedIn(true);
      addLoginActivity({
        id: `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userName: backendSignup.user.name || "",
        email: backendSignup.user.email || "",
        role: backendSignup.user.role || role || "user",
        action: "Signup",
        timestamp: new Date().toLocaleString(),
        status: "Active",
      });

      // Also create Firebase user for multi-auth support
      if (auth) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          if (backendSignup.user.name) {
            await updateProfile(auth.currentUser, { displayName: backendSignup.user.name });
          }
        } catch (firebaseError) {
          console.warn("Firebase signup failed:", firebaseError.message);
          // Don't fail the whole signup if Firebase fails - backend is the source of truth
        }
      }

      return true;
    } catch (error) {
      setSignupError(error.message || "Signup failed.");
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    // If Firebase isn't managing the sign-out (or we don't have an active uid), record logout entry
    try {
      const stored = readStorage("staynestUser", user);
      if (!auth || !authPrevUid.current) {
        addLoginActivity({
          id: `activity_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          userName: (stored && stored.name) || "Unknown",
          email: (stored && stored.email) || "",
          role: (stored && stored.role) || "user",
          action: "Logout",
          timestamp: new Date().toLocaleString(),
          status: "Offline",
        });
      }
    } catch (e) {
      /* ignore */
    }

    try {
      if (auth) await firebaseSignOut(auth);
    } catch (e) {
      console.warn("Firebase sign out failed:", e.message);
    }

    window.localStorage.removeItem("staynestToken");
    window.localStorage.removeItem("staynestUser");
    setUser(null);
    setIsLoggedIn(false);
    setLoginError("");
    setSignupError("");
  };

  const addBooking = (booking) => {
    const optimisticBooking = {
      ...booking,
      id: booking.id || `booking_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: booking.status || "Pending",
    };
    setBookings((prev) => [optimisticBooking, ...prev]);

    apiRequest("/api/bookings", {
      method: "POST",
      body: optimisticBooking,
    })
      .then((data) => {
        if (data.booking) {
          setBookings((prev) =>
            prev.map((item) => (item.id === optimisticBooking.id ? data.booking : item))
          );
        }
      })
      .catch((error) => {
        console.warn("Booking save failed:", error.message);
      });
  };

  const updateBookingStatus = (id, status) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));

    apiRequest(`/api/bookings/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: { status },
    })
      .then((data) => {
        if (data.booking) {
          setBookings((prev) => prev.map((b) => (b.id === id ? data.booking : b)));
        }
      })
      .catch((error) => {
        console.warn("Booking status save failed:", error.message);
      });
  };

  const addHostel = (hostel) => {
    const optimisticHostel = normalizeHostel({
      ...hostel,
      id: Date.now(),
    });
    setHostels((prev) => [...prev, optimisticHostel]);

    apiRequest("/api/hostels", {
      method: "POST",
      body: optimisticHostel,
    })
      .then((data) => {
        if (data.hostel) {
          setHostels((prev) =>
            prev.map((item) => (item.id === optimisticHostel.id ? normalizeHostel(data.hostel) : item))
          );
        }
      })
      .catch((error) => {
        console.warn("Hostel save failed:", error.message);
      });
  };

  const updateHostelRooms = (id, newRooms) => {
    const updates = { rooms: Math.max(0, newRooms) };
    setHostels((prev) =>
      prev.map((h) => (h.id === id ? normalizeHostel({ ...h, ...updates }) : h))
    );

    apiRequest(`/api/hostels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: updates,
    }).catch((error) => {
      console.warn("Hostel room save failed:", error.message);
    });
  };

  const updateHostel = (id, updates) => {
    setHostels((prev) =>
      prev.map((hostel) => (hostel.id === id ? normalizeHostel({ ...hostel, ...updates }) : hostel))
    );

    apiRequest(`/api/hostels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: updates,
    })
      .then((data) => {
        if (data.hostel) {
          setHostels((prev) =>
            prev.map((hostel) =>
              hostel.id === id ? normalizeHostel(data.hostel) : hostel
            )
          );
        }
      })
      .catch((error) => {
        console.warn("Hostel update failed:", error.message);
      });
  };

  const deleteHostel = (id) => {
    const previousHostels = hostels;
    setHostels((prev) => prev.filter((hostel) => hostel.id !== id));

    apiRequest(`/api/hostels/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch((error) => {
      console.warn("Hostel delete failed:", error.message);
      setHostels(previousHostels);
    });
  };

  const addGlobalNotification = (userEmail, message) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      userEmail,
      message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setGlobalNotifications((prevNotifs) => [newNotification, ...prevNotifs]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoggedIn,
        authLoading,
        login,
        signup,
        logout,
        loginError,
        signupError,
        setLoginError,
        setSignupError,
        loginActivity,
        setLoginActivity,
        bookings,
        setBookings,
        addBooking,
        updateBookingStatus,
        hostels,
        addHostel,
        updateHostelRooms,
        updateHostel,
        deleteHostel,
        globalNotifications,
        setGlobalNotifications,
        addGlobalNotification,
        refreshServerData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
