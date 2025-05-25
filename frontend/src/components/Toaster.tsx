import React, { useEffect } from 'react';
import { Toaster as HotToaster, toast, ToastPosition } from 'react-hot-toast';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Add a confetti effect for success toasts
const Confetti = () => {
  useEffect(() => {
    const createConfetti = () => {
      const confettiCount = 100;
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '9999';
      document.body.appendChild(container);

      const colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

      for (let i = 0; i < confettiCount; i++) {
        createConfettiPiece(container, colors);
      }

      setTimeout(() => {
        document.body.removeChild(container);
      }, 3000);
    };

    const createConfettiPiece = (container: HTMLDivElement, colors: string[]) => {
      const piece = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Random size between 5px and 10px
      const size = Math.random() * 5 + 5;
      
      piece.style.position = 'absolute';
      piece.style.backgroundColor = color;
      piece.style.width = `${size}px`;
      piece.style.height = `${size}px`;
      piece.style.opacity = '0.8';
      piece.style.borderRadius = '50%';
      piece.style.top = '0px';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      container.appendChild(piece);

      // Animation
      const animation = piece.animate(
        [
          { 
            transform: `translate3d(0, 0, 0) rotate(0deg)`, 
            opacity: 1 
          },
          { 
            transform: `translate3d(${(Math.random() - 0.5) * 300}px, ${Math.random() * 600 + 200}px, 0) rotate(${Math.random() * 360}deg)`, 
            opacity: 0 
          }
        ],
        {
          duration: Math.random() * 2000 + 1000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          fill: 'both'
        }
      );

      animation.onfinish = () => container.removeChild(piece);
    };

    return () => {
      // Cleanup will be handled by the timeout
    };
  }, []);

  return null;
};

interface ToasterProps {
  position?: ToastPosition;
  reverseOrder?: boolean;
}

export const Toaster: React.FC<ToasterProps> = ({ 
  position = 'top-right',
  reverseOrder = false
}) => {
  return (
    <HotToaster
      position={position}
      reverseOrder={reverseOrder}
      gutter={12}
      containerStyle={{
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      }}
      toastOptions={{
        duration: 5000,
        className: '!bg-transparent shadow-none !p-0',
        success: {
          icon: null,
          duration: 3000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        },
        error: {
          icon: null,
          duration: 4000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        },
        loading: {
          icon: null,
          duration: 60000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        },
        custom: {
          duration: 4000,
          icon: null,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
          },
        },
      }}
    >
      {(t) => {
        // Get the right icon and style based on toast type
        let icon = <Info className="w-5 h-5" />;
        let bgColor = 'bg-blue-500 dark:bg-blue-600';
        const textColor = 'text-white';
        let borderColor = 'border-blue-600 dark:border-blue-700';
        let progressColor = 'bg-blue-400 dark:bg-blue-500';
        
        if (t.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5" />;
          bgColor = 'bg-emerald-500 dark:bg-emerald-600';
          borderColor = 'border-emerald-600 dark:border-emerald-700';
          progressColor = 'bg-emerald-400 dark:bg-emerald-500';
        } else if (t.type === 'error') {
          icon = <AlertCircle className="w-5 h-5" />;
          bgColor = 'bg-red-500 dark:bg-red-600';
          borderColor = 'border-red-600 dark:border-red-700';
          progressColor = 'bg-red-400 dark:bg-red-500';
        } else if (t.type === 'loading') {
          icon = (
            <div className="w-5 h-5 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
          );
          bgColor = 'bg-slate-700 dark:bg-slate-800';
          borderColor = 'border-slate-600 dark:border-slate-700';
          progressColor = 'bg-blue-500 dark:bg-blue-600';
        }

        const duration = t.duration || 5000;
        const remainingTime = t.duration ? (1 - t.visible / t.duration) * 100 : 0;

        return (
          <>
            {t.type === 'success' && t.visible && <Confetti />}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center w-full max-w-sm ${
                t.visible ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              <div className={`flex-1 w-full max-w-sm overflow-hidden rounded-lg shadow-lg border ${borderColor} ${bgColor}`}>
                <div className="relative flex p-4">
                  <div className="flex-shrink-0">
                    {icon}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${textColor}`}>
                      {t.message as string}
                    </p>
                  </div>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className={`ml-4 flex-shrink-0 rounded-full p-1 ${textColor} hover:bg-opacity-20 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-white`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Progress bar */}
                {t.type !== 'loading' && (
                  <div className="relative h-0.5 w-full bg-black/10 dark:bg-white/10">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${remainingTime}%` }}
                      transition={{ duration: duration / 1000, ease: 'linear' }}
                      className={`absolute left-0 top-0 h-full ${progressColor}`}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        );
      }}
    </HotToaster>
  );
};

// Helper functions for easier usage
export const showToast = {
  success: (message: string, id?: string) => {
    const toast_id = toast.success(message, id ? { id } : undefined);
    return toast_id;
  },
  
  error: (message: string, id?: string) => 
    toast.error(message, id ? { id } : undefined),
  
  loading: (message: string, id?: string) => 
    toast.loading(message, id ? { id } : undefined),
  
  info: (message: string, options?: any) => 
    toast(message, options),
  
  dismiss: (id?: string) => 
    id ? toast.dismiss(id) : toast.dismiss(),
};

export default Toaster; 