import React, { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';

export const OrientationLock: React.FC = () => {
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            // Only trigger on mobile/tablet widths
            const isMobile = window.innerWidth <= 768;
            const isLandscapeMode = window.matchMedia('(orientation: landscape)').matches;
            setIsLandscape(isMobile && isLandscapeMode);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    if (!isLandscape) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(20px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'rgba(88, 80, 236, 0.15)',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                border: '1px solid rgba(88, 80, 236, 0.3)',
                animation: 'rotate-phone 2s ease-in-out infinite'
            }}>
                <Smartphone size={40} color="#5850ec" />
            </div>

            <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em'
            }}>
                Por favor, gire o dispositivo
            </h2>

            <p style={{
                fontSize: '0.9375rem',
                opacity: 0.7,
                maxWidth: '260px',
                lineHeight: 1.5
            }}>
                Para uma melhor experiência de visualização, utilize o FinTrack na vertical (modo retrato).
            </p>

            <style>{`
                @keyframes rotate-phone {
                    0% { transform: rotate(90deg); }
                    50% { transform: rotate(0deg); }
                    100% { transform: rotate(90deg); }
                }
                body { overflow: hidden !important; }
            `}</style>
        </div>
    );
};
