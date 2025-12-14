import { FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";

const CheckoutSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-2xl dark:shadow-2xl dark:shadow-black/30 text-center max-w-lg w-full border-2 border-gray-300 dark:border-gray-800"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <FaCheckCircle className="text-6xl text-green-700 dark:text-green-400 mx-auto mb-6" />
        </motion.div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Booking Confirmed!</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-8 font-semibold">Thank you for your order.</p>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="w-full bg-orange-500 text-white font-black py-3 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
        >
          Go to Dashboard
        </button>
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
