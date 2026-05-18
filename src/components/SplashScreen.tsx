import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Home, ScanLine, Bell, ArrowRight } from 'lucide-react';
import { useApp } from '../lib/context';

const SLIDES = [
    {
        title: "Welcome to Lighthouse",
        description: "Your modern estate portal for a secure and connected community life.",
        icon: <Shield className="w-12 h-12 text-emerald-500" />,
        bg: "bg-emerald-50"
    },
    {
        title: "Seamless Access",
        description: "Generate visitor passes and manage home access with just a few taps.",
        icon: <Home className="w-12 h-12 text-blue-500" />,
        bg: "bg-blue-50"
    },
    {
        title: "Security Frist",
        description: "Real-time verification and emergency SOS alerts for peace of mind.",
        icon: <ScanLine className="w-12 h-12 text-amber-500" />,
        bg: "bg-amber-50"
    },
    {
        title: "Stay Informed",
        description: "Get instant notices and participate in community townhalls effortlessly.",
        icon: <Bell className="w-12 h-12 text-purple-500" />,
        bg: "bg-purple-50"
    }
];

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
    const [current, setCurrent] = useState(0);

    const next = () => {
        if (current < SLIDES.length - 1) {
            setCurrent(current + 1);
        } else {
            onFinish();
        }
    };

    return (
        <div className="fixed inset-0 z-[500] bg-white dark:bg-stone-950 flex flex-col items-center justify-between p-8 text-center overscroll-none transition-colors">
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col items-center"
                    >
                        <div className={`p-8 rounded-3xl ${SLIDES[current].bg} dark:bg-opacity-10 mb-8 shadow-inner`}>
                            {SLIDES[current].icon}
                        </div>
                        <h2 className="text-3xl font-bold text-brand-black dark:text-gray-100 mb-4 tracking-tight leading-tight">
                            {SLIDES[current].title}
                        </h2>
                        <p className="text-gray-500 dark:text-stone-400 font-medium leading-relaxed">
                            {SLIDES[current].description}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="w-full max-w-xs pb-12">
                <div className="flex justify-center gap-2 mb-8">
                    {SLIDES.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-emerald-600' : 'w-2 bg-gray-200 dark:bg-stone-800'}`}
                        />
                    ))}
                </div>
                <button
                    onClick={next}
                    className="w-full neo-btn-primary py-4 flex items-center justify-center gap-3 active:scale-95"
                >
                    {current === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    <ArrowRight className="w-5 h-5" />
                </button>
                {current < SLIDES.length - 1 && (
                    <button
                        onClick={onFinish}
                        className="mt-4 text-xs font-bold text-gray-400 dark:text-stone-500 uppercase tracking-widest"
                    >
                        Skip
                    </button>
                )}
            </div>
        </div>
    );
}
