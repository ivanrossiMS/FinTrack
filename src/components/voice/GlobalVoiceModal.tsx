import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, ArrowRight, Volume2, HelpCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { parseTranscription } from '../../utils/aiParser';
import {
    detectIntent,
    resolveQuery,
    stopSpeaking,
    parseCommitment,
    type VoiceIntent,
} from '../../utils/intentParser';
import { askGemini, type FinancialContext } from '../../utils/geminiAI';
import './GlobalVoiceModal.css';

interface GlobalVoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ModalStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'AI_THINKING' | 'QUERY_RESULT' | 'ERROR';

const HINTS = [
    { icon: '💸', text: '"Gastei 50 reais no mercado"' },
    { icon: '📅', text: '"Criar compromisso luz 200 dia 10"' },
    { icon: '🗺️', text: '"Ir para relatórios"' },
    { icon: '📊', text: '"Qual meu saldo esse mês"' },
    { icon: '⚠️', text: '"Tenho contas vencidas?"' },
    { icon: '🎯', text: '"Quais vencimentos tenho hoje"' },
];

const INTENT_LABELS: Record<string, string> = {
    navigate: '🗺️ Navegação',
    transaction: '💸 Lançamento',
    commitment: '📅 Compromisso',
    query: '🔍 Consulta',
    help: '❓ Ajuda',
    unknown: '🎙️ Ouvindo...',
};

