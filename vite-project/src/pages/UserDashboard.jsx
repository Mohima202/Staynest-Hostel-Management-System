import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuthHook";

const PAYMENT_METHODS = [
  {
    id: "bkash",
    name: "bKash",
    accountLabel: "Merchant Number",
    accountNo: "01700-111222",
    instructions: "Send Money or Payment from your bKash app, then enter the transaction ID.",
  },
  {
    id: "nagad",
    name: "Nagad",
    accountLabel: "Merchant Number",
    accountNo: "01800-333444",
    instructions: "Pay from Nagad and submit the Nagad transaction ID.",
  },
  {
    id: "rocket",
    name: "Rocket",
    accountLabel: "Merchant Number",
    accountNo: "01900-555666",
    instructions: "Pay from Rocket and submit the Rocket transaction ID.",
  },
  {
    id: "bank",
    name: "Bank Account",
    accountLabel: "StayNest Bank",
    accountNo: "DBBL A/C 1234567890, Routing 090260434",
    instructions: "Transfer to the StayNest bank account and submit your bank reference number.",
  },
  {
    id: "visa",
    name: "Visa Card",
    accountLabel: "Card Payment",
    accountNo: "StayNest Visa Gateway STN-VISA-2026",
    instructions: "Use your Visa card reference or authorization code after payment.",
  },
  {
    id: "mastercard",
    name: "Mastercard",
    accountLabel: "Card Payment",
    accountNo: "StayNest Mastercard Gateway STN-MC-2026",
    instructions: "Use your Mastercard reference or authorization code after payment.",
  },
];

