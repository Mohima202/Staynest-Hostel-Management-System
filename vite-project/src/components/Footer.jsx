import {
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white mt-10">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col items-center">

        <hr className="w-full border-gray-700 mb-6" />

        <p className="text-center text-gray-300 mb-6">
          © 2026 StayNest IIUC. All Rights Reserved.
        </p>

        {/* Social Icons */}
        <div className="flex gap-5">

          {/* Facebook */}
          <a
            href="#"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-800
            transition-all duration-300 transform hover:-translate-y-2 hover:scale-110
            hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/40"
          >
            <FaFacebookF />
          </a>

          {/* Twitter */}
          <a
            href="#"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-800
            transition-all duration-300 transform hover:-translate-y-2 hover:scale-110
            hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-400/40"
          >
            <FaTwitter />
          </a>

          {/* Instagram */}
          <a
            href="#"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-800
            transition-all duration-300 transform hover:-translate-y-2 hover:scale-110
            hover:bg-pink-500 hover:shadow-lg hover:shadow-pink-400/40"
          >
            <FaInstagram />
          </a>

          {/* LinkedIn */}
          <a
            href="#"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-800
            transition-all duration-300 transform hover:-translate-y-2 hover:scale-110
            hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/40"
          >
            <FaLinkedinIn />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;