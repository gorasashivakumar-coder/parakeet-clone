import React, { useEffect, useState, useRef } from 'react';
import { FaRegClock, FaKiwiBird } from 'react-icons/fa'; // Use FaKiwiBird from FA (safer)

export const PopoutOverlay: React.FC = () => {
    console.log("Rendering PopoutOverlay component...");
    const [transcript, setTranscript] = useState('');
    const [answer, setAnswer] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const channelRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        // Force body background to be transparent/dark for popout
        document.body.style.backgroundColor = 'rgba(0,0,0,0)';
        document.body.style.margin = '0';
        document.body.style.overflow = 'hidden';

        const channel = new BroadcastChannel('parakeet_sync');
        channelRef.current = channel;

        channel.onmessage = (event) => {
            const { type, payload } = event.data;
            if (type === 'TRANSCRIPT') setTranscript(payload);
            if (type === 'ANSWER') {
                setAnswer(payload);
                if (payload) setIsExpanded(true); // Auto expand on answer
            }
            if (type === 'STATUS') setIsListening(payload.isListening);
        };

        // Signal that popout is ready
        channel.postMessage({ type: 'POPOUT_READY' });

        return () => {
            channel.close();
        };
    }, []);

    const sendAction = (action: string) => {
        channelRef.current?.postMessage({ type: 'ACTION', action });
    };

    return (
        <div className="min-h-screen bg-transparent flex flex-col items-center pt-10 overflow-hidden select-none font-sans">

            {/* Main Bar Container */}
            <div className={`
                bg-[#2D2D2D] text-white rounded-xl shadow-2xl border border-white/10 overflow-hidden transition-all duration-300 ease-in-out
                ${isExpanded ? 'w-[600px] h-auto' : 'w-[500px] h-[55px]'}
                flex flex-col
             `}>

                {/* Header Row (Draggable) */}
                <div className="h-[55px] flex items-center px-4 bg-[#2D2D2D] w-full draggable cursor-move select-none z-50">

                    {/* Left: Brand */}
                    <div className="flex items-center gap-2 mr-4">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <FaKiwiBird className="text-green-400" />
                        </div>
                        <span className="font-bold text-sm tracking-wide text-gray-200">ParakeetAI</span>
                    </div>

                    {/* Hide Button */}
                    <button className="bg-black/40 hover:bg-black/60 text-[10px] font-bold px-3 py-1 rounded-md text-gray-300 mr-2 transition-colors">
                        Hide
                    </button>

                    {/* Menu Dots */}
                    <div className="text-gray-500 mr-auto text-sm tracking-widest cursor-pointer hover:text-white">•••</div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-3">
                        {/* Timer (Mock) */}
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-mono">
                            <FaRegClock className="text-pink-400" />
                            <span>24 mins</span>
                        </div>

                        {/* Stop Listening */}
                        <button
                            onClick={() => sendAction('TOGGLE_LISTEN')}
                            className="bg-black/40 hover:bg-black/60 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/5 transition-colors"
                        >
                            <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
                            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                        </button>

                        {/* Exit */}
                        <button
                            onClick={() => window.close()}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Exit
                        </button>
                    </div>
                </div>

                {/* Content Area (Only visible if expanded or has content) */}
                <div className="flex-1 bg-[#252525] flex flex-col w-full relative">

                    {/* Transcript Row */}
                    <div className="px-4 py-3 text-sm font-medium text-white/90 border-b border-white/5 bg-[#2D2D2D]">
                        {transcript || "Listening..."}
                    </div>

                    {/* Action Bar (Buttons) */}
                    <div className="px-4 py-2 flex items-center gap-2 bg-[#2D2D2D]">
                        <button className="bg-black/90 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-md transition-colors border border-white/10"
                            onClick={() => sendAction('GET_ANSWER')}
                        >
                            Answer Question
                        </button>
                        <button className="bg-black/90 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-md transition-colors border border-white/10"
                            onClick={() => sendAction('ANALYZE_SCREEN')}
                        >
                            Analyse Screen
                        </button>

                        <div className="ml-auto">
                            <button className="text-gray-500 hover:text-white" onClick={() => setAnswer('')}>
                                <span className="text-[10px] bg-black/40 px-2 py-1 rounded">Clear</span>
                            </button>
                        </div>
                    </div>

                    {/* Answer Area */}
                    {answer && (
                        <div className="p-4 text-sm text-gray-300 leading-relaxed font-mono bg-[#1E1E1E] border-t border-black/50 overflow-y-auto max-h-[400px]">
                            {/* Simple markdown-like rendering could go here */}
                            <div className="whitespace-pre-wrap">{answer}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
