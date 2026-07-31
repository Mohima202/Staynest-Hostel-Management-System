import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuthHook";

// Utility function - defined outside component to avoid purity issues
const generateNotificationId = () => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (headers, rows) => {
  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
  ].join("\n");
};

const downloadBlob = (content, fileName, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatReportDate = () => {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
};

const parseAmount = (amount) => {
  const numericValue = String(amount ?? "").replace(/[^\d.]/g, "");
  return Number(numericValue || 0);
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const buildExcelTable = (title, headers, rows) => {
  const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #eef2ff; font-weight: bold; }
          h1, p { font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Generated at: ${escapeHtml(formatReportDate())}</p>
        <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
      </body>
    </html>
  `;
};

const createSimplePdf = (title, lines) => {
  const escapePdfText = (value) =>
    String(value ?? "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const contentLines = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    `(${escapePdfText(title)}) Tj`,
    "/F1 10 Tf",
    "0 -24 Td",
    `(${escapePdfText(`Generated at: ${formatReportDate()}`)}) Tj`,
    ...lines.flatMap((line) => ["0 -16 Td", `(${escapePdfText(line)}) Tj`]),
    "ET",
  ];
  const stream = contentLines.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(pdf.length);
    pdf += object;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const {
    user,
    logout,
    loginActivity,
    setLoginActivity,
    bookings,
    updateBookingStatus,
    hostels,
    addHostel,
    updateHostelRooms,
    updateHostel,
    deleteHostel,
  } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const currentBookings = useMemo(() => bookings || [], [bookings]);
  const [editingHostelId, setEditingHostelId] = useState(null);
  const [editingHostel, setEditingHostel] = useState(null);

  // bookings is sourced from context; derive local view via useMemo to avoid
  // calling setState inside effects (prevents cascading renders)

  const initialSystemUsers = useMemo(() => {
    if (!loginActivity || loginActivity.length === 0) return [];

    const seenEmails = new Set();
    const users = [];

    for (const activity of loginActivity) {
      const email = String(activity.email || "").trim().toLowerCase();
      if (!email || seenEmails.has(email)) continue;
      seenEmails.add(email);

      users.push({
        id: activity.id,
        name: activity.userName || "Unknown",
        email,
        role: activity.role || "user",
        time: activity.timestamp || "N/A",
        action: activity.action || "Login",
        status:
          activity.status ||
          (activity.action === "Logout" ? "Offline" : "Active"),
      });
    }

    return users;
  }, [loginActivity]);

  const [removedUserEmails, setRemovedUserEmails] = useState([]);

  const systemUsers = useMemo(
    () => initialSystemUsers.filter((u) => !removedUserEmails.includes(u.email)),
    [initialSystemUsers, removedUserEmails]
  );

  // systemUsers is derived from loginActivity via useMemo; no setState in effect

  const handleDeleteUser = (userEmail) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      setRemovedUserEmails(prev => Array.from(new Set([...prev, userEmail])));
      alert("User deleted successfully!");
    }
  };

  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" });
  const [newHostel, setNewHostel] = useState({
    name: "",
    location: "",
    rooms: "",
    totalRooms: "",
    priceAmount: "",
    rating: "4.5",
    facilities: "",
    contactWhatsapp: "",
    contactEmail: "",
  });

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleAddUser = (e) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email) {
      return alert("Please add both a name and email for the new user.");
    }

    const createdUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userName: newUser.name,
      email: newUser.email,
      role: newUser.role || "user",
      action: "Signup",
      timestamp: new Date().toLocaleString(),
      status: "Active",
    };

    setLoginActivity((prev) => [createdUser, ...prev]);
    setNewUser({ name: "", email: "", role: "user" });
    setActiveSection("users");
    alert("User added successfully and activity recorded.");
  };

  const handleAddHostel = (e) => {
    e.preventDefault();
    if (!newHostel.name || !newHostel.location || !newHostel.rooms) {
      return alert("Please fill all fields");
    }
    addHostel({
      ...newHostel,
      price: newHostel.priceAmount ? `৳ ${Number(newHostel.priceAmount)}/month` : "",
    });
    setNewHostel({
      name: "",
      location: "",
      rooms: "",
      totalRooms: "",
      priceAmount: "",
      rating: "4.5",
      facilities: "",
      contactWhatsapp: "",
      contactEmail: "",
    });
    setActiveSection("hostels");
    alert("Hostel added successfully!");
  };

  const paymentRecords = useMemo(() => {
    const bookingPayments = currentBookings
      .filter((booking) => booking.transactionId || booking.txnId)
      .map((booking) => ({
        id: booking.transactionId || booking.txnId,
        email: booking.userEmail || "unknown@example.com",
        userName: booking.userName || "Unknown User",
        room: booking.room || booking.hostel || "N/A",
        amount: booking.price || "৳ 0",
        method: booking.paymentMethod || booking.method || "N/A",
        account: booking.paymentAccount || "N/A",
        status:
          booking.status === "Approved"
            ? "Payment Successfully Received"
            : booking.status === "Rejected" || booking.status === "Blocked"
            ? "Refund Pending / Rejected"
            : "Payment Submitted - Pending Review",
      }));

    const bookingTxnIds = new Set(bookingPayments.map((payment) => payment.id));
    const extraTransactions = transactions.filter((txn) => !bookingTxnIds.has(txn.id));
    return [...bookingPayments, ...extraTransactions];
  }, [currentBookings, transactions]);

  const reportDateStamp = () => new Date().toISOString().slice(0, 10);

  const handleDownloadUserLogs = () => {
    const headers = ["User Name", "Email", "Role", "Action", "Time", "Status"];
    const rows =
      loginActivity && loginActivity.length > 0
        ? loginActivity.map((activity) => ({
            "User Name": activity.userName || "N/A",
            Email: activity.email || "N/A",
            Role: activity.role || "user",
            Action: activity.action || "N/A",
            Time: activity.timestamp || "N/A",
            Status: activity.status || "N/A",
          }))
        : systemUsers.map((systemUser) => ({
            "User Name": systemUser.name || "N/A",
            Email: systemUser.email || "N/A",
            Role: systemUser.role || "user",
            Action: "Registered",
            Time: systemUser.time || "N/A",
            Status: "Active",
          }));

    downloadBlob(
      buildCsv(headers, rows),
      `staynest-user-logs-${reportDateStamp()}.csv`,
      "text/csv;charset=utf-8"
    );
  };

  const handleDownloadRevenueReport = () => {
    const approvedPayments = paymentRecords.filter((payment) =>
      payment.status.toLowerCase().includes("successfully received")
    );
    const pendingPayments = paymentRecords.filter((payment) =>
      payment.status.toLowerCase().includes("pending")
    );
    const refundedPayments = paymentRecords.filter((payment) =>
      payment.status.toLowerCase().includes("refund")
    );
    const totalRevenue = approvedPayments.reduce(
      (sum, payment) => sum + parseAmount(payment.amount),
      0
    );

    const lines = [
      `Total payment records: ${paymentRecords.length}`,
      `Successful payments: ${approvedPayments.length}`,
      `Pending payments: ${pendingPayments.length}`,
      `Refund/rejected payments: ${refundedPayments.length}`,
      `Total received revenue: BDT ${totalRevenue}`,
      "",
      "Transactions:",
      ...paymentRecords.slice(0, 24).map(
        (payment) =>
          `${payment.id} | ${payment.userName || "N/A"} | ${payment.method} | ${String(payment.amount).replace(/[^\x20-\x7E]/g, "BDT ")} | ${payment.status}`
      ),
    ];

    downloadBlob(
      createSimplePdf("StayNest Revenue Report", lines),
      `staynest-revenue-report-${reportDateStamp()}.pdf`,
      "application/pdf"
    );
  };

  const handleDownloadBookingLogs = () => {
    const headers = [
      "User",
      "Email",
      "Room / Hostel",
      "Location",
      "Check-in",
      "Check-out",
      "Price",
      "Payment Method",
      "Transaction ID",
      "Status",
    ];
    const rows = currentBookings.map((booking) => ({
      User: booking.userName || "Unknown User",
      Email: booking.userEmail || "N/A",
      "Room / Hostel": booking.room || booking.hostel || "N/A",
      Location: booking.location || "N/A",
      "Check-in": booking.checkIn || "N/A",
      "Check-out": booking.checkOut || "N/A",
      Price: booking.price || "N/A",
      "Payment Method": booking.paymentMethod || booking.method || "N/A",
      "Transaction ID": booking.transactionId || booking.txnId || "N/A",
      Status: booking.status || "N/A",
    }));

    downloadBlob(
      buildExcelTable("StayNest Booking Logs", headers, rows),
      `staynest-booking-logs-${reportDateStamp()}.xls`,
      "application/vnd.ms-excel;charset=utf-8"
    );
  };

  const handleEditHostel = (hostel) => {
    setEditingHostelId(hostel.id);
    setEditingHostel({
      name: hostel.name,
      location: hostel.location,
      rooms: hostel.rooms.toString(),
      totalRooms: (hostel.totalRooms ?? hostel.rooms).toString(),
      priceAmount: (hostel.priceAmount ?? 0).toString(),
      rating: (hostel.rating ?? 4.5).toString(),
      facilities: (hostel.facilities || []).join(", "),
      contactWhatsapp: hostel.contactWhatsapp || "",
      contactEmail: hostel.contactEmail || "",
    });
  };

  const handleCancelHostelEdit = () => {
    setEditingHostelId(null);
    setEditingHostel(null);
  };

  const handleSaveHostel = (hostelId) => {
    if (!editingHostel?.name || !editingHostel?.location || editingHostel.rooms === "") {
      alert("Please fill hostel name, location, and available seats");
      return;
    }

    const rooms = Number(editingHostel.rooms);
    const totalRooms = Number(editingHostel.totalRooms || editingHostel.rooms);
    const priceAmount = Number(editingHostel.priceAmount || 0);
    const rating = Number(editingHostel.rating || 4.5);

    if (rooms < 0 || totalRooms < 0 || priceAmount < 0 || rating < 0) {
      alert("Please enter valid positive numbers");
      return;
    }

    updateHostel(hostelId, {
      ...editingHostel,
      rooms,
      totalRooms,
      priceAmount,
      rating,
      price: `৳ ${priceAmount}/month`,
    });
    handleCancelHostelEdit();
    alert("Hostel updated successfully!");
  };

  const handleDeleteHostel = (hostelId) => {
    if (window.confirm("Delete this hostel listing? It will disappear from the student dashboard too.")) {
      deleteHostel(hostelId);
      if (editingHostelId === hostelId) {
        handleCancelHostelEdit();
      }
      alert("Hostel deleted successfully!");
    }
  };

  const handleBookingAction = (bookingId, action) => {
    const targetBooking = currentBookings.find(b => b.id === bookingId);

    if (!targetBooking) {
      alert("Booking data not found!");
      return;
    }

    const userTxnId = targetBooking.transactionId || targetBooking.txnId || "N/A";
    const userMethod = targetBooking.paymentMethod || targetBooking.method || "N/A";
    const notificationId = generateNotificationId();
    const notificationTime = new Date().toLocaleTimeString();

    // updateBookingStatus will persist the change to context; avoid local setState

    if (typeof updateBookingStatus === "function") {
      updateBookingStatus(bookingId, action);
    }

    if (action === "Approved") {
      // Find and update hostel rooms
      const targetHostel = hostels.find(h => h.name === targetBooking.hostel || h.name === targetBooking.room);
      if (targetHostel && targetHostel.rooms > 0) {
        updateHostelRooms(targetHostel.id, targetHostel.rooms - 1);
      }

      setTransactions(prevTxns => [
        {
          id: userTxnId,
          email: targetBooking.userEmail || "unknown@example.com",
          amount: targetBooking.price || "৳ 0",
          method: userMethod,
          status: "Payment Successfully Received"
        },
        ...prevTxns
      ]);

      const newNotification = {
        id: notificationId,
        userEmail: targetBooking.userEmail,
        message: `✅ Your booking request for ${targetBooking.room || targetBooking.hostel} has been approved! Room allocated.`,
        time: notificationTime
      };
      setNotifications([newNotification, ...notifications]);
      alert("Booking Request Approved & Room Allocated Successfully!");
    } else if (action === "Blocked" || action === "Rejected") {
      setTransactions(prevTxns => [
        {
          id: userTxnId,
          email: targetBooking.userEmail || "unknown@example.com",
          amount: targetBooking.price || "৳ 0",
          method: userMethod,
          status: "Refunded Successfully"
        },
        ...prevTxns
      ]);

      const newNotification = {
        id: notificationId,
        userEmail: targetBooking.userEmail,
        message: `❌ Your booking for ${targetBooking.room || targetBooking.hostel} was rejected. 💳 ৳ ${targetBooking.price} has been automatically refunded.`,
        time: notificationTime
      };
      setNotifications([newNotification, ...notifications]);
      alert(`Booking Rejected! ৳ ${targetBooking.price} has been refunded.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="mb-10 flex flex-col items-start justify-between rounded-3xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-bold cursor-pointer" onClick={() => setActiveSection("overview")}>
              🧑‍💼 Admin Dashboard
            </h1>
            <p className="mt-2 text-indigo-100">Welcome back, {user?.name}! 👋</p>
            <p className="mt-1 text-sm text-indigo-200">Email: {user?.email}</p>
          </div>
          <div className="flex gap-2 mt-4 sm:mt-0">
            {activeSection !== "overview" && (
              <button
                onClick={() => setActiveSection("overview")}
                className="rounded-full bg-white/10 px-5 py-2 text-white transition hover:bg-white/20 text-sm"
              >
                🏠 Back to Dashboard
              </button>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full bg-white/20 px-6 py-2.5 text-white transition hover:bg-white/30 text-sm"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Main Content Sections */}

        {activeSection === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase text-slate-500">Total Users</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{systemUsers.length}</p>
                <p className="mt-2 text-sm text-slate-600">Live active users</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase text-slate-500">Hostels</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{hostels.length}</p>
                <p className="mt-2 text-sm text-slate-600">Listed hostels</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase text-slate-500">Bookings</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">{currentBookings.length}</p>
                <p className="mt-2 text-sm text-slate-600">Total user bookings</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/40">
                <p className="text-sm font-semibold uppercase text-slate-500">Revenue</p>
                <p className="mt-3 text-4xl font-bold text-slate-900">৳ 50K</p>
                <p className="mt-2 text-sm text-slate-600">Monthly earnings</p>
              </div>
            </div>

            {/* User Room Bookings Table */}
            <div className="mb-10 rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">User Room Bookings</h2>
                  <p className="mt-2 text-sm text-slate-600">See which user booked which hostel room and dates.</p>
                </div>
                <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">
                  {currentBookings.length} total
                </span>
              </div>

              {currentBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">User</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Room / Hostel</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Location</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Check-in</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Check-out</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Price</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Payment</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Txn ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{booking.userName || "Unknown User"}</td>
                          <td className="px-4 py-3 text-slate-600">{booking.userEmail || "N/A"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{booking.room || booking.hostel}</td>
                          <td className="px-4 py-3 text-slate-600">{booking.location || "N/A"}</td>
                          <td className="px-4 py-3 text-slate-600">{booking.checkIn}</td>
                          <td className="px-4 py-3 text-slate-600">{booking.checkOut}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-600">{booking.price}</td>
                          <td className="px-4 py-3 text-slate-600">{booking.paymentMethod || "N/A"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{booking.transactionId || booking.txnId || "N/A"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              booking.status === "Approved" ? "bg-green-100 text-green-700" :
                              booking.status === "Rejected" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 p-6 text-center text-slate-600">No user room bookings yet.</p>
              )}
            </div>

            {/* User Login Activity Table */}
            <div className="mb-10 rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900">📊 User Login Activity</h2>
              {loginActivity && loginActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">User Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginActivity.slice(0, 10).map((activity) => (
                        <tr key={activity.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-medium text-slate-900">{activity.userName}</td>
                          <td className="px-4 py-3 text-slate-600">{activity.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${activity.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                              {activity.role === "admin" ? "🧑‍💼 Admin" : "👤 User"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${activity.action === "Login" ? "bg-green-100 text-green-700" : activity.action === "Signup" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"}`}>
                              {activity.action === "Login" ? "🔐 Login" : activity.action === "Signup" ? "✨ Signup" : "🚪 Logout"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">{activity.timestamp}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{activity.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-600">No login activity yet.</p>
              )}
            </div>

            {/* Management Section Grid Menu */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
                <h2 className="text-2xl font-semibold text-slate-900">👥 Manage Users</h2>
                <p className="mt-2 text-slate-600">View, edit, and manage all system users</p>
                <div className="mt-6 space-y-3">
                  <button onClick={() => setActiveSection("users")} className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-white transition hover:bg-indigo-700">View All Users</button>
                  <button onClick={() => setActiveSection("addUserForm")} className="w-full rounded-full border border-indigo-600 px-4 py-2.5 text-indigo-600 transition hover:bg-indigo-50">Add New User</button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
                <h2 className="text-2xl font-semibold text-slate-900">🏨 Manage Hostels</h2>
                <p className="mt-2 text-slate-600">Add, edit, or remove hostel listings</p>
                <div className="mt-6 space-y-3">
                  <button onClick={() => setActiveSection("hostels")} className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-white transition hover:bg-indigo-700">View All Hostels</button>
                  <button onClick={() => setActiveSection("addHostelForm")} className="w-full rounded-full border border-indigo-600 px-4 py-2.5 text-indigo-600 transition hover:bg-indigo-50">Add New Hostel</button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
                <h2 className="text-2xl font-semibold text-slate-900">📋 Booking Approvals</h2>
                <p className="mt-2 text-slate-600">Review and approve pending bookings</p>
                <div className="mt-6 space-y-3">
                  <button onClick={() => setActiveSection("pendingRequests")} className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-white transition hover:bg-indigo-700">Pending Requests ({currentBookings.filter(b => b.status === "Pending").length})</button>
                  <button onClick={() => setActiveSection("bookingHistory")} className="w-full rounded-full border border-indigo-600 px-4 py-2.5 text-indigo-600 transition hover:bg-indigo-50">View History</button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
                <h2 className="text-2xl font-semibold text-slate-900">💳 Payment Tracking</h2>
                <p className="mt-2 text-slate-600">Monitor all payments and transactions</p>
                <div className="mt-6 space-y-3">
                  <button onClick={() => setActiveSection("payments")} className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-white transition hover:bg-indigo-700">View Transactions</button>
                  <button onClick={() => setActiveSection("generateReport")} className="w-full rounded-full border border-indigo-600 px-4 py-2.5 text-indigo-600 transition hover:bg-indigo-50">Generate Reports</button>
                </div>
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="mt-10 rounded-3xl bg-indigo-50 p-6 shadow-inner">
                <h3 className="font-bold text-indigo-950 flex items-center gap-2">🔔 Live User Notification Push Log</h3>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm text-xs text-slate-700">
                      <strong>To: {n.userEmail}</strong> — <span className="text-indigo-600">{n.message}</span> <span className="text-slate-400 float-right">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* System Users Page */}
        {activeSection === "users" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">👥 System Registered Users (Live Data)</h2>
            {systemUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">User Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Email Address</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">System Role</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Last Activity Time</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.map((u) => (
                      <tr key={u.email} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-900">{u.name || "Anonymous User"}</td>
                        <td className="px-4 py-3 text-slate-600">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {u.role === 'admin' ? "🧑‍💼 Admin" : "👤 User"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-500">{u.time}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleDeleteUser(u.email)} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full transition font-medium">🗑️ Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No live registration or signup activity found in this session.</p>
              </div>
            )}
          </div>
        )}

        {/* Add User Form Page */}
        {activeSection === "addUserForm" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">➕ Add New System User</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition">Save User</button>
            </form>
          </div>
        )}

        {/* Hostels Page WITH EDIT FUNCTIONALITY */}
        {activeSection === "hostels" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">🏨 Current Hostel Listings</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Any update or delete here is reflected on the student dashboard.
                </p>
              </div>
              <button
                onClick={() => setActiveSection("addHostelForm")}
                className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                + Add Hostel
              </button>
            </div>
            {hostels && hostels.length > 0 ? (
              <div className="grid gap-5">
                {hostels.map(h => (
                  <div key={h.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    {editingHostelId === h.id && editingHostel ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <input value={editingHostel.name} onChange={(e) => setEditingHostel({ ...editingHostel, name: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Hostel name" />
                        <input value={editingHostel.location} onChange={(e) => setEditingHostel({ ...editingHostel, location: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Location" />
                        <input type="number" value={editingHostel.rooms} onChange={(e) => setEditingHostel({ ...editingHostel, rooms: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Available seats" min="0" />
                        <input type="number" value={editingHostel.totalRooms} onChange={(e) => setEditingHostel({ ...editingHostel, totalRooms: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Total seats" min="0" />
                        <input type="number" value={editingHostel.priceAmount} onChange={(e) => setEditingHostel({ ...editingHostel, priceAmount: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Monthly price" min="0" />
                        <input type="number" step="0.1" value={editingHostel.rating} onChange={(e) => setEditingHostel({ ...editingHostel, rating: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Rating" min="0" max="5" />
                        <input value={editingHostel.contactWhatsapp} onChange={(e) => setEditingHostel({ ...editingHostel, contactWhatsapp: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="WhatsApp number" />
                        <input type="email" value={editingHostel.contactEmail} onChange={(e) => setEditingHostel({ ...editingHostel, contactEmail: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Contact email" />
                        <textarea value={editingHostel.facilities} onChange={(e) => setEditingHostel({ ...editingHostel, facilities: e.target.value })} className="rounded-xl border border-slate-300 px-3 py-2 md:col-span-2" placeholder="Facilities, comma separated" rows="2" />
                        <div className="flex gap-2 md:col-span-2">
                          <button onClick={() => handleSaveHostel(h.id)} className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Save Changes</button>
                          <button onClick={handleCancelHostelEdit} className="rounded-full bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-bold text-slate-900">{h.name}</h3>
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                              {h.rooms}/{h.totalRooms ?? h.rooms} seats
                            </span>
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                              ⭐ {h.rating ?? 4.5}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">📍 {h.location}</p>
                          <p className="mt-1 text-sm font-semibold text-indigo-600">{h.price || `৳ ${h.priceAmount ?? 0}/month`}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(h.facilities || []).map((facility, idx) => (
                              <span key={`${h.id}-${facility}-${idx}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                {facility}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-xs text-slate-500">
                            Room pictures and more details: WhatsApp {h.contactWhatsapp || "+880 1700-000000"} or email {h.contactEmail || "info@staynest.com"}.
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => handleEditHostel(h)} className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">Edit</button>
                          <button onClick={() => handleDeleteHostel(h.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-slate-600">No hostels available.</p>
            )}
          </div>
        )}

        {/* Add Hostel Form Page */}
        {activeSection === "addHostelForm" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">➕ Add New Hostel</h2>
            <form onSubmit={handleAddHostel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Hostel Name</label>
                <input type="text" value={newHostel.name} onChange={(e) => setNewHostel({ ...newHostel, name: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Location</label>
                <input type="text" value={newHostel.location} onChange={(e) => setNewHostel({ ...newHostel, location: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Available Seats</label>
                <input type="number" value={newHostel.rooms} onChange={(e) => setNewHostel({ ...newHostel, rooms: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" required min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Total Seats</label>
                <input type="number" value={newHostel.totalRooms} onChange={(e) => setNewHostel({ ...newHostel, totalRooms: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" min="0" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Monthly Price</label>
                <input type="number" value={newHostel.priceAmount} onChange={(e) => setNewHostel({ ...newHostel, priceAmount: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" min="0" placeholder="3000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Rating</label>
                <input type="number" step="0.1" value={newHostel.rating} onChange={(e) => setNewHostel({ ...newHostel, rating: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" min="0" max="5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Facilities</label>
                <textarea value={newHostel.facilities} onChange={(e) => setNewHostel({ ...newHostel, facilities: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" placeholder="WiFi, Study Room, Laundry, Security" rows="2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">WhatsApp Number</label>
                <input value={newHostel.contactWhatsapp} onChange={(e) => setNewHostel({ ...newHostel, contactWhatsapp: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" placeholder="+880 17..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Contact Email</label>
                <input type="email" value={newHostel.contactEmail} onChange={(e) => setNewHostel({ ...newHostel, contactEmail: e.target.value })} className="mt-1 w-full p-2.5 border rounded-xl" placeholder="hostel@example.com" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 transition">Save Hostel</button>
            </form>
          </div>
        )}

        {/* Pending Requests Page */}
        {activeSection === "pendingRequests" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">⏳ Pure Pending Requests</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Hostel/Room</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Txn ID</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentBookings.filter(b => b.status === "Pending").length > 0 ? (
                  currentBookings.filter(b => b.status === "Pending").map(b => (
                    <tr key={b.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{b.userName}</td>
                      <td className="px-4 py-3">{b.room || b.hostel}</td>
                      <td className="px-4 py-3 text-indigo-600 font-bold">{b.price}</td>
                      <td className="px-4 py-3">{b.paymentMethod || "N/A"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.transactionId || b.txnId || "N/A"}</td>
                      <td className="px-4 py-3 text-center flex justify-center gap-2">
                        <button onClick={() => handleBookingAction(b.id, "Approved")} className="bg-green-600 text-white px-3 py-1 rounded-full text-xs hover:bg-green-700">Accept</button>
                        <button onClick={() => handleBookingAction(b.id, "Rejected")} className="bg-red-600 text-white px-3 py-1 rounded-full text-xs hover:bg-red-700">Reject</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4 text-slate-500">No pending bookings right now!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Booking History Page */}
        {activeSection === "bookingHistory" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4 text-slate-900">📜 Logged Booking History</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left">User Email</th>
                  <th className="px-4 py-3 text-left">Room / Hostel</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Txn ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentBookings.map(b => (
                  <tr key={b.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{b.userEmail}</td>
                    <td className="px-4 py-3">{b.room || b.hostel}</td>
                    <td className="px-4 py-3">{b.paymentMethod || "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{b.transactionId || b.txnId || "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${b.status === 'Approved' ? 'bg-green-100 text-green-700' : b.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Tracking Page */}
        {activeSection === "payments" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">💳 Payment Transactions</h2>
              <p className="mt-2 text-sm text-slate-600">
                Student-submitted payment methods and transaction IDs are shown here immediately after booking.
              </p>
            </div>
            {paymentRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left">Txn ID</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">User Email</th>
                      <th className="px-4 py-3 text-left">Room / Hostel</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Method</th>
                      <th className="px-4 py-3 text-left">StayNest Account</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRecords.map((t, index) => (
                      <tr key={`${t.id}-${index}`} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-bold">{t.id}</td>
                        <td className="px-4 py-3">{t.userName || "N/A"}</td>
                        <td className="px-4 py-3">{t.email}</td>
                        <td className="px-4 py-3">{t.room || "N/A"}</td>
                        <td className="px-4 py-3 font-semibold">{t.amount}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{t.method}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{t.account || "N/A"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            t.status.includes("Pending")
                              ? "bg-yellow-100 text-yellow-700"
                              : t.status.includes("Refund")
                              ? "bg-orange-100 text-orange-700"
                              : "bg-green-100 text-green-700"
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium">No transactions recorded yet.</p>
                <p className="text-xs text-slate-400 mt-1">Student bookings with transaction IDs will appear here.</p>
              </div>
            )}
          </div>
        )}

        {/* Report Generator Page */}
        {activeSection === "generateReport" && (
          <div className="rounded-3xl bg-white p-8 shadow-lg text-center">
            <h2 className="text-2xl font-semibold mb-2 text-slate-900">📊 System Analytics Report Generator</h2>
            <p className="text-slate-500 mb-6">Download or view system wide operational logs</p>
            <div className="grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto">
              <button type="button" className="p-4 border border-slate-200 rounded-2xl bg-slate-50 cursor-pointer hover:bg-slate-100 text-left" onClick={handleDownloadUserLogs}>
                <p className="font-bold text-slate-800">👤 User Logs</p>
                <p className="text-xs text-slate-500 mt-1">Download CSV</p>
              </button>
              <button type="button" className="p-4 border border-slate-200 rounded-2xl bg-slate-50 cursor-pointer hover:bg-slate-100 text-left" onClick={handleDownloadRevenueReport}>
                <p className="font-bold text-slate-800">💰 Revenue Report</p>
                <p className="text-xs text-slate-500 mt-1">Download PDF</p>
              </button>
              <button type="button" className="p-4 border border-slate-200 rounded-2xl bg-slate-50 cursor-pointer hover:bg-slate-100 text-left" onClick={handleDownloadBookingLogs}>
                <p className="font-bold text-slate-800">📋 Booking Logs</p>
                <p className="text-xs text-slate-500 mt-1">Download Excel</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
