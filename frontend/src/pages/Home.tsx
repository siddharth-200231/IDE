import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, ExternalLink } from "lucide-react";
import { Button } from "../components/Button";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/select-language");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Navbar */}
      <nav className="fixed w-full backdrop-blur-md bg-black/40 z-50 border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Code2 className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-semibold text-white">CodeForge</span>
          </div>
          <div className="flex items-center space-x-8">
            <button
              onClick={() => navigate("/signin")}
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Sign in
            </button>
            <Button
              onClick={() => navigate("/signup")}
              className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium px-6 py-2"
            >
              Start coding
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
            Write Code. Learn. Build.
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            A modern development environment designed for focused coding and
            learning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
