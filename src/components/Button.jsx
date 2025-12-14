import { cn } from '../utils/cn';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  ...props
}) => {
  const baseStyles = 'font-black rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg active:scale-95',
    secondary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95',
    outline: 'border-2 border-gray-500 dark:border-gray-600 hover:border-orange-500 dark:hover:border-orange-400 text-gray-800 dark:text-gray-200 hover:text-orange-500 dark:hover:text-orange-400 active:scale-95',
    ghost: 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg active:scale-95'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
