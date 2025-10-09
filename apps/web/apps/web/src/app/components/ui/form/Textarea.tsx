import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  error,
  className = '',
  ...props
}) => {
  const baseStyles = 'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
  const normalStyles = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
  const errorStyles = 'border-red-300 focus:border-red-500 focus:ring-red-500';

  return (
    <textarea
      className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
      {...props}
    />
  );
};

export default Textarea;
