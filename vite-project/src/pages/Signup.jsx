import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuthHook";
import SuccessModal from "../components/SuccessModal";

function Signup() {
  const navigate = useNavigate();
  const { signup, signupError, setSignupError } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSignupError("");

    if (!name || !email || !password || !confirmPassword) {
      setSignupError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const success = await signup(name, email, password, role);
    setIsSubmitting(false);

    if (success) {
      setShowModal(true);
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    }
  };

  const disabled = isSubmitting;

  return (
    <>
      <div className="mx-auto my-10 max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/80">
        <h2 className="mb-6 text-3xl font-semibold text-slate-900">Create Account</h2>

        {signupError && (
          <div className="mb-6 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">{signupError}</p>
          </div>
        )}

        <div className="mb-6 rounded-2xl bg-slate-50 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Register As:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRole("user");
                setSignupError("");
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
                setSignupError("");
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
            <label className="text-sm font-semibold text-slate-700">Full Name</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSignupError("");
              }}
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Email Address</label>
            <input
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              type="email"
              placeholder="name@iiuc.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSignupError("");
              }}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative mt-2">
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-4 pr-20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSignupError("");
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-indigo-600"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Password must be at least 6 characters long</p>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
            <div className="relative mt-2">
              <input
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-4 pr-20 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setSignupError("");
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-sm font-semibold text-indigo-600"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            className="w-full rounded-full bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={disabled}
          >
            {disabled ? "Creating account..." : "Create Account"}
          </button>
        </form>

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
            onClick={() => navigate("/login")}
          >
            Already have an account?
          </button>
        </div>
      </div>
      <SuccessModal isOpen={showModal} onClose={() => setShowModal(false)} type="signup" />
    </>
  );
}

export default Signup;
