import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { parseTranscription, ParsedTransaction } from '../../utils/aiParser';
import { Mic, MicOff, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import './VoiceAssistant.css';

interface VoiceAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onResult: (data: ParsedTransaction) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose, onResult }) => {
    const { data } = useData();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PROCESSING' | 'DONE' | 'ERROR'>('IDLE');
    const [errorMsg, setErrorMsg] = useState('');

    // Use refs so callbacks always see current values
    const transcriptRef = useRef('');
    const recognitionRef = useRef<any>(null);
    const isOpenRef = useRef(false);
    const isProcessingRef = useRef(false);

    // Keep refs in sync with state
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

    const stopRecognition = useCallback(() => {
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const startRecognition = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus('ERROR');
            setErrorMsg('Seu navegador não suporta reconhecimento de voz. Use o Google Chrome.');
            return;
        }

        // Stop any existing recognition
        stopRecognition();

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            setStatus('LISTENING');
            setErrorMsg('');
            console.log('[VoiceAssistant] Recognition started');
        };

        recognition.onresult = (event: any) => {
            let finalParts = '';
            let interimParts = '';

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalParts += result[0].transcript + ' ';
                } else {
                    interimParts += result[0].transcript;
                }
            }

            const fullFinal = finalParts.trim();
            if (fullFinal) {
                setTranscript(fullFinal);
                transcriptRef.current = fullFinal;
            }
            setInterimText(interimParts.trim());

            console.log('[VoiceAssistant] Final:', fullFinal, '| Interim:', interimParts.trim());
        };

        recognition.onerror = (event: any) => {
            console.error('[VoiceAssistant] Error:', event.error);

            if (event.error === 'no-speech') {
                // No speech detected — restart silently
                if (isOpenRef.current && !isProcessingRef.current) {
                    setTimeout(() => {
                        if (isOpenRef.current && !isProcessingRef.current) {
                            startRecognition();
                        }
                    }, 300);
                }
                return;
            }

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setStatus('ERROR');
                setErrorMsg('Permissão de microfone negada. Habilite o microfone nas configurações do navegador.');
                setIsListening(false);
                return;
            }

            if (event.error === 'network') {
                setStatus('ERROR');
                setErrorMsg('Erro de rede. Verifique sua conexão com a internet.');
                setIsListening(false);
                return;
            }
        };

        recognition.onend = () => {
            console.log('[VoiceAssistant] Recognition ended');
            setIsListening(false);

            // Auto-restart if still open and not processing
            if (isOpenRef.current && !isProcessingRef.current) {
                setTimeout(() => {
                    if (isOpenRef.current && !isProcessingRef.current) {
                        console.log('[VoiceAssistant] Auto-restarting...');
                        startRecognition();
                    }
                }, 300);
            }
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (err) {
            console.error('[VoiceAssistant] Failed to start:', err);
            setStatus('ERROR');
            setErrorMsg('Falha ao iniciar o microfone. Tente novamente.');
        }
    }, [stopRecognition]);

    const handleFinalize = useCallback(() => {
        const fullText = (transcriptRef.current || '').trim();

        if (!fullText) {
            // Nothing recorded — just close
            onClose();
            return;
        }

        isProcessingRef.current = true;
        setStatus('PROCESSING');
        stopRecognition();

        console.log('[VoiceAssistant] Finalizing with text:', fullText);

        // Parse the transcription
        const parsed = parseTranscription(
            fullText,
            data.categories,
            data.paymentMethods,
            data.suppliers
        );

        console.log('[VoiceAssistant] Parsed result:', parsed);

        setStatus('DONE');

        // Send result to parent — opens the TransactionForm pre-filled
        onResult(parsed);

        // Close voice assistant
        setTimeout(() => {
            onClose();
        }, 200);
    }, [data, onResult, onClose, stopRecognition]);

    const handleReset = useCallback(() => {
        setTranscript('');
        setInterimText('');
        transcriptRef.current = '';
        isProcessingRef.current = false;
        setStatus('IDLE');
        setErrorMsg('');
        startRecognition();
    }, [startRecognition]);

    // Open/close lifecycle
    useEffect(() => {
        if (isOpen) {
            setTranscript('');
            setInterimText('');
            transcriptRef.current = '';
            isProcessingRef.current = false;
            setStatus('IDLE');
            setErrorMsg('');

            // Delay slightly for modal animation
            const timer = setTimeout(() => {
                startRecognition();
            }, 400);

            return () => clearTimeout(timer);
        } else {
            isProcessingRef.current = true; // prevent auto-restart
            stopRecognition();
        }
    }, [isOpen, startRecognition, stopRecognition]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isProcessingRef.current = true;
            stopRecognition();
        };
    }, [stopRecognition]);

    if (!isOpen) return null;

    const displayText = transcript || interimText;
    const hasContent = displayText.length > 0;

    return (
        <div className="voice-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="voice-modal-content">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1.25rem', right: '1.25rem',
                        padding: '0.5rem', borderRadius: '10px', color: '#94a3b8',
                        transition: 'all 0.2s'
                    }}
                >
                    <X size={22} />
                </button>

                {/* Status */}
                <div className="voice-status">
                    <h2>Assistente de Voz</h2>
                    <p>
                        {status === 'LISTENING' && 'Ouvindo... fale o lançamento'}
                        {status === 'IDLE' && 'Iniciando microfone...'}
                        {status === 'PROCESSING' && 'Processando...'}
                        {status === 'DONE' && 'Lançamento reconhecido!'}
                        {status === 'ERROR' && 'Erro'}
                    </p>
                </div>

                {/* Microphone Visual */}
                <div className="mic-button-wrapper">
                    {isListening && <div className="mic-ripple" />}
                    <div
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: isListening ? 'var(--color-primary)' : status === 'ERROR' ? '#fca5a5' : '#e2e8f0',
                            transition: 'all 0.3s ease',
                            transform: isListening ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isListening ? '0 4px 20px rgba(88, 80, 236, 0.4)' : 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (status === 'ERROR') handleReset();
                            else if (!isListening) startRecognition();
                        }}
                    >
                        {status === 'ERROR' ? (
                            <MicOff size={32} style={{ color: '#dc2626' }} />
                        ) : (
                            <Mic size={32} style={{ color: isListening ? 'white' : '#94a3b8' }} />
                        )}
                    </div>
                </div>

                {/* Wave Animation */}
                <div className="voice-wave-container">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className={`voice-wave-bar ${isListening ? 'active' : ''}`} />
                    ))}
                </div>

                {/* Transcript */}
                <div className="voice-transcript-box">
                    <div className="voice-transcript-text">
                        {status === 'ERROR' ? (
                            <span style={{ color: '#e53e3e', fontSize: '0.9375rem' }}>{errorMsg}</span>
                        ) : hasContent ? (
                            <>
                                <span>{transcript}</span>
                                {interimText && <span style={{ opacity: 0.4 }}> {interimText}</span>}
                            </>
                        ) : (
                            <span style={{ opacity: 0.4 }}>Diga algo como "Uber 40 reais hoje"...</span>
                        )}
                    </div>
                    {status !== 'ERROR' && (
                        <div className="voice-transcript-hint">
                            {hasContent ? 'Clique em "Finalizar" quando terminar' : 'Aguardando sua fala...'}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="voice-footer">
                    <p className="voice-privacy-notice">
                        Sua voz é processada pelo navegador e não é armazenada.
                    </p>
                    <div className="voice-actions">
                        {hasContent && (
                            <Button variant="secondary" onClick={handleReset}>
                                <RotateCcw size={16} style={{ marginRight: '0.375rem' }} />
                                Refazer
                            </Button>
                        )}
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleFinalize}
                            disabled={!hasContent || status === 'ERROR'}
                        >
                            <Check size={18} style={{ marginRight: '0.375rem' }} />
                            Finalizar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
