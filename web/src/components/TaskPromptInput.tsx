import React, { useState, useEffect, useRef } from 'react';
import { Send, Plane, Newspaper, Globe, ShieldAlert, Sparkles, Mic, MicOff } from 'lucide-react';
import { OrbiterType, ORBITERS } from './OrbiterSelector';

interface TaskPromptInputProps {
  onDispatch: (prompt: string) => void;
  disabled?: boolean;
  orbiter?: OrbiterType;
  initialPrompt?: string;
}

export const TaskPromptInput: React.FC<TaskPromptInputProps> = ({
  onDispatch,
  disabled,
  orbiter = 'scout',
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Find active orbiter info
  const currentOrbiter = ORBITERS.find((o) => o.id === orbiter) || ORBITERS[0];

  const defaultBlueprints = [
    {
      id: 'flight',
      label: 'Flight Price Watcher',
      icon: <Plane className="w-3.5 h-3.5 text-sky-400" />,
      text: 'Monitor flight prices from Chișinău to London under $125',
    },
    {
      id: 'hn',
      label: 'HN AI Trend Radar',
      icon: <Newspaper className="w-3.5 h-3.5 text-amber-400" />,
      text: 'Extract top AI announcements from Hacker News and summarize trends',
    },
    {
      id: 'diff',
      label: 'Website Diff Monitor',
      icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
      text: 'Inspect website status for breaking updates and schedule periodic diffs',
    },
    {
      id: 'hitl',
      label: 'Webhook (HITL Approval)',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
      text: 'Prepare and dispatch outbound webhook payload with human clearance',
    },
  ];

  // Combine orbiter-specific blueprints with defaults
  const activeBlueprints = currentOrbiter.blueprints.map((b, idx) => ({
    id: `orb_${idx}`,
    label: b.label,
    icon: <Sparkles className="w-3.5 h-3.5 text-orbit-cyan" />,
    text: b.prompt,
  }));

  const blueprints = [...activeBlueprints, ...defaultBlueprints.slice(0, 2)];

  // Web Speech Voice Dictation handler
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice dictation is not supported by your current browser. You can type your prompt directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;
    onDispatch(prompt.trim());
    setPrompt('');
  };

  const handleSelectBlueprint = (text: string) => {
    setPrompt(text);
  };

  return (
    <div className="space-y-3">
      {/* Quick-Launch Blueprint Chips */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-orbit-cyan" />
            <span>Recommended Blueprints for {currentOrbiter.name}:</span>
          </div>
          {isListening && (
            <span className="text-[11px] font-mono text-rose-400 animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Listening...
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {blueprints.map((bp) => (
            <button
              key={bp.id}
              type="button"
              onClick={() => handleSelectBlueprint(bp.text)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orbit-border/80 bg-orbit-card/70 hover:bg-slate-800 hover:border-slate-600 text-xs font-medium text-slate-300 transition-all active:scale-95"
            >
              {bp.icon}
              <span>{bp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Prompt Bar with Voice-to-Task Dictation */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`State goal for ${currentOrbiter.name} (e.g., 'Discover deals', 'Track trends')...`}
          disabled={disabled}
          className="w-full pl-4 pr-24 py-3.5 rounded-2xl bg-orbit-card/90 border border-orbit-border/90 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orbit-cyan focus:ring-1 focus:ring-orbit-cyan shadow-xl transition-all font-sans"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {/* Voice Dictation Button */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            disabled={disabled}
            className={`p-2 rounded-xl transition-all ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isListening ? 'Stop recording voice' : 'Dictate goal using voice'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!prompt.trim() || disabled}
            className="p-2.5 rounded-xl bg-gradient-to-r from-orbit-cyan to-orbit-violet text-slate-950 font-bold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
            title="Launch autonomous goal"
          >
            <Send className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </form>
    </div>
  );
};
