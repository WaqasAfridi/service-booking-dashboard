import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ServiceDetails from './pages/ServiceDetails';
import BookingPage from './pages/BookingPage';
import Cart from './pages/Cart';
import CheckoutSuccess from './pages/CheckoutSuccess';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import { BookingProvider } from './context/BookingContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BookingProvider>
      <div className="min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/service/:id" element={<ServiceDetails />} />
            <Route path="/booking/:id" element={<BookingPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/success" element={<CheckoutSuccess />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <Toaster 
          position="bottom-right" 
          toastOptions={{ 
            duration: 3000,
            style: {
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            },
          }} 
        />
      </div>
    </BookingProvider>
  );
}

export default App;
