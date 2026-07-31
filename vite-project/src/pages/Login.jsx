import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuthHook";
import SuccessModal from "../components/SuccessModal";

function Login() {
  const navigate = useNavigate();
  const { login, loginError, setLoginError } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoginError("");

    if (!email || !password) {
      setLoginError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    const authRole = await login(email, password, role);
    setIsSubmitting(false);

    if (authRole) {
      setShowModal(true);
      setTimeout(() => {
        navigate(authRole === "admin" ? "/admin" : "/dashboard");
      }, 1200);
    }
  };

  const disabled = isSubmitting;

  return (
    <>
      <div className="mx-auto my-10 max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/80">
        <h2 className="mb-6 text-3xl font-semibold text-slate-900">Login to StayNest</h2>

        {loginError && (
          <div className="mb-6 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">{loginError}</p>
          </div>
        )}

        <div className="mb-6 rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Login As:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRole("user");
                setLoginError("");
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                role === "user"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Student/User
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("admin");
                setLoginError("");
              }}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                role === "admin"
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              type="email"
              placeholder="name@iiuc.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLoginError("");
              }}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLoginError("");
              }}
              required
            />
          </div>
          <button
            className="w-full rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={disabled}
          >
            {disabled ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Removed Firebase-specific note — auth is handled by the backend (MongoDB) */}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <button
            type="button"
            className="font-medium text-indigo-600 hover:text-indigo-700"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
          <button
            type="button"
            className="font-medium text-indigo-600 hover:text-indigo-700"
            onClick={() => navigate("/signup")}
          >
            Create Account
          </button>
        </div>
      </div>
      <SuccessModal isOpen={showModal} onClose={() => setShowModal(false)} type="login" />
    </>
  );
}

export default Login;
