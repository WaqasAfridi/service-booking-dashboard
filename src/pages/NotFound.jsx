import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { FaHome, FaSearch } from 'react-icons/fa';
import { motion } from 'framer-motion';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl"
      >
        {/* 404 Illustration */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <h1 className="text-[150px] md:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b4a] to-indigo-600 leading-none">
            404
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <FaHome />
            Back to Home
          </Button>
          <Button
            onClick={() => navigate('/?search=')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FaSearch />
            Search Services
          </Button>
        </motion.div>

        {/* Fun fact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            💡 <strong>Did you know?</strong> The 404 error has been around since the early days of the web. It's named after a room number at CERN where the first web servers were located!
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
