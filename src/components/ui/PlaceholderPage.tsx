import React from 'react';

interface PlaceholderPageProps {
    title: string;
    subtitle: string;
    message: string;
    accessNote?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
    title,
    subtitle,
    message,
    accessNote,
}) => {
    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{subtitle}</p>
            </header>

            <div
                className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-6"
                role="status"
            >
                <p className="text-blue-900 dark:text-blue-300">{message}</p>
                {accessNote && (
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">
                        {accessNote}
                    </p>
                )}
            </div>
        </div>
    );
};
