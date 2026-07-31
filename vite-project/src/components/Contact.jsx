import { useState } from "react";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus({ type: "error", text: "Please fill in all fields." });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      setStatus({ type: "success", text: "Your message has been sent. We will contact you soon." });
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setStatus({ type: "error", text: error.message || "Failed to send message." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl rounded-[2.5rem] bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-10 shadow-xl shadow-slate-200/40 sm:px-10 lg:px-14">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-8">
          <div className="rounded-[2rem] bg-indigo-600/5 p-8 text-slate-900 ring-1 ring-indigo-100">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-700">Reach out anytime</p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Contact our support team for quick hostel help.</h2>
            <p className="mt-4 max-w-xl text-slate-600">Whether you need booking support, hostel information, or help choosing the right room, our team is ready to assist you.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Email</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">StayNest IIUC@gmail.com</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">Fast replies for booking requests and general questions.</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/40">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Phone</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">+880 1234 567 89</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">Available daily from 9am to 8pm for hostel support.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-semibold text-slate-900">Send us a message</h3>
          <p className="mt-3 text-slate-600">Fill in your details and we’ll get back to you soon.</p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Your Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Eg. ABCD"
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows="4"
                placeholder="How can we help?"
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            {status ? (
              <p className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`}>{status.text}</p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;