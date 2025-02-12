import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, ArrowRight, Terminal, Globe, Zap } from "lucide-react";
import { Button } from "../components/Button";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/select-language");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-20 -left-64 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
      <div className="absolute top-40 -right-64 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl" />

      {/* Navbar */}
      <nav className="fixed w-full backdrop-blur-md bg-black/40 z-50 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-800/50 p-2 rounded-lg">
                <Code2 className="w-6 h-6 text-cyan-400" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 text-transparent bg-clip-text">
                CodeForge
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button className="text-gray-400 hover:text-cyan-400 transition-colors">
                Features
              </button>
              <button className="text-gray-400 hover:text-cyan-400 transition-colors">
                Documentation
              </button>
              <button
                onClick={() => navigate("/signin")}
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                Sign in
              </button>
              <Button
                onClick={() => navigate("/signup")}
                className="bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-6 py-2 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-cyan-500/20"
              >
                Start Coding
              </Button>
            </div>
            {/* Mobile Menu Button */}
            <button className="md:hidden text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 lg:pt-40 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-transparent bg-clip-text">
              Code. Learn. Create.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            An immersive coding environment designed for modern developers. 
            Write, run, and deploy code in seconds.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate("/signup")}
              className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-gray-900 px-8 py-3 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto border border-gray-700 text-gray-300 hover:text-white px-8 py-3 rounded-lg font-medium"
            >
              View Documentation
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
