import { FaInbox } from 'react-icons/fa';
import Button from './Button';
import { useNavigate } from 'react-router-dom';

const EmptyState = ({
  icon: Icon = FaInbox,
  title = 'Nothing here yet',
  description = 'Get started by adding items',
  actionLabel = 'Browse Services',
  onAction,
  showAction = true
}) => {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-6 border-2 border-gray-400 dark:border-gray-700">
        <Icon className="text-4xl text-gray-700 dark:text-gray-400" />
      </div>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-md font-medium">{description}</p>
      {showAction && (
        <Button onClick={handleAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
