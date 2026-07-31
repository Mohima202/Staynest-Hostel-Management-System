import { Link } from "react-router-dom";
import heroIllustration from "../assets/images/4.jpg";
import hostelImage1 from "../assets/images/1.png";
import hostelImage2 from "../assets/images/2.jpg";
import hostelImage3 from "../assets/images/3.jpg";

const Hero = () => {
  const stats = [
    { label: "Verified hostels", value: "25+" },
    { label: "Student bookings", value: "300+" },
    { label: "Support", value: "24/7" },
  ];

  return (
    <section className="home-hero-3d relative mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-300/70 sm:px-10 lg:px-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,197,94,0.28),transparent_30%),radial-gradient(circle_at_78%_8%,rgba(99,102,241,0.34),transparent_34%),linear-gradient(135deg,#020617,#0f172a_52%,#111827)]" />
      <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-indigo-100 backdrop-blur">
            Best hostels for IIUC students
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            StayNest IIUC
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Find safe rooms, compare seats, and book verified hostels from one clean student dashboard.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50"
              to="/signup"
            >
              Book a Room
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              to="/login"
            >
              Login
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="front-3d-stage" aria-hidden="true">
          <div className="front-3d-floor" />
          <div className="front-phone">
            <div className="front-phone-screen">
              <img src={heroIllustration} alt="" className="mx-auto h-28 w-28" />
              <p className="mt-4 text-xs font-semibold uppercase text-indigo-200">Live availability</p>
              <p className="mt-1 text-2xl font-bold">12 seats open</p>
              <div className="mt-5 space-y-2">
                <span className="block h-2 rounded-full bg-emerald-300/80" />
                <span className="block h-2 w-4/5 rounded-full bg-indigo-300/80" />
                <span className="block h-2 w-2/3 rounded-full bg-slate-300/80" />
              </div>
            </div>
          </div>

          {[hostelImage1, hostelImage2, hostelImage3].map((image, index) => (
            <div key={image} className={`front-floating-card front-floating-card-${index + 1}`}>
              <img src={image} alt="" className="h-16 w-16 rounded-2xl bg-slate-100 p-2" />
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {index === 0 ? "Green Hostel" : index === 1 ? "City Hostel" : "Dream Stay"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {index === 0 ? "8 seats" : index === 1 ? "3 seats" : "12 seats"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
