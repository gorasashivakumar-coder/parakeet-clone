import { useState, useEffect, useRef, useCallback } from 'react';

export interface SpeechRecognitionHook {
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    hasRecognitionSupport: boolean;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [hasRecognitionSupport, setHasRecognitionSupport] = useState(false);

    // Use useRef to keep track of the recognition instance and user intent
    const recognitionRef = useRef<any>(null);
    const shouldKeepListeningRef = useRef(false);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setHasRecognitionSupport(true);
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Default to English

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interim = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript((prev) => prev + ' ' + finalTranscript);
                }
                setInterimTranscript(interim);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    setIsListening(false);
                    shouldKeepListeningRef.current = false; // Permanent failure
                }
                // For other errors (network, no-speech, aborted), onend will trigger and we can decide to restart
            };

            recognition.onend = () => {
                setIsListening(false);
                // If user wants to keep listening, try to restart
                if (shouldKeepListeningRef.current) {
                    console.log("Speech recognition ended unexpectedly. Restarting...");
                    // Add a small delay to avoid tight loops
                    setTimeout(() => {
                        if (shouldKeepListeningRef.current && recognitionRef.current) {
                            try {
                                recognitionRef.current.start();
                            } catch (e) {
                                console.error("Failed to restart recognition:", e);
                            }
                        }
                    }, 100);
                }
            };

            recognitionRef.current = recognition;
        } else {
            console.error("Web Speech API is not supported in this browser.");
        }
    }, []);

    const startListening = useCallback(() => {
        if (recognitionRef.current && !isListening) {
            try {
                shouldKeepListeningRef.current = true;
                recognitionRef.current.start();
            } catch (error) {
                console.error("Error starting recognition:", error);
            }
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        shouldKeepListeningRef.current = false;
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        hasRecognitionSupport
    };
};
