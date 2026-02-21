import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
    return (
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
                {subtitle && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{subtitle}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
        </header>
    );
};
