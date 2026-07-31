import { useEffect } from "react";

const SuccessModal = ({ isOpen, onClose, type = "login" }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = type === "login" ? "Welcome Back!" : "Account Created!";
  const message =
    type === "login"
      ? "You've successfully logged in. Redirecting to your dashboard..."
      : "Your account has been created successfully. Redirecting to login...";

  return (
    <>
      {/* Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 z-40 bg-black/40 opacity-0 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      {/* Modal */}
      <div
        className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4 opacity-0 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="transform rounded-[2rem] bg-white shadow-2xl shadow-slate-900/20 transition-all duration-300"
          style={{
            scale: isOpen ? 1 : 0.8,
            transform: isOpen ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div className="mx-auto w-full max-w-sm space-y-6 px-8 py-10 text-center">
            {/* Checkmark Animation */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-400/30">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{
                  animation: isOpen ? "checkmark 0.6s ease-out 0.3s forwards" : "none",
                  opacity: 0,
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              <p className="text-slate-600">{message}</p>
            </div>

            {/* Loading Dots */}
            <div className="flex justify-center gap-2">
              <div
                className="h-2 w-2 rounded-full bg-indigo-600"
                style={{
                  animation: "bounce 1.4s infinite",
                  animationDelay: "0s",
                }}
              />
              <div
                className="h-2 w-2 rounded-full bg-indigo-600"
                style={{
                  animation: "bounce 1.4s infinite",
                  animationDelay: "0.2s",
                }}
              />
              <div
                className="h-2 w-2 rounded-full bg-indigo-600"
                style={{
                  animation: "bounce 1.4s infinite",
                  animationDelay: "0.4s",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes checkmark {
          0% {
            opacity: 0;
            transform: scale(0.5) rotateZ(-45deg);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateZ(0deg);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            opacity: 0.5;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-10px);
          }
        }
      `}</style>
    </>
  );
};

export default SuccessModal;
