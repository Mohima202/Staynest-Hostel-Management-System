const Features = () => {
  const items = [
    {
      title: "Easy Booking",
      description: "Choose dates, review seats, and send your booking request quickly.",
    },
    {
      title: "Verified Hostels",
      description: "Browse trusted hostels with useful room and facility information.",
    },
    {
      title: "Affordable Price",
      description: "Compare monthly prices before choosing the right stay.",
    },
    {
      title: "24/7 Support",
      description: "Get help with booking questions and hostel details anytime.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl">
      <h2 className="mb-6 text-3xl font-semibold text-slate-900">Why Choose Us?</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <article
            key={item.title}
            className="feature-tilt-card rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/40"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-bold text-white">
              {index + 1}
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Features;
