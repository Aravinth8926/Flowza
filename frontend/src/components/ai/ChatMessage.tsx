import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  User,
  Database,
  ArrowRight,
  Package,
  FileText,
  Truck,
  BarChart3,
} from 'lucide-react';
import { ChatMessageItem } from '../../types';

interface ChatMessageProps {
  message: ChatMessageItem;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  Package: <Package className="w-3.5 h-3.5" />,
  FileText: <FileText className="w-3.5 h-3.5" />,
  Truck: <Truck className="w-3.5 h-3.5" />,
  BarChart3: <BarChart3 className="w-3.5 h-3.5" />,
  ArrowRight: <ArrowRight className="w-3.5 h-3.5" />,
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const navigate = useNavigate();
  const isUser = message.sender === 'user';

  const renderFormattedContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-2.5 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1.5">
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-slate-700 dark:text-slate-300 my-0.5 leading-relaxed">
            {renderBoldAndCode(itemText)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        const itemText = line.replace(/^\d+\.\s/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-xs sm:text-sm text-slate-700 dark:text-slate-300 my-0.5 leading-relaxed">
            {renderBoldAndCode(itemText)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 my-1 leading-relaxed">
          {renderBoldAndCode(line)}
        </p>
      );
    });
  };

  const renderBoldAndCode = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 my-3 sm:my-4 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-slate-950 shrink-0 shadow-sm mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={`max-w-[88%] sm:max-w-[80%] flex flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`p-3.5 sm:p-4 rounded-2xl shadow-sm text-xs sm:text-sm ${
            isUser
              ? 'bg-emerald-600 text-white rounded-br-none'
              : message.isError
              ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-bl-none'
              : 'bg-white dark:bg-[#0E1015] border border-slate-200/90 dark:border-slate-800/90 text-slate-800 dark:text-slate-200 rounded-bl-none'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
          ) : (
            <div className="prose-sm max-w-none">
              {renderFormattedContent(message.text)}
            </div>
          )}
        </div>

        {/* Data Sources Attribution Badge */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <Database className="w-3 h-3 text-slate-400" />
            <span>Consulted Sources:</span>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((s, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Action Navigation Chips */}
        {!isUser && message.suggested_actions && message.suggested_actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2.5">
            {message.suggested_actions.map((act, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => navigate(act.path)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {ACTION_ICONS[act.icon || 'ArrowRight'] || <ArrowRight className="w-3 h-3" />}
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-mono">
          {message.timestamp}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
