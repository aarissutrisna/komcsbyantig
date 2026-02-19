import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-12 w-12 border-4',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'lg',
    className = '',
}) => {
    return (
        <div
            role="status"
            aria-label="Memuat..."
            className={`flex items-center justify-center ${className}`}
        >
            <div
                className={`${sizeMap[size]} animate-spin rounded-full border-blue-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-400`}
            />
            <span className="sr-only">Memuat...</span>
        </div>
    );
};
