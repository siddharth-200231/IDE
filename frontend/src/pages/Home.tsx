import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Code2, Terminal, Cloud, Zap } from "lucide-react";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) navigate("/select-language");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

      <main className="relative min-h-screen flex flex-col items-center justify-center px-6">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block animate-float">
            <Code2 className="w-16 h-16 text-cyan-400 mb-6" />
          </div>
          
          <h1 className="text-6xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Code. Create. Deploy.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Experience the next generation of cloud development environments. 
            Write, compile, and deploy code from anywhere in the world.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Button 
              onClick={() => navigate("/signin")}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-gray-900 rounded-xl font-medium hover:from-cyan-400 hover:to-cyan-300 transition-all duration-300 w-full sm:w-auto shadow-lg shadow-cyan-500/20"
            >
              Start Coding
            </Button>
            <Button 
              onClick={() => navigate("/signup")}
              className="px-8 py-3 bg-gray-900/50 text-cyan-400 border border-cyan-500/20 rounded-xl font-medium hover:bg-cyan-500/10 transition-all duration-300 w-full sm:w-auto backdrop-blur-sm"
            >
              Create Account
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-24">
          <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-400/40 transition-all duration-300">
            <Terminal className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Multiple Languages</h3>
            <p className="text-gray-400">Support for Python, JavaScript, and Java with real-time compilation.</p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-400/40 transition-all duration-300">
            <Cloud className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Cloud Powered</h3>
            <p className="text-gray-400">Your development environment, accessible from any device, anywhere.</p>
          </div>
          
          <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 hover:border-cyan-400/40 transition-all duration-300">
            <Zap className="w-8 h-8 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Instant Execution</h3>
            <p className="text-gray-400">Lightning-fast code compilation and execution in secure containers.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
