import React from 'react';

interface AudioVisualizerProps {
    isListening: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isListening }) => {
    if (!isListening) return null;

    return (
        <div className="flex items-center gap-1 h-8">
            <div className="w-1 h-3 bg-green-500 animate-pulse rounded-full"></div>
            <div className="w-1 h-5 bg-green-500 animate-pulse delay-75 rounded-full"></div>
            <div className="w-1 h-8 bg-green-500 animate-pulse delay-150 rounded-full"></div>
            <div className="w-1 h-4 bg-green-500 animate-pulse delay-100 rounded-full"></div>
            <div className="w-1 h-3 bg-green-500 animate-pulse delay-200 rounded-full"></div>
        </div>
    );
};
