import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedProps {
  children: React.ReactNode;
}

const Protected: React.FC<ProtectedProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-cyan-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default Protected;