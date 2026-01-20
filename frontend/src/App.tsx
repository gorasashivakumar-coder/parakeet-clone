import { useEffect, useState, useRef, useCallback } from 'react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { AnswerOverlay } from './components/AnswerOverlay';
import { AudioVisualizer } from './components/AudioVisualizer';

function App() {
  const { isListening, transcript, interimTranscript, startListening, stopListening, resetTranscript, hasRecognitionSupport } = useSpeechRecognition();
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState(''); // Store last question
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const [isInvisible, setIsInvisible] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);

  // Initialize Broadcast Channel
  useEffect(() => {
    const channel = new BroadcastChannel('parakeet_sync');
    broadcastChannelRef.current = channel;
    return () => channel.close();
  }, []);

  // Broadcast updates
  // Send either the active transcript OR the last submitted question if currently silent
  const displayQuestion = transcript || lastSubmittedQuestion;

  useEffect(() => {
    if (broadcastChannelRef.current) {
      if (displayQuestion) broadcastChannelRef.current.postMessage({ type: 'TRANSCRIPT', payload: displayQuestion });
      broadcastChannelRef.current.postMessage({ type: 'STATUS', payload: { isListening } });
    }
  }, [displayQuestion, isListening]);

  // Broadcast currentAnswer to popout
  useEffect(() => {
    if (broadcastChannelRef.current && currentAnswer) {
      broadcastChannelRef.current.postMessage({ type: 'ANSWER', payload: currentAnswer });
    }
  }, [currentAnswer]);

  // Helper functions
  const startScreenShare = useCallback(async () => {
    try {
      // Explicitly disable audio to prevent conflicts with SpeechRecognition
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

      const track = stream.getVideoTracks()[0];
      track.onended = () => {
        console.log("Screen share stopped by browser or user.");
        setScreenStream(null);
      };

      setScreenStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  }, []);





  const handleGetAnswer = useCallback(async (options: { useVision?: boolean } = {}) => {
    // Determine the question text: either current transcript or fallback to "Analyze the screen."
    const questionText = transcript || "Analyze the screen.";

    if (socket) {
      setCurrentAnswer('');
      setLastSubmittedQuestion(questionText); // Save as last question
      resetTranscript(); // Clear the active transcript buffer!

      let image = null;
      let activeStream = screenStream;

      if (options.useVision) {
        if (!activeStream) {
          try {
            // Explicitly disable audio to prevent conflicts with SpeechRecognition
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

            const track = stream.getVideoTracks()[0];
            track.onended = () => {
              console.log("Screen share stopped by browser or user.");
              setScreenStream(null);
            };

            setScreenStream(stream);
            activeStream = stream; // Use local ref for immediate capture
          } catch (e) {
            console.error("Failed to start screen share:", e);
            return; // Abort if cancelled
          }
        }
      }

      const shouldIncludeImage = options.useVision !== undefined ? options.useVision : !!activeStream;

      if (shouldIncludeImage && activeStream) {
        // Capture from the active stream (either just acquired or existing)
        if (!videoRef.current || !canvasRef.current) return;

        // We need to ensure the video element is playing this stream for capture to work?
        // Usually yes. But if we just got the stream, we might need to set it to videoRef and wait for it to play.
        if (videoRef.current.srcObject !== activeStream) {
          videoRef.current.srcObject = activeStream;
          // Wait for video to be ready
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play();
                resolve();
              };
            } else { resolve(); }
          });
        }

        // Capture logic inline or reusing function if possible. 
        // reusing captureScreen relies on screenStream state which might be stale.
        // Let's implement inline capture to be safe with activeStream
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          image = dataUrl.split(',')[1];
        }
      }

      const payload = {
        type: 'question',
        payload: questionText,
        image: image
      };

      console.log("Sending payload with image:", !!image);
      socket.send(JSON.stringify(payload));
    }
  }, [socket, transcript, screenStream, resetTranscript]); // Removed captureScreen dependency as we inline it

  // Auto-Response Logic
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (isAutoMode && transcript && !interimTranscript) {
      // If auto mode is on, we have some transcript, and the user has stopped speaking (no interim),
      // we start a timer to auto-submit.
      timeoutId = setTimeout(() => {
        console.log("Auto-submitting question...");
        handleGetAnswer({ useVision: !!screenStream });
      }, 2000); // 2 seconds silence
    }

    return () => clearTimeout(timeoutId);
  }, [isAutoMode, transcript, interimTranscript, handleGetAnswer, screenStream]);

  // Handle incoming actions from Popout
  useEffect(() => {
    const channel = broadcastChannelRef.current;
    if (!channel) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, action } = event.data;
      if (type === 'ACTION') {
        if (action === 'TOGGLE_LISTEN') {
          if (isListeningRef.current) stopListening();
          else startListening();
        }
        if (action === 'GET_ANSWER') handleGetAnswer({ useVision: false }); // Text only
        if (action === 'ANALYZE_SCREEN') {
          // Force vision
          if (!screenStream) {
            startScreenShare().then(() => handleGetAnswer({ useVision: true }));
          } else {
            handleGetAnswer({ useVision: true });
          }
        }
      }
    };

    channel.onmessage = handleMessage;
    return () => { channel.onmessage = null; };
  }, [stopListening, startListening, handleGetAnswer, screenStream, startScreenShare]);

  // Ref to track listening state for the event handler
  const isListeningRef = useRef(isListening);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // Separate effect for toggle to allow using ref
  useEffect(() => {
    const channel = broadcastChannelRef.current;
    if (!channel) return;

    const handleToggle = (event: MessageEvent) => {
      if (event.data.type === 'ACTION' && event.data.action === 'TOGGLE_LISTEN') {
        if (isListeningRef.current) stopListening();
        else startListening();
      }
    };

    channel.addEventListener('message', handleToggle);
    return () => channel.removeEventListener('message', handleToggle);
  }, [stopListening, startListening]);


  // Connect to WebSocket
  useEffect(() => {
    // Connect to the backend
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/interview');

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      console.log('Received:', event.data);
      setCurrentAnswer(prev => prev + event.data);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const openPopout = () => {
    window.open('/popout', 'ParakeetPopout', 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no');
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isInvisible ? 'bg-transparent' : 'bg-gradient-to-br from-gray-900 via-purple-900 to-black'} text-white flex flex-col items-center justify-center p-4`}>
      {!isInvisible && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-20 -right-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        </div>
      )}

      {!isInvisible && (
        <div className="z-10 text-center space-y-8 max-w-2xl w-full">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-sm">
            Parakeet AI Clone
          </h1>
          <p className="text-gray-400 text-lg">
            Your invisible real-time interview assistant.
          </p>

          <div className="flex justify-center items-center gap-4">
            <div className={`px-3 py-1 rounded-full text-xs font-mono ${hasRecognitionSupport ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {hasRecognitionSupport ? 'Speech API Ready' : 'Speech API Unsupported'}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-mono ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {isConnected ? 'Backend Connected' : 'Connecting...'}
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
            <AudioVisualizer isListening={isListening} />

            <div className="flex gap-4">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`px-8 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/30'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                  }`}
              >
                {isListening ? 'Stop Listening' : 'Start Interview'}
              </button>

              <button
                onClick={() => handleGetAnswer({ useVision: true })}
                className="px-4 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white"
              >
                Analyze Screen
              </button>

              <button
                onClick={resetTranscript}
                className="px-4 py-2 rounded-full text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Reset
              </button>
            </div>

            <button
              onClick={openPopout}
              className="text-xs text-blue-400 hover:text-blue-300 underline mb-2 cursor-pointer"
            >
              Open Floating Pop-out Window
            </button>

            <div className="w-full flex justify-between items-center text-sm px-1">
              <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                <input type="checkbox" checked={isInvisible} onChange={() => setIsInvisible(!isInvisible)} className="form-checkbox h-4 w-4 text-purple-600 transition duration-150 ease-in-out" />
                <span>Invisible Mode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                <input type="checkbox" checked={isAutoMode} onChange={() => setIsAutoMode(!isAutoMode)} className="form-checkbox h-4 w-4 text-green-500 transition duration-150 ease-in-out" />
                <span>Auto Response</span>
              </label>
            </div>

            <div className="w-full text-left bg-black/40 p-4 rounded-lg min-h-[100px] max-h-[200px] overflow-y-auto border border-white/5 font-mono text-sm text-gray-300 relative">
              <span className="absolute top-2 right-2 text-xs text-gray-600">Transcript Preview</span>
              {displayQuestion || <span className="text-gray-600 italic">Say something...</span>}
              {interimTranscript && <span className="text-gray-500">{interimTranscript}</span>}
              {screenStream && <div className="mt-2 text-amber-400 text-xs">Screen Sharing Active</div>}
            </div>

            <button
              onClick={() => handleGetAnswer({ useVision: false })}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2"
            >
              Generate Answer (Text Only)
            </button>
          </div>
        </div>
      )}

      {/* Hidden elements for capture */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {isInvisible && (
        <div className="fixed top-4 right-4 z-[60]">
          <button onClick={() => setIsInvisible(false)} className="bg-gray-800/50 hover:bg-gray-800 text-white rounded-full p-2 text-xs">Show UI</button>
        </div>
      )}

      <AnswerOverlay question={displayQuestion} answer={currentAnswer} isMock={false} />
    </div>
  );
}

export default App;
