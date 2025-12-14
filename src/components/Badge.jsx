import { cn } from '../utils/cn';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white',
    primary: 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200',
    success: 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-200',
    warning: 'bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-200',
    danger: 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-200',
    info: 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-200'
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;
