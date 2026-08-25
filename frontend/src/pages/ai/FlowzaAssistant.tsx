import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Bot,
  Trash2,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { aiService } from '../../services/aiService';
import { ChatMessageItem, AISuggestedQuestion } from '../../types';
import { ChatMessage } from '../../components/ai/ChatMessage';
import { ChatInput } from '../../components/ai/ChatInput';
import { SuggestedPrompts } from '../../components/ai/SuggestedPrompts';
import { ToolActivityBadge } from '../../components/ai/ToolActivityBadge';
import { Badge } from '../../components/ui/Badge';

export const FlowzaAssistant: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<AISuggestedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const questions = await aiService.getSuggestedQuestions();
        setSuggestedQuestions(questions);
      } catch (err) {
        console.error('Failed to load suggested questions:', err);
      }
    };
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (location.state && (location.state as any).initialPrompt) {
      const prompt = (location.state as any).initialPrompt;
      handleSendMessage(prompt);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSendMessage = async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setActiveTool(undefined);

    try {
      const response = await aiService.sendMessage(userText, conversationId || undefined);

      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      if (response.tool_calls && response.tool_calls.length > 0) {
        setActiveTool(response.tool_calls[0].tool_name);
      }

      const assistantMessage: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tool_calls: response.tool_calls,
        sources: response.sources,
        suggested_actions: response.suggested_actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text:
          err.response?.data?.error?.message ||
          'I encountered an unexpected issue while retrieving your business data. Please check your network or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setActiveTool(undefined);
    }
  };

  const handleClearChat = async () => {
    if (conversationId) {
      try {
        await aiService.clearHistory(conversationId);
      } catch (e) {
        console.warn('Could not clear remote session:', e);
      }
    }
    setMessages([]);
    setConversationId('');
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] max-w-5xl mx-auto py-1">
      {/* Top Header Card */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-[#0E1015] border border-slate-200/80 dark:border-slate-800/80 shadow-xs mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Flowza AI Business Copilot
              </h1>
              <Badge variant="emerald" dot className="uppercase text-[10px]">
                Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role: <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{user?.role?.name || 'User'}</span>
              {user?.company?.company_name && ` • ${user.company.company_name}`}
            </p>
          </div>
        </div>

        <div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Container */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 rounded-2xl bg-white dark:bg-[#0E1015] border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
        {messages.length === 0 ? (
          /* Empty State Hero Greeting */
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
              <Bot className="w-7 h-7" />
            </div>

            <h2 className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Partner'}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-lg leading-relaxed">
              I am your Flowza AI business assistant. Ask me anything about your{' '}
              <strong>inventory levels</strong>, <strong>active purchase orders</strong>,{' '}
              <strong>sales & spend analytics</strong>, or <strong>unpaid invoices</strong>.
            </p>

            {/* Feature Highlights Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full mb-6 text-left">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Strict Isolation</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Company-scoped data boundaries enforced.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Tool-Driven</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Live database verification with 0 hallucinations.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Decimal Exact</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Accurate monetary balances and stock counts.
                  </p>
                </div>
              </div>
            </div>

            {/* Suggested Prompt Recommendations */}
            <SuggestedPrompts
              questions={suggestedQuestions}
              onSelectPrompt={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        ) : (
          /* Message List */
          <div className="flex-1 space-y-1">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}

            {/* Investigating State Indicator */}
            {isLoading && (
              <div className="flex items-center gap-3 my-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-slate-950 shrink-0 shadow-sm animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <ToolActivityBadge toolName={activeTool} isInvestigating={true} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Bar */}
        <div className="mt-3 pt-2">
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={
              user?.role?.name === 'supplier'
                ? 'Ask about low stock, revenue trends, or unpaid invoices...'
                : user?.role?.name === 'vendor'
                ? 'Ask about procurement spend, supplier orders, or overdue bills...'
                : 'Ask about platform trade volume, active suppliers, or system health...'
            }
          />
        </div>
      </div>
    </div>
  );
};
