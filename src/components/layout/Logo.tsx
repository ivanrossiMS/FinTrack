import * as React from 'react';

interface LogoProps {
    className?: string;
    showText?: boolean;
    size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 40 }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`} style={{ cursor: 'pointer' }}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full drop-shadow-sm"
                >
                    {/* Background Gradient Circle */}
                    <defs>
                        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                    </defs>

                    <rect width="100" height="100" rx="24" fill="url(#logo-gradient)" />

                    {/* Financial Growth Icon */}
                    <path
                        d="M30 70L45 55L55 65L75 40"
                        stroke="white"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M75 40H60M75 40V55"
                        stroke="white"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Abstract Coin/Currency elements */}
                    <circle cx="30" cy="70" r="6" fill="#A5B4FC" />
                    <circle cx="45" cy="55" r="5" fill="#A5B4FC" />
                    <circle cx="55" cy="65" r="5" fill="#A5B4FC" />
                </svg>
            </div>

            {showText && (
                <div className="flex flex-col">
                    <span className="text-xl font-black text-text tracking-tightest leading-none">
                        FINANCE<span className="text-primary">+</span>
                    </span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mt-1 opacity-60">
                        Smart Wealth
                    </span>
                </div>
            )}
        </div>
    );
};
