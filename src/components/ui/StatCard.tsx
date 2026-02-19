import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    icon: LucideIcon;
    iconBgClass: string;
    iconColorClass: string;
    label: string;
    value: string;
    className?: string;
    staggerClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    iconBgClass,
    iconColorClass,
    label,
    value,
    className = '',
    staggerClass = '',
}) => {
    return (
        <article
            className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
        animate-fade-in-up ${staggerClass} ${className}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${iconBgClass}`}>
                    <Icon className={`w-6 h-6 ${iconColorClass}`} aria-hidden="true" />
                </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </article>
    );
};
