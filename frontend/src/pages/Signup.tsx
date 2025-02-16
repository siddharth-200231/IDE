import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, ArrowLeft, Mail, Lock, User } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import axios from "axios";
import { useUser } from '../context/UserContext';
import { BASE_URL , API_ENDPOINTS } from "../api";

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
  });

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
    }

    if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({ name: "", email: "", password: "" });

    try {
      const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, formData);

      if (response.data.token) {
        const userData = {
          name: response.data.user.name,
          email: response.data.user.email
        };
        
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(userData));
        
        axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
        setUser(userData);
        navigate("/select-language");
      }
    } catch (error: any) {
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400 && data.error === "Validation failed") {
          const newErrors = { name: '', email: '', password: '' };
          data.details?.forEach((err: any) => {
            const field = err.path[0];
            if (field in newErrors) {
              newErrors[field as keyof typeof newErrors] = err.message;
            }
          });
          setErrors(newErrors);
        } else {
          setErrors({
            name: '',
            email: data.error || "Something went wrong",
            password: ''
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 animate-gradient" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="p-3 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 shadow-xl backdrop-blur-xl animate-float">
                <Code2 className="w-10 h-10 text-cyan-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl">
              <div className="px-8 pt-6 pb-4 border-b border-gray-700/50">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate("/")}
                    className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors group"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" />
                  </button>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
                    Create an account
                  </h2>
                </div>
              </div>

              <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={errors.name}
                        className="w-full pl-11 bg-gray-900/50 border-gray-700/50 text-gray-200 placeholder-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all duration-200"
                      />
                    </div>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={errors.email}
                        className="w-full pl-11 bg-gray-900/50 border-gray-700/50 text-gray-200 placeholder-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all duration-200"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        error={errors.password}
                        className="w-full pl-11 bg-gray-900/50 border-gray-700/50 text-gray-200 placeholder-gray-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className={`w-full py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-gray-900 font-medium rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-300 ${
                      isLoading ? 'opacity-80 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create account"}
                  </Button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-400">
                  Already have an account?{" "}
                  <button
                    onClick={() => navigate("/signin")}
                    className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Sign in instead
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;