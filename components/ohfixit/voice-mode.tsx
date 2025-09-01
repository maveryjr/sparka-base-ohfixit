'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceModeProps {
  onTranscription: (text: string) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  isEnabled?: boolean;
}

export function VoiceMode({ 
  onTranscription, 
  onSpeechStart, 
  onSpeechEnd,
  isEnabled = true 
}: VoiceModeProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check for browser support
    const speechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const speechSynthesisSupported = 'speechSynthesis' in window;
    
    setIsSupported(speechRecognitionSupported && speechSynthesisSupported);

    if (speechRecognitionSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          onSpeechStart();
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          onSpeechEnd();
        };

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }

          if (finalTranscript) {
            onTranscription(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          toast.error(`Speech recognition error: ${event.error}`);
          setIsListening(false);
        };
      }
    }

    if (speechSynthesisSupported) {
      synthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onTranscription, onSpeechStart, onSpeechEnd]);

  const startListening = () => {
    if (!recognitionRef.current || !isSupported) return;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Failed to start voice input');
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  };

  const speakText = (text: string) => {
    if (!synthesisRef.current || !isSupported) return;

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast.error('Speech synthesis error');
    };

    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel();
    setIsSpeaking(false);
  };

  if (!isSupported || !isEnabled) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isListening ? "default" : "outline"}
        size="sm"
        onClick={isListening ? stopListening : startListening}
        className="flex items-center gap-2"
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {isListening ? 'Stop Listening' : 'Voice Input'}
      </Button>
      
      <Button
        variant={isSpeaking ? "default" : "outline"}
        size="sm"
        onClick={isSpeaking ? stopSpeaking : () => {}}
        disabled={!isSpeaking}
        className="flex items-center gap-2"
      >
        {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {isSpeaking ? 'Stop Speaking' : 'TTS Ready'}
      </Button>
    </div>
  );
}

// Hook for using voice mode in components
export function useVoiceMode() {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [transcript, setTranscript] = useState('');

  const speakResponse = (text: string) => {
    if (!isVoiceEnabled) return;
    
    const synth = window.speechSynthesis;
    if (!synth) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    synth.speak(utterance);
  };

  return {
    isVoiceEnabled,
    setIsVoiceEnabled,
    transcript,
    setTranscript,
    speakResponse,
  };
}
