import React from 'react';

interface AnswerOverlayProps {
    question: string;
    answer: string;
    isMock?: boolean;
}

export const AnswerOverlay: React.FC<AnswerOverlayProps> = ({ question, answer, isMock = false }) => {
    if (!question && !answer) return null;

    return (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[600px] bg-black/80 backdrop-blur-sm text-white p-6 rounded-xl border border-white/10 shadow-2xl transition-all duration-300 z-50 pointer-events-none select-none">
            {/* Header / Meta info */}
            <div className="flex justify-between items-center mb-2 opacity-50 text-xs uppercase tracking-wider font-semibold">
                <span>{isMock ? 'Demo Mode' : 'Live Assistant'}</span>
                <span>Parakeet AI</span>
            </div>

            {/* Question Display */}
            {question && (
                <div className="mb-4 text-gray-400 text-sm font-medium italic border-l-2 border-blue-500 pl-3">
                    "{question}"
                </div>
            )}

            {/* Answer Display */}
            {answer ? (
                <div className="text-lg leading-relaxed font-sans text-white drop-shadow-md">
                    {answer}
                </div>
            ) : (
                <div className="text-gray-500 text-sm animate-pulse">
                    Listening for context...
                </div>
            )}
        </div>
    );
};
