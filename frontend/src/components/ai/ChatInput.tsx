import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  placeholder = 'Ask Flowza AI about your business data...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [input]);

  return (
    <div className="relative w-full bg-white dark:bg-[#14171F] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
      <div className="flex items-end p-2.5 sm:p-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          disabled={isLoading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={1500}
          className="w-full resize-none bg-transparent border-0 focus:ring-0 focus:outline-hidden text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 max-h-36 leading-relaxed py-1.5 px-1 disabled:opacity-50"
        />

        <div className="flex items-center gap-2 pl-2 shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            title="Send inquiry"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2 pt-0 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60 font-mono">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          <span>Press <strong>Enter</strong> to send</span>
        </div>
        <span>{input.length}/1500</span>
      </div>
    </div>
  );
};