function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout, bookings, addBooking, hostels } = useAuth();
  const userBookings = user ? bookings.filter((booking) => booking.userId === user.id) : [];

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    checkIn: "",
    checkOut: "",
    paymentMethod: "bkash",
    transactionId: "",
  });
  const [activeHostelIndex, setActiveHostelIndex] = useState(0);

  const displayHostels = useMemo(() => hostels || [], [hostels]);
  const selectedHostel = displayHostels.find((hostel) => hostel.id === selectedHostelId) || null;
  const selectedPaymentMethod =
    PAYMENT_METHODS.find((method) => method.id === bookingForm.paymentMethod) || PAYMENT_METHODS[0];

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (displayHostels.length === 0) return;

    const slideTimer = window.setInterval(() => {
      setActiveHostelIndex((currentIndex) => (currentIndex + 1) % displayHostels.length);
    }, 3500);

    return () => window.clearInterval(slideTimer);
  }, [displayHostels.length]);

  const activeHostel =
    displayHostels.length > 0
      ? displayHostels[activeHostelIndex % displayHostels.length]
      : {
          id: 0,
          name: "No hostels available",
          location: "",
          rooms: 0,
          priceAmount: 0,
          price: "Unavailable",
          rating: 0,
          facilities: [],
          contactWhatsapp: "+880 1700-000000",
          contactEmail: "info@staynest.com",
        };

  const openBookingModal = (hostel) => {
    setSelectedHostelId(hostel.id);
    setBookingForm({
      checkIn: "",
      checkOut: "",
      paymentMethod: "bkash",
      transactionId: "",
    });
    setShowBookingModal(true);
  };

  const handleBookingFormChange = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

 const calculatePrice = () => {
    if (!selectedHostel || !bookingForm.checkIn || !bookingForm.checkOut) return 0;
    
    const checkIn = new Date(bookingForm.checkIn);
    const checkOut = new Date(bookingForm.checkOut);
    const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Per day price ber korar jonno monthly price ke 30 diye vaag kora holo
    const pricePerDay = selectedHostel.priceAmount / 30; 
    const totalPrice = Math.round(days * pricePerDay);
    
    return totalPrice > 0 ? totalPrice : 0;
  };
  const confirmBooking = () => {
    if (!bookingForm.checkIn || !bookingForm.checkOut) {
      alert("Please select check-in and check-out dates");
      return;
    }

    const checkIn = new Date(bookingForm.checkIn);
    const checkOut = new Date(bookingForm.checkOut);
    
    if (checkOut <= checkIn) {
      alert("Check-out date must be after check-in date");
      return;
    }

    if (!bookingForm.paymentMethod || !bookingForm.transactionId.trim()) {
      alert("Please select a payment method and enter your transaction ID");
      return;
    }

    const totalPrice = calculatePrice();
    const newBooking = {
      id: `booking_${user.id}_${selectedHostel.id}_${bookings.length + 1}_${bookingForm.checkIn}_${bookingForm.checkOut}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      hostel: selectedHostel.name,
      location: selectedHostel.location,
      room: selectedHostel.name,
      status: "Pending",
      date: new Date().toLocaleDateString(),
      checkIn: bookingForm.checkIn,
      checkOut: bookingForm.checkOut,
      price: `৳ ${totalPrice}`,
      paymentMethod: selectedPaymentMethod.name,
      paymentAccount: selectedPaymentMethod.accountNo,
      transactionId: bookingForm.transactionId.trim(),
      paymentStatus: "Submitted",
    };

    addBooking(newBooking);
    setShowBookingModal(false);
    setSelectedHostelId(null);
    
    // Show success message
    alert(`✅ Booking submitted for ${selectedHostel.name}!\nPayment transaction ID: ${bookingForm.transactionId.trim()}\nAdmin will review and approve soon.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-col items-start justify-between rounded-3xl bg-gradient-to-r from-indigo-600 to-indigo-700 p-8 text-white sm:flex-row sm:items-center">
          <div>
            <h1 className="text-4xl font-bold">👤 My Dashboard</h1>
            <p className="mt-2 text-indigo-100">Welcome, {user.name}! 👋</p>
            <p className="mt-1 text-sm text-indigo-200">Email: {user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-6 rounded-full bg-white/20 px-6 py-2.5 text-white transition hover:bg-white/30 sm:mt-0"
          >
            🚪 Logout
          </button>
        </div>

        {/* Featured Hostel Slider */}
        <div className="mb-10 overflow-hidden rounded-3xl border border-white/80 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Featured stay
              </p>
              <div className="relative mt-4 min-h-[190px] overflow-hidden rounded-3xl bg-slate-950 p-6 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.22),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.28),transparent_34%),linear-gradient(135deg,#0f172a,#111827)]" />
                <div className="relative z-10 transition-all duration-500">
                  <h2 className="text-3xl font-bold">{activeHostel.name}</h2>
                  <p className="mt-2 text-slate-300">{activeHostel.location}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                      <p className="text-xs uppercase text-slate-300">Seats</p>
                      <p className="mt-1 text-xl font-bold">
                        {activeHostel.rooms}/{activeHostel.totalRooms ?? activeHostel.rooms}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                      <p className="text-xs uppercase text-slate-300">Rating</p>
                      <p className="mt-1 text-xl font-bold">{activeHostel.rating ?? 4.5}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                      <p className="text-xs uppercase text-slate-300">Price</p>
                      <p className="mt-1 text-xl font-bold">{activeHostel.price || `৳ ${activeHostel.priceAmount ?? 0}/month`}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {(activeHostel.facilities || []).slice(0, 4).map((facility, idx) => (
                      <span
                        key={`${activeHostel.id}-${facility}-${idx}`}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-50"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 max-w-2xl text-sm text-slate-300">
                    For room pictures and other details, contact us on WhatsApp {activeHostel.contactWhatsapp || "+880 1700-000000"} or email {activeHostel.contactEmail || "info@staynest.com"}.
                  </p>
                  <button
                    onClick={() => openBookingModal(activeHostel)}
                    className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50"
                  >
                    Book this hostel
                  </button>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {displayHostels.map((hostel, index) => (
                  <button
                    key={hostel.id}
                    type="button"
                    aria-label={`Show ${hostel.name}`}
                    onClick={() => setActiveHostelIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      activeHostelIndex === index
                        ? "w-10 bg-indigo-600"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="hostel-3d-stage">
              {displayHostels.map((hostel, index) => (
                <button
                  key={hostel.id}
                  type="button"
                  onClick={() => openBookingModal(hostel)}
                  className={`hostel-3d-card hostel-3d-card-${index + 1}`}
                >
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    {hostel.location}
                  </span>
                  <span className="mt-2 block text-xl font-bold text-slate-950">
                    {hostel.name}
                  </span>
                  <span className="mt-3 block text-sm text-slate-600">
                    {hostel.rooms} seats available
                  </span>
                  <span className="mt-2 block text-xs text-slate-500">
                    {(hostel.facilities || []).slice(0, 2).join(", ")}
                  </span>
                  <span className="mt-5 inline-flex rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                    {hostel.price || `৳ ${hostel.priceAmount ?? 0}/month`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="mb-10 rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">✅ Profile Information</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4">
              <p className="text-xs font-semibold uppercase text-indigo-600">Full Name</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{user.name}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4">
              <p className="text-xs font-semibold uppercase text-blue-600">Email</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{user.email}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-4">
              <p className="text-xs font-semibold uppercase text-green-600">Account Type</p>
              <p className="mt-2 text-lg font-bold text-slate-900">👤 Student/User</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-4">
              <p className="text-xs font-semibold uppercase text-purple-600">Member Since</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{user.joinedDate}</p>
            </div>
          </div>
        </div>

        {/* My Bookings */}
        <div className="mb-10 rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-900">📋 My Bookings ({userBookings.length})</h2>
            <button 
              onClick={() => setShowBookingModal(true)}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm text-white transition hover:bg-indigo-700"
            >
              + New Booking
            </button>
          </div>
          {userBookings.length > 0 ? (
            <div className="space-y-4">
              {userBookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col items-start justify-between sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{booking.hostel}</p>
                      <p className="mt-1 text-sm text-slate-600">📅 Check-in: {booking.checkIn}</p>
                      <p className="text-sm text-slate-600">🔙 Check-out: {booking.checkOut}</p>
                      {booking.transactionId && (
                        <p className="mt-1 text-sm text-slate-600">
                          💳 {booking.paymentMethod}: <span className="font-mono">{booking.transactionId}</span>
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col items-end gap-2 sm:mt-0">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          booking.status === "Approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {booking.status === "Approved" ? "✅" : "⏳"} {booking.status}
                      </span>
                      <p className="text-lg font-bold text-indigo-600">{booking.price}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-600">No bookings yet. Start exploring hostels! 🏨</p>
          )}
        </div>

        {/* Available Hostels with Facilities & Availability */}
        <div className="rounded-3xl bg-white p-8 shadow-lg shadow-slate-200/40">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">🏨 Browse Available Hostels</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayHostels.map((hostel) => (
              <div
                key={hostel.id}
                className="flex flex-col rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm transition hover:shadow-lg"
              >
                {/* Header with availability */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-slate-900">{hostel.name}</h3>
                  <div className="rounded-full bg-yellow-100 px-3 py-1">
                    <p className="text-sm font-bold text-yellow-700">⭐ {hostel.rating}</p>
                  </div>
                </div>

                {/* Location */}
                <p className="text-sm text-slate-600 mb-3">📍 {hostel.location}</p>

                {/* Availability Status */}
                <div className="mb-4 rounded-2xl bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-600 uppercase">Available Seats</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-grow bg-slate-300 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${
                              hostel.rooms > 8
                                ? "bg-green-500"
                                : hostel.rooms > 3
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${hostel.totalRooms ? (hostel.rooms / hostel.totalRooms) * 100 : 0}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-sm font-bold text-slate-900">
                          {hostel.rooms}/{hostel.totalRooms ?? hostel.rooms}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {hostel.rooms > 8
                          ? "✅ Plenty of seats available"
                          : hostel.rooms > 3
                          ? "⚠️ Limited seats available"
                          : hostel.rooms > 0
                          ? "🔥 Almost full"
                          : "❌ Fully booked"}
                      </p>
                    </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-700 uppercase mb-2">Facilities</p>
                  <div className="flex flex-wrap gap-2">
                      {(hostel.facilities?.length ? hostel.facilities : ["Contact for details"]).map((facility, idx) => (
                      <span
                        key={`${hostel.id}-${facility}-${idx}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4 rounded-2xl bg-indigo-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-indigo-700">Need room pictures or more details?</p>
                  <p className="mt-1">
                    Contact WhatsApp {hostel.contactWhatsapp || "+880 1700-000000"} or email {hostel.contactEmail || "info@staynest.com"}.
                  </p>
                </div>

                {/* Price and Button */}
                <div className="mt-auto border-t border-slate-200 pt-4">
                  <p className="text-lg font-bold text-indigo-600 mb-3">{hostel.price || `৳ ${hostel.priceAmount ?? 0}/month`}</p>
                  <button
                    onClick={() => openBookingModal(hostel)}
                    disabled={hostel.rooms === 0}
                    className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      hostel.rooms > 0
                        ? "bg-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-slate-300 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    {hostel.rooms > 0 ? "📝 Book Now" : "❌ Fully Booked"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-slate-900">
                {selectedHostel ? "📝 Book " + selectedHostel.name : "📝 New Booking"}
              </h2>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setSelectedHostelId(null);
                }}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {selectedHostel ? (
              <div>
                {/* Hostel Details */}
                <div className="mb-6 rounded-2xl bg-slate-50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-600">Hostel Name</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{selectedHostel.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-600">Location</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{selectedHostel.location}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-600">Available Seats</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">{selectedHostel.rooms} / {selectedHostel.totalRooms ?? selectedHostel.rooms}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-600">Price Per Month</p>
                      <p className="mt-1 text-lg font-bold text-indigo-600">{selectedHostel.price || `৳ ${selectedHostel.priceAmount ?? 0}/month`}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                  <p className="text-xs font-semibold uppercase text-indigo-700">Facilities</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedHostel.facilities?.length ? selectedHostel.facilities : ["Contact for details"]).map((facility, idx) => (
                      <span
                        key={`${selectedHostel.id}-${facility}-${idx}`}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-700">
                    For room pictures and other details, contact us on WhatsApp {selectedHostel.contactWhatsapp || "+880 1700-000000"} or email {selectedHostel.contactEmail || "info@staynest.com"}.
                  </p>
                </div>

                {/* Booking Form */}
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      📅 Check-in Date
                    </label>
                    <input
                      type="date"
                      name="checkIn"
                      value={bookingForm.checkIn}
                      onChange={handleBookingFormChange}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      🔙 Check-out Date
                    </label>
                    <input
                      type="date"
                      name="checkOut"
                      value={bookingForm.checkOut}
                      onChange={handleBookingFormChange}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      min={bookingForm.checkIn || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {/* Price Summary */}
                {bookingForm.checkIn && bookingForm.checkOut && (
                  <div className="mb-6 rounded-2xl bg-indigo-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Duration</p>
                        <p className="text-lg font-bold text-slate-900">
                          {Math.ceil((new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / (1000 * 60 * 60 * 24))} nights
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Total Price</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          ৳ {calculatePrice()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase text-slate-600">Payment Method</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Choose a StayNest payment account, complete payment, then enter the transaction ID.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setBookingForm((prev) => ({ ...prev, paymentMethod: method.id }))}
                        className={`rounded-2xl border p-3 text-left transition ${
                          bookingForm.paymentMethod === method.id
                            ? "border-indigo-600 bg-indigo-50 shadow-sm"
                            : "border-slate-200 bg-slate-50 hover:border-indigo-300"
                        }`}
                      >
                        <span className="block text-sm font-bold text-slate-900">{method.name}</span>
                        <span className="mt-1 block text-xs text-slate-600">{method.accountLabel}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-600">
                      {selectedPaymentMethod.accountLabel}
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                      {selectedPaymentMethod.accountNo}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{selectedPaymentMethod.instructions}</p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Transaction ID / Reference Number
                    </label>
                    <input
                      type="text"
                      name="transactionId"
                      value={bookingForm.transactionId}
                      onChange={handleBookingFormChange}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder="Example: TXN123456789"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowBookingModal(false);
                      setSelectedHostelId(null);
                    }}
                    className="flex-1 rounded-full border-2 border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    ❌ Cancel
                  </button>
                  <button
                    onClick={confirmBooking}
                    className="flex-1 rounded-full bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700"
                  >
                    ✅ Confirm Booking
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-center text-slate-600 mb-6">Select a hostel to book</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {displayHostels.map((hostel) => (
                    <button
                      key={hostel.id}
                      onClick={() => setSelectedHostelId(hostel.id)}
                      className="rounded-2xl border-2 border-indigo-200 p-4 text-left transition hover:border-indigo-600 hover:bg-indigo-50"
                    >
                      <p className="font-bold text-slate-900">{hostel.name}</p>
                      <p className="text-sm text-slate-600">📍 {hostel.location}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {hostel.rooms}/{hostel.totalRooms ?? hostel.rooms} seats available
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {(hostel.facilities || []).slice(0, 3).join(", ")}
                      </p>
                      <p className="mt-2 text-indigo-600">{hostel.price || `৳ ${hostel.priceAmount ?? 0}/month`}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Pictures/details: WhatsApp {hostel.contactWhatsapp || "+880 1700-000000"} or {hostel.contactEmail || "info@staynest.com"}.
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
