import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/select-language");
  }, [navigate]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-black flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center space-y-10">
        {/* Hero Section */}
        <div className="space-y-6">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            IDE Online
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            A modern development environment in your browser. Code, learn, and build projects from anywhere.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            onClick={() => navigate("/signin")}
            className="px-8 py-3 bg-white text-black rounded-lg hover:opacity-90 transition-all w-full sm:w-auto"
          >
            Sign In
          </Button>
          <Button 
            onClick={() => navigate("/signup")}
            className="px-8 py-3 bg-transparent text-white border border-white rounded-lg hover:bg-white/10 transition-all w-full sm:w-auto"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </main>
  );
};

export default Home;
