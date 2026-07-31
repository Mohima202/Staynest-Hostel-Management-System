import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuthHook";

// ✅ move OUTSIDE component
const Separator = () => (
  <span className="hidden sm:inline text-white/60">|</span>
);

const Header = () => {
  const { user, isLoggedIn } = useAuth();

  return (
    <header className="mx-auto max-w-7xl rounded-3xl border border-white/60 bg-indigo-600/95 text-white shadow-xl shadow-indigo-200/50 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold">StayNest IIUC</h2>

        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <Link className="hover:text-slate-200" to="/">
            Home
          </Link>

          <Separator />

          {isLoggedIn && user ? (
            <>
              {user.role === "admin" ? (
                <Link
                  className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 hover:bg-white/30"
                  to="/admin"
                >
                  🧑‍💼 Admin
                </Link>
              ) : (
                <Link
                  className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 hover:bg-white/30"
                  to="/dashboard"
                >
                  👤 {user.name}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link className="hover:text-slate-200" to="/login">
                Login
              </Link>

              <Separator />

              <Link className="hover:text-slate-200" to="/signup">
                Signup
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;