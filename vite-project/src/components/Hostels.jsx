import hostelImage1 from "../assets/images/1.png";
import hostelImage2 from "../assets/images/2.jpg";
import hostelImage3 from "../assets/images/3.jpg";
import { useAuth } from "../hooks/useAuthHook";

const hostelImages = [hostelImage1, hostelImage2, hostelImage3];

function Hostels() {
  const { hostels } = useAuth();

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-indigo-600">Available stays</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Popular Hostels</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          Hover each hostel card to feel the 3D depth, then book after signup or login.
        </p>
      </div>

      <div className="grid gap-7 md:grid-cols-3">
        {(hostels || []).map((hostel, index) => (
          <article key={hostel.name} className={`hostel-showcase-card hostel-showcase-card-${index + 1}`}>
            <div className="hostel-showcase-image">
              <img src={hostelImages[index % hostelImages.length]} alt={hostel.name} className="h-36 w-full object-contain" />
            </div>
            <div className="mt-6 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{hostel.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {hostel.location} hostel with {(hostel.facilities || []).slice(0, 3).join(", ") || "student-friendly facilities"}.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                {hostel.rooms}/{hostel.totalRooms ?? hostel.rooms} seats
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(hostel.facilities?.length ? hostel.facilities : ["Contact for details"]).slice(0, 4).map((facility, facilityIndex) => (
                <span key={`${hostel.id}-${facility}-${facilityIndex}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {facility}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              For room pictures and other details, contact WhatsApp {hostel.contactWhatsapp || "+880 1700-000000"} or email {hostel.contactEmail || "info@staynest.com"}.
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
              <p className="font-bold text-indigo-600">{hostel.price || `৳ ${hostel.priceAmount ?? 0}/month`}</p>
              <button className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600">
                Book Now
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Hostels;
