import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X, ArrowRight, Volume2, HelpCircle } from 'lucide-react';
import { addDays, isAfter, subDays, isBefore, endOfDay } from 'date-fns';
import { useData } from '../../contexts/DataContext';
import { parseTranscriptionAsync } from '../../utils/aiParser';
import {
    detectIntent,
    resolveQuery,
    stopSpeaking,
    parseCommitment,
    type VoiceIntent,
} from '../../utils/intentParser';
import { supabase } from '../../lib/supabaseClient';
import { SupabaseDataService } from '../../services/supabaseData';
import { toast } from 'react-hot-toast';
import { askGemini, type FinancialContext } from '../../utils/geminiAI';
import { playActivationBeep, playExecutionBeep, playDeactivationBeep } from '../../utils/audioSystem';
import './GlobalVoiceModal.css';

interface GlobalVoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ModalStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'AI_THINKING' | 'QUERY_RESULT' | 'AUTO_SAVING' | 'ERROR';

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
    const { data, addTransaction, deleteTransaction } = useData();
    const navigate = useNavigate();

    const [status, setStatus] = useState<ModalStatus>('IDLE');
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [intent, setIntent] = useState<VoiceIntent | null>(null);
    const [queryAnswer, setQueryAnswer] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [prefillFeedback, setPrefillFeedback] = useState<any>(null);

    // ── Refs that are always current ───────────────────────────
    const recognitionRef = useRef<any>(null);
    const autoExecTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        if (inactivityTimerRef.current) { clearTimeout(inactivityTimerRef.current); inactivityTimerRef.current = null; }
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
        setPrefillFeedback(null);
    };

    // ── Execute a recognised command ─────────────────────────────
    const executeCommand = async (text: string) => {
        if (!text.trim() || isProcessingRef.current) return;

        playExecutionBeep();
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

        // Helper to find a female-sounding voice for pt-BR
        const findFemaleVoice = () => {
            if (!window.speechSynthesis) return null;
            const voices = window.speechSynthesis.getVoices();
            return voices.find(v => v.lang.includes('pt-BR') &&
                (v.name.includes('Maria') || v.name.includes('Francisca') || v.name.includes('Letícia') || v.name.includes('Google português do Brasil') || v.name.includes('Daniela')));
        };

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
                const femaleVoice = findFemaleVoice();
                if (femaleVoice) utter.voice = femaleVoice;
                utter.rate = 1.7; // Ultra-fast speed
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

            // Near-instant delay for agility
            setTimeout(doSpeak, 50);
            isProcessingRef.current = false;
        };

        // --- UI Helpers ───

        const handleOkConfirm = () => {
            if (!window.speechSynthesis) return;
            const utter = new SpeechSynthesisUtterance("Ok");
            utter.lang = 'pt-BR';
            const femaleVoice = findFemaleVoice();
            if (femaleVoice) utter.voice = femaleVoice;
            utter.rate = 1.7;
            utter.pitch = 1.0;
            window.speechSynthesis.speak(utter);
        };

        switch (detected.type) {
            case 'navigate': {
                if (detected.route) { handleOkConfirm(); navigate(detected.route); close(); }
                else { isProcessingRef.current = false; startRecognitionRef.current(); }
                break;
            }
            case 'transaction': {
                setStatus('PROCESSING');

                // Greeting handled at start, so just proceed
                const userObj = (await supabase.auth.getUser()).data.user;
                if (!userObj) {
                    setErrorMsg('Usuário não autenticado.');
                    setStatus('ERROR');
                    return;
                }

                let examples: any[] = [];
                try {
                    examples = await SupabaseDataService.getVoiceExamples(userObj.id);
                } catch (e) {
                    console.warn('Could not fetch voice examples', e);
                }

                const parsed = await parseTranscriptionAsync(text, data.categories, data.paymentMethods, examples);

                // Auto-Save Logic (High Confidence & No Manual Review Flag)
                if (!parsed.needs_review && parsed.amount > 0) {
                    setPrefillFeedback(parsed);
                    setStatus('AUTO_SAVING');

                    // 1.5s delay for visual feedback before auto-save
                    setTimeout(async () => {
                        const newId = crypto.randomUUID();
                        const transactionToSave = {
                            ...parsed,
                            id: newId,
                            user_id: userObj.id,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            status: 'CONFIRMED'
                        };

                        try {
                            await addTransaction(transactionToSave);

                            // Speak confirmation
                            const utter = new SpeechSynthesisUtterance("Salvo com sucesso");
                            utter.lang = 'pt-BR';
                            const femaleVoice = findFemaleVoice();
                            if (femaleVoice) utter.voice = femaleVoice;
                            utter.rate = 1.8;
                            window.speechSynthesis.speak(utter);

                            toast((t) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '300px' }}>
                                    <div style={{ flex: 1 }}>
                                        <b style={{ display: 'block' }}>Lançamento Salvo! ✅</b>
                                        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                            {parsed.type === 'INCOME' ? 'Receita' : 'Despesa'}: R$ {parsed.amount.toFixed(2)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            await deleteTransaction(newId);
                                            toast.dismiss(t.id);
                                        }}
                                        style={{
                                            background: 'rgba(255,255,255,0.2)',
                                            color: 'white',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        Desfazer
                                    </button>
                                </div>
                            ), {
                                duration: 10000,
                                style: {
                                    background: parsed.type === 'INCOME' ? '#059669' : '#dc2626',
                                    color: '#fff',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                }
                            });

                            close();
                            // FORÇAR REFRESH PARA O USUÁRIO VER O LANÇAMENTO IMEDIATAMENTE
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        } catch (err) {
                            console.error('Auto-save error:', err);
                            setErrorMsg('Erro ao salvar automaticamente.');
                            setStatus('ERROR');
                        }
                    }, 1500);
                } else {
                    // Manual review fallback (Low Confidence or Zero Amount)
                    navigate('/transactions', { state: { voicePrefill: parsed, openForm: true } });
                    close();
                }
                break;
            }
            case 'commitment': {
                handleOkConfirm();
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

                // Share Available Capital logic
                const totalBalance = txs.reduce((acc, tx) => tx.type === 'INCOME' ? acc + tx.amount : acc - tx.amount, 0);
                const futureLimit = addDays(new Date(), 15);
                const upcomingTotal = (d.commitments || [])
                    .filter(c => c.status === 'PENDING')
                    .filter(c => {
                        const dv = new Date(c.dueDate);
                        return isAfter(dv, subDays(new Date(), 1)) && isBefore(dv, endOfDay(futureLimit));
                    })
                    .reduce((acc, c) => acc + c.amount, 0);

                const financialContext: FinancialContext = {
                    monthlyIncome: income,
                    monthlyExpenses: expense,
                    balance: income - expense,
                    availableCapital: Math.max(0, totalBalance - upcomingTotal),
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

            // User is speaking: reset or cancel inactivity timer
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
                inactivityTimerRef.current = null;
            }

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

                // "OK" command to stop recording
                if (full.toLowerCase().includes('ok') || full.toLowerCase().includes('okay')) {
                    executeCommandRef.current(full.replace(/ok|okay/gi, '').trim());
                    return;
                }

                // Auto-execute after 0.9s of silence if confident
                if (detected.confidence >= 0.6 && detected.type !== 'unknown' && !isProcessingRef.current) {
                    autoExecTimerRef.current = setTimeout(() => {
                        autoExecTimerRef.current = null;
                        if (isOpenRef.current && !isProcessingRef.current && transcriptRef.current) {
                            executeCommandRef.current(transcriptRef.current);
                        }
                    }, 600);
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
            playActivationBeep();
            resetForNextCommand();
            isProcessingRef.current = false;

            // Initial Greeting Greeting (Female, Fast)
            const speakGreeting = () => {
                if (!window.speechSynthesis) return;
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance("Olá, estou ouvindo.");
                utter.lang = 'pt-BR';
                const voices = window.speechSynthesis.getVoices();
                const femaleVoice = voices.find(v => v.lang.includes('pt-BR') &&
                    (v.name.includes('Maria') || v.name.includes('Francisca') || v.name.includes('Daniela') || v.name.includes('Google português do Brasil')));
                if (femaleVoice) utter.voice = femaleVoice;
                utter.rate = 1.8;
                window.speechSynthesis.speak(utter);
            };

            // Short delay to ensure voices are loaded if possible
            setTimeout(speakGreeting, 100);

            // 6-second auto-close if no speech detected
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = setTimeout(() => {
                if (isOpenRef.current && !transcriptRef.current && !isProcessingRef.current) {
                    playDeactivationBeep();
                    onCloseRef.current();
                }
            }, 6000);

            const t = setTimeout(() => startRecognitionRef.current(), 400);
            return () => {
                clearTimeout(t);
                if (inactivityTimerRef.current) {
                    clearTimeout(inactivityTimerRef.current);
                    inactivityTimerRef.current = null;
                }
            };
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
                        ) : status === 'AUTO_SAVING' && prefillFeedback ? (
                            <div className="gva-prefill-preview">
                                <span className="gva-prefill-type">
                                    {prefillFeedback.type === 'INCOME' ? 'RECEITA' : 'DESPESA'}
                                </span>
                                <span className="gva-prefill-amount">
                                    R$ {prefillFeedback.amount.toFixed(2)}
                                </span>
                                <span className="gva-prefill-desc">
                                    {prefillFeedback.description}
                                </span>
                                <span className="gva-prefill-cat">
                                    📁 {data.categories.find((c: any) => c.id === prefillFeedback.categoryId)?.name || 'Extras'}
                                </span>
                            </div>
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
                    {status === 'AUTO_SAVING' && (
                        <div className="gva-transcript-hint" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                            Salvando automaticamente em 1s... 🚀
                        </div>
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
