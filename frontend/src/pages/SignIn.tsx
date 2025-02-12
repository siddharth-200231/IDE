import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code2, ArrowLeft } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import axios from "axios";

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({ email: "", password: "" });

    try {
      const response = await axios.post("http://localhost:3000/user/login", {
        email: formData.email,
        password: formData.password,
      });

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
        
        navigate("/select-language");
      }
    } catch (error: any) {
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 400:
            // Handle Zod validation errors
            if (data.error === "Validation failed" && data.details) {
              const newErrors = { email: '', password: '' };
              data.details.forEach((err: any) => {
                const field = err.path[0];
                if (field in newErrors) {
                  newErrors[field as keyof typeof newErrors] = err.message;
                }
              });
              setErrors(newErrors);
            }
            break;

          case 401:
            setErrors({
              email: '',
              password: data.error || "Invalid password"
            });
            break;

          case 404:
            setErrors({
              email: data.error || "User not found",
              password: ''
            });
            break;

          default:
            setErrors({
              email: data.error || "Something went wrong",
              password: ''
            });
        }
      } else if (error.request) {
        setErrors({
          email: "Network error. Please check your connection.",
          password: ''
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_14px]" />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo Section */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/50">
              <Code2 className="w-8 h-8 text-cyan-500" />
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-gray-800/20 backdrop-blur-lg rounded-lg border border-gray-700/50 p-8">
            <div className="flex items-center mb-6">
              <button
                onClick={() => navigate("/")}
                className="text-gray-400 hover:text-cyan-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-medium text-gray-200 text-center flex-1 mr-5">
                Welcome back
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                error={errors.email}
                className="w-full bg-gray-900/50 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-cyan-500"
              />

              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                error={errors.password}
                className="w-full bg-gray-900/50 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-cyan-500"
              />

              <Button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-medium transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-400">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-cyan-500 hover:text-cyan-400 font-medium transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
