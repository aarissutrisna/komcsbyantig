import React from 'react';
import { ChevronRight, Zap, Shield, Globe } from 'lucide-react';

const features = [
    {
        icon: Zap,
        iconBg: 'bg-blue-100 dark:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400',
        title: 'Cepat & Efisien',
        description: 'Hitung komisi otomatis secara real-time. Tanpa proses manual yang memakan waktu.',
    },
    {
        icon: Shield,
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        title: 'Aman & Terpercaya',
        description: 'Data transaksi terenkripsi dan tersimpan aman. Transparansi penuh untuk setiap komisi.',
    },
    {
        icon: Globe,
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400',
        title: 'Akses Dimana Saja',
        description: 'Pantau omzet dan komisi dari perangkat apapun, kapanpun. Responsif di semua layar.',
    },
];

const Hero: React.FC = () => {
    return (
        <section
            className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden"
            aria-labelledby="hero-heading"
        >
            {/* Background Decor */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50"
                aria-hidden="true"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 animate-fade-in">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" aria-hidden="true" />
                    PJB Maju, Komisi Menunggu
                </div>

                <h1
                    id="hero-heading"
                    className="text-3xl xs:text-4xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-8"
                >
                    Sistem Komisi CS <br className="hidden md:block" />
                    <span className="text-primary">Puncak Jaya Baja</span>
                </h1>

                <p className="max-w-2xl mx-auto text-base xs:text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed font-medium">
                    Transparan, kredibel, otomatis dan mudah. <br className="hidden sm:block" />
                    Tingkatkan performa Omzet Anda!
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 px-4">
                    <a
                        href="/login"
                        className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center group active:scale-[0.97]"
                    >
                        Mulai Sekarang
                        <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                    </a>
                    <button className="w-full sm:w-auto bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 active:scale-[0.97]">
                        Pelajari Fitur
                    </button>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-16 text-left max-w-5xl mx-auto px-2">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <article
                                key={feature.title}
                                className={`p-6 md:p-8 rounded-3xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-xl shadow-gray-200/20 dark:shadow-none transition-all hover:-translate-y-2 hover:shadow-2xl group animate-fade-in-up stagger-${index + 1}`}
                            >
                                <div
                                    className={`w-12 h-12 rounded-2xl ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                                >
                                    <Icon size={24} aria-hidden="true" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                                    {feature.description}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Hero;
