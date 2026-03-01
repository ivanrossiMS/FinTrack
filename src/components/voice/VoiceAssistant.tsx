import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { parseTranscriptionAsync, ParsedTransaction } from '../../utils/aiParser';
import { useAuth } from '../../contexts/AuthContext';
import { Mic, MicOff, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import './VoiceAssistant.css';
import { SupabaseDataService } from '../../services/supabaseData';

interface VoiceAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    onResult: (data: ParsedTransaction) => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose, onResult }) => {
    const { data, addTransaction } = useData();
    const { user } = useAuth();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LISTENING' | 'PROCESSING' | 'DONE' | 'ERROR'>('IDLE');
    const [errorMsg, setErrorMsg] = useState('');

    const transcriptRef = useRef('');
    const recognitionRef = useRef<any>(null);
    const isOpenRef = useRef(false);
    const isProcessingRef = useRef(false);

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
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
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
                setErrorMsg('Permissão de microfone negada.');
                setIsListening(false);
                return;
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            if (isOpenRef.current && !isProcessingRef.current) {
                setTimeout(() => {
                    if (isOpenRef.current && !isProcessingRef.current) {
                        startRecognition();
                    }
                }, 300);
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
        } catch (err) {
            setStatus('ERROR');
            setErrorMsg('Falha ao iniciar o microfone.');
        }
    }, [stopRecognition]);

    const handleFinalize = useCallback(async () => {
        const fullText = (transcriptRef.current || '').trim();
        if (!fullText) {
            onClose();
            return;
        }

        isProcessingRef.current = true;
        setStatus('PROCESSING');
        stopRecognition();

        const parsed = await parseTranscriptionAsync(
            fullText,
            user?.id || '',
            data.categories,
            data.paymentMethods
        );

        setStatus('DONE');

        if (parsed.confidence >= 0.85 && !parsed.needs_review && parsed.amount) {
            try {
                await addTransaction({
                    type: parsed.type,
                    description: parsed.description,
                    amount: parsed.amount,
                    date: parsed.date,
                    categoryId: parsed.categoryId,
                    paymentMethodId: parsed.paymentMethodId
                });

                await SupabaseDataService.saveTrainingExample(user?.id || '', fullText, {
                    type: parsed.type,
                    amount: parsed.amount,
                    category: data.categories.find(c => c.id === parsed.categoryId)?.name,
                    payment_method: data.paymentMethods.find(pm => pm.id === parsed.paymentMethodId)?.name,
                    description: parsed.description
                });
            } catch (err) {
                console.error('Auto-save failed:', err);
            }
        }

        onResult(parsed);
        setTimeout(() => onClose(), 300);
    }, [data, user, addTransaction, onResult, onClose, stopRecognition]);

    const handleReset = useCallback(() => {
        setTranscript('');
        setInterimText('');
        transcriptRef.current = '';
        isProcessingRef.current = false;
        setStatus('IDLE');
        setErrorMsg('');
        startRecognition();
    }, [startRecognition]);

    useEffect(() => {
        if (isOpen) {
            setTranscript('');
            setInterimText('');
            transcriptRef.current = '';
            isProcessingRef.current = false;
            setStatus('IDLE');
            setErrorMsg('');
            const timer = setTimeout(() => startRecognition(), 400);
            return () => clearTimeout(timer);
        } else {
            isProcessingRef.current = true;
            stopRecognition();
        }
    }, [isOpen, startRecognition, stopRecognition]);

    if (!isOpen) return null;

    const displayText = transcript || interimText;
    const hasContent = displayText.length > 0;

    return (
        <div className="voice-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="voice-modal-content">
                <button onClick={onClose} className="voice-close-btn" style={{
                    position: 'absolute', top: '1.25rem', right: '1.25rem',
                    padding: '0.5rem', borderRadius: '10px', color: '#94a3b8',
                    transition: 'all 0.2s', background: 'transparent', border: 'none'
                }}>
                    <X size={22} />
                </button>

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

                <div className="voice-wave-container">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className={`voice-wave-bar ${isListening ? 'active' : ''}`} />
                    ))}
                </div>

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

                <div className="voice-footer">
                    <p className="voice-privacy-notice">
                        Sua voz é processada pelo navegador e não é armazenada.
                    </p>
                    <div className="voice-actions">
                        {hasContent && (
                            <Button variant="secondary" onClick={handleReset}>
                                <RotateCcw size={16} /> Refazer
                            </Button>
                        )}
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button
                            variant="primary"
                            onClick={handleFinalize}
                            disabled={!hasContent || status === 'ERROR'}
                        >
                            <Check size={18} /> Finalizar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
