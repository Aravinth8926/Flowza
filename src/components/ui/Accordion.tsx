import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ items, className }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className={twMerge('space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2', className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="border-b border-slate-100 dark:border-slate-800 py-3"
          >
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between text-left font-medium text-slate-900 dark:text-white py-2 focus:outline-none cursor-pointer"
            >
              <span>{item.title}</span>
              <svg
                className={clsx(
                  'h-5 w-5 text-slate-500 transition-transform duration-200',
                  isOpen && 'transform rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={clsx(
                'overflow-hidden transition-all duration-200 ease-in-out',
                isOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
              )}
            >
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pb-2">
                {item.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
