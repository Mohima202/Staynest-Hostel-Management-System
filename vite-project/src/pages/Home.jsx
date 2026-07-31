import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Hostels from "../components/Hostels";
import Contact from "../components/Contact";
import Footer from "../components/Footer";
function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <Header />
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-10">
        <Hero />
        <Features />
        <Hostels />
        <Contact />
      </div>
      <Footer />
    </main>
  );
}

export default Home;