export const GlobalVoiceModal: React.FC<GlobalVoiceModalProps> = ({ isOpen, onClose }) => {
    const { data } = useData();
    const navigate = useNavigate();

    const [status, setStatus] = useState<ModalStatus>('IDLE');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [intent, setIntent] = useState<VoiceIntent | null>(null);
    const [queryAnswer, setQueryAnswer] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // ── Refs that are always current ───────────────────────────
    const recognitionRef = useRef<any>(null);
    const autoExecTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isOpenRef = useRef(isOpen);
    const dataRef = useRef(data);
    const navigateRef = useRef(navigate);
    const onCloseRef = useRef(onClose);
    const transcriptRef = useRef('');
    const isProcessingRef = useRef(false);
    // Store latest startRecognition/executeCommand so async callbacks never use stale closures
    const startRecognitionRef = useRef<() => void>(() => { });
    const executeCommandRef = useRef<(text: string) => void>(() => { });

    // Sync refs with new values every render
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
    useEffect(() => { dataRef.current = data; }, [data]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    // Update intent badge as user speaks
    useEffect(() => {
        const text = transcript || interimText;
        if (text.length > 3) {
            const detected = detectIntent(text);
            if (detected.confidence > 0.3) setIntent(detected);
        } else {
            setIntent(null);
        }
    }, [transcript, interimText]);

    // ── Stop everything ──────────────────────────────────────────
    const stopAll = () => {
        if (autoExecTimerRef.current) { clearTimeout(autoExecTimerRef.current); autoExecTimerRef.current = null; }
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
            recognitionRef.current = null;
        }
        stopSpeaking();
        setIsListening(false);
    };

    // ── Reset state for next command ────────────────────────────
    const resetForNextCommand = () => {
        setTranscript('');
        setInterimText('');
        setQueryAnswer('');
        transcriptRef.current = '';
        isProcessingRef.current = false;
        setIntent(null);
        setStatus('IDLE');
        setErrorMsg('');
    };

    // ── Execute a recognised command ─────────────────────────────
    const executeCommand = async (text: string) => {
        if (!text.trim() || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setStatus('PROCESSING');

        // Stop active recognition & TTS
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
            recognitionRef.current = null;
        }
        stopSpeaking();
        setIsListening(false);

        const detected = detectIntent(text);
        setIntent(detected);

        const nav = navigateRef.current;
        const close = onCloseRef.current;
        const d = dataRef.current;

        // Common handler for speaking and then CLOSING
        const speakAndClose = (answer: string) => {
            setQueryAnswer(answer);
            setStatus('QUERY_RESULT');

            const doSpeak = () => {
                if (!window.speechSynthesis) {
                    // No TTS — close after 3s
                    setTimeout(() => {
                        if (!isOpenRef.current) return;
                        close();
                        resetForNextCommand();
                    }, 3000);
                    return;
                }
                window.speechSynthesis.cancel();

                const utter = new SpeechSynthesisUtterance(answer);
                utter.lang = 'pt-BR';
                utter.rate = 1.05;
                utter.pitch = 1.0;

                // Close after speaking
                utter.onend = () => {
                    setTimeout(() => {
                        if (!isOpenRef.current) return;
                        close();
                        resetForNextCommand();
                    }, 800);
                };

                // Fallback: if onend never fires (browser bug), close after estimated duration
                const wordCount = answer.split(' ').length;
                const estimatedMs = Math.max(4000, wordCount * 450);
                const fallback = setTimeout(() => {
                    if (!isOpenRef.current) return;
                    close();
                    resetForNextCommand();
                }, estimatedMs + 1000);

                const originalOnEnd = utter.onend;
                utter.onend = (e) => {
                    clearTimeout(fallback);
                    if (originalOnEnd) (originalOnEnd as any)(e);
                };

                window.speechSynthesis.speak(utter);
            };

            // Small delay so React can render QUERY_RESULT before TTS steals audio focus
            setTimeout(doSpeak, 150);
            isProcessingRef.current = false;
        };

        switch (detected.type) {
            case 'navigate': {
                if (detected.route) { nav(detected.route); close(); }
                else { isProcessingRef.current = false; startRecognitionRef.current(); }
                break;
            }
            case 'transaction': {
                const parsed = parseTranscription(text, d.categories, d.paymentMethods, d.suppliers);
                nav('/transactions', { state: { voicePrefill: parsed, openForm: true } });
                close();
                break;
            }
            case 'commitment': {
                const parsed = parseCommitment(text, d.categories);
                nav('/commitments', { state: { voicePrefill: parsed, openForm: true } });
                close();
                break;
            }
            case 'query': {
                if (detected.queryKey) {
                    const answer = resolveQuery(detected.queryKey, d);
                    speakAndClose(answer);
                } else {
                    isProcessingRef.current = false;
                    startRecognitionRef.current();
                }
                break;
            }
            default: {
                // Unknown intent — treat as a general question for Gemini
                setStatus('AI_THINKING');

                // Collect basic financial context for personalized answers
                const txs = d.transactions || [];
                const thisMonth = new Date().toISOString().substring(0, 7);
                const monthTxs = txs.filter(t => t.date.startsWith(thisMonth));
                const income = monthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
                const expense = monthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

                const financialContext: FinancialContext = {
                    monthlyIncome: income,
                    monthlyExpenses: expense,
                    balance: income - expense,
                    pendingCommitments: (d.commitments || []).filter(c => c.status === 'PENDING').length
                };

                const geminiAnswer = await askGemini(text, financialContext);
                speakAndClose(geminiAnswer);
                break;
            }
        }
    };

    // Keep executeCommandRef current every render
    executeCommandRef.current = executeCommand;

    // ── Start speech recognition ────────────────────────────────
    const startRecognition = () => {
        if (!isOpenRef.current) return;

        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            setStatus('ERROR');
            setErrorMsg('Seu navegador não suporta reconhecimento de voz. Use o Google Chrome.');
            return;
        }

        // Abort any existing instance
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
            recognitionRef.current = null;
        }

        const rec = new SR();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        rec.onstart = () => {
            if (!isOpenRef.current) return;
            setIsListening(true);
            setStatus('LISTENING');
            setErrorMsg('');
        };

        rec.onresult = (event: any) => {
            if (!isOpenRef.current || isProcessingRef.current) return;

            let finalParts = '';
            let interimParts = '';
            for (let i = 0; i < event.results.length; i++) {
                const r = event.results[i];
                if (r.isFinal) finalParts += r[0].transcript + ' ';
                else interimParts += r[0].transcript;
            }

            setInterimText(interimParts.trim());

            // Cancel pending auto-exec if user keeps talking
            if (autoExecTimerRef.current) {
                clearTimeout(autoExecTimerRef.current);
                autoExecTimerRef.current = null;
            }

            if (finalParts.trim()) {
                const full = finalParts.trim();
                setTranscript(full);
                transcriptRef.current = full;

                const detected = detectIntent(full);

                // Auto-execute after 0.9s of silence if confident
                if (detected.confidence >= 0.6 && detected.type !== 'unknown' && !isProcessingRef.current) {
                    autoExecTimerRef.current = setTimeout(() => {
                        autoExecTimerRef.current = null;
                        if (isOpenRef.current && !isProcessingRef.current && transcriptRef.current) {
                            executeCommandRef.current(transcriptRef.current);
                        }
                    }, 900);
                }
            }
        };

        rec.onerror = (event: any) => {
            if (!isOpenRef.current) return;
            if (event.error === 'no-speech') {
                // Natural pause — restart silently
                if (!isProcessingRef.current) {
                    setTimeout(() => {
                        if (isOpenRef.current && !isProcessingRef.current) startRecognitionRef.current();
                    }, 250);
                }
                return;
            }
            if (event.error === 'aborted') return; // We aborted intentionally — ignore
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setStatus('ERROR');
                setErrorMsg('Permissão de microfone negada. Habilite nas configurações do navegador.');
                setIsListening(false);
                return;
            }
            if (event.error === 'network') {
                setStatus('ERROR');
                setErrorMsg('Erro de rede. Verifique sua conexão com a internet.');
                setIsListening(false);
                return;
            }
            // Other errors — try to restart
            setTimeout(() => {
                if (isOpenRef.current && !isProcessingRef.current) startRecognitionRef.current();
            }, 500);
        };

        rec.onend = () => {
            if (!isOpenRef.current) return;
            setIsListening(false);
            // Auto-restart unless we're processing or closing
            if (!isProcessingRef.current) {
                setTimeout(() => {
                    if (isOpenRef.current && !isProcessingRef.current) startRecognitionRef.current();
                }, 250);
            }
        };

        recognitionRef.current = rec;
        try {
            rec.start();
        } catch {
            setStatus('ERROR');
            setErrorMsg('Falha ao iniciar o microfone. Tente novamente.');
        }
    };

    // Keep startRecognitionRef current every render
    startRecognitionRef.current = startRecognition;

    // ── UI handlers ─────────────────────────────────────────────
    const handleReset = () => {
        stopAll();
        resetForNextCommand();
        setTimeout(() => startRecognitionRef.current(), 300);
    };

    const handleClose = () => {
        isProcessingRef.current = true;
        stopAll();
        onClose();
    };

    const handleManualExecute = () => {
        if (autoExecTimerRef.current) { clearTimeout(autoExecTimerRef.current); autoExecTimerRef.current = null; }
        executeCommandRef.current(transcriptRef.current);
    };

    // ── Lifecycle: open/close ────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            resetForNextCommand();
            isProcessingRef.current = false;
            const t = setTimeout(() => startRecognitionRef.current(), 400);
            return () => clearTimeout(t);
        } else {
            isProcessingRef.current = true;
            stopAll();
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cleanup on unmount ──────────────────────────────────────
    useEffect(() => {
        return () => {
            isProcessingRef.current = true;
            stopAll();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;

    const displayText = transcript || interimText;
    const hasContent = displayText.length > 0;
    const canExecute = hasContent && status !== 'ERROR' && status !== 'PROCESSING';

    return (
        <div className="gva-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
            <div className="gva-card" role="dialog" aria-modal="true" aria-label="Assistente de Voz IA">

                <button className="gva-close" onClick={handleClose} aria-label="Fechar">
                    <X size={18} />
                </button>

                <div className="gva-header">
                    <h2 className="gva-title">Assistente IA 🎙️</h2>
                    <p className="gva-subtitle">
                        {status === 'LISTENING' && 'Ouvindo... fale seu comando'}
                        {status === 'IDLE' && 'Iniciando microfone...'}
                        {status === 'PROCESSING' && 'Processando comando...'}
                        {status === 'AI_THINKING' && 'IA pensando...'}
                        {status === 'QUERY_RESULT' && 'Encerrando após resposta...'}
                        {status === 'ERROR' && 'Erro no microfone'}
                    </p>
                </div>

                <div className="gva-mic-wrapper">
                    <div className={`gva-ring ${isListening ? 'active' : ''}`} />
                    <div className={`gva-ring ${isListening ? 'active' : ''}`} />
                    <div className={`gva-ring ${isListening ? 'active' : ''}`} />
                    <button
                        className={`gva-mic-btn ${!isListening && status !== 'ERROR' ? 'idle' : ''} ${status === 'ERROR' ? 'error' : ''}`}
                        onClick={() => {
                            if (status === 'ERROR') handleReset();
                            else if (!isListening) startRecognitionRef.current();
                        }}
                        aria-label={isListening ? 'Microfone ativo' : 'Ativar microfone'}
                    >
                        {status === 'ERROR' ? <MicOff size={30} /> : <Mic size={30} />}
                    </button>
                </div>

                <div className="gva-wave">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className={`gva-bar ${isListening ? 'active' : ''}`}
                            style={{ animationDelay: `${[0, .1, .2, .3, .4, .5, .4, .3, .2, .1, 0, .1][i]}s` }}
                        />
                    ))}
                </div>

                {intent && intent.confidence > 0.3 && (
                    <div className={`gva-intent-badge ${intent.type}`}>
                        {INTENT_LABELS[intent.type] || '🎙️ Ouvindo...'}
                    </div>
                )}

                <div className="gva-transcript">
                    <div className="gva-transcript-text">
                        {status === 'ERROR' ? (
                            <span style={{ color: '#dc2626', fontSize: '0.9375rem' }}>{errorMsg}</span>
                        ) : hasContent ? (
                            <>
                                <span>{transcript}</span>
                                {interimText && <span style={{ opacity: 0.4 }}> {interimText}</span>}
                            </>
                        ) : (
                            <span style={{ opacity: 0.4 }}>Diga algo como: "Gastei 40 reais no uber"...</span>
                        )}
                    </div>
                    {!hasContent && status !== 'ERROR' && (
                        <div className="gva-transcript-hint">Aguardando sua voz...</div>
                    )}
                    {hasContent && status === 'LISTENING' && (
                        <div className="gva-transcript-hint">Detectando intenção... executará automaticamente ao parar de falar ⏱️</div>
                    )}
                </div>

                {status === 'QUERY_RESULT' && queryAnswer && (
                    <div className="gva-query-response">
                        <div className="gva-query-icon"><Volume2 size={18} /></div>
                        <p className="gva-query-text">{queryAnswer}</p>
                    </div>
                )}

                {!hasContent && status !== 'ERROR' && status !== 'QUERY_RESULT' && (
                    <div className="gva-hints">
                        <p className="gva-hints-title">Exemplos de comandos</p>
                        <div className="gva-hints-grid">
                            {HINTS.map((h, i) => (
                                <div key={i} className="gva-hint-pill">
                                    <span className="gva-hint-pill-icon">{h.icon}</span>
                                    <span>{h.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="gva-footer">
                    {status === 'QUERY_RESULT' ? (
                        <>
                            <button className="gva-btn gva-btn-cancel" onClick={handleReset}>
                                <HelpCircle size={18} /> Novo comando
                            </button>
                            <button className="gva-btn gva-btn-confirm" onClick={handleClose}>
                                Fechar
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="gva-btn gva-btn-cancel" onClick={handleClose}>
                                Cancelar
                            </button>
                            <button
                                className="gva-btn gva-btn-confirm"
                                onClick={handleManualExecute}
                                disabled={!canExecute}
                            >
                                <ArrowRight size={18} /> Executar
                            </button>
                        </>
                    )}
                </div>

                <p className="gva-privacy">🔒 Sua voz é processada localmente e não é armazenada.</p>
            </div>
        </div>
    );
};
