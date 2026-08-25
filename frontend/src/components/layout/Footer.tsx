import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-[#08090A] text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800/80 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-slate-950 font-bold text-sm">
                F
              </div>
              <span className="font-heading text-lg font-bold text-slate-900 dark:text-white tracking-tight">Flowza</span>
            </div>
            <p className="text-xs md:text-sm max-w-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Enterprise B2B Procurement & Supply Chain Network connecting verified vendors and wholesale suppliers with zero-latency stock sync and instant purchase order fulfillment.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 pt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Systems Operational — 99.98% SLA</span>
            </div>
          </div>

          {/* Links: Platform */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 tracking-wider uppercase mb-3.5 font-heading">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li>
                <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Supply Engine</a>
              </li>
              <li>
                <a href="#simulator" className="hover:text-slate-900 dark:hover:text-white transition-colors">Trade Simulator</a>
              </li>
              <li>
                <Link to="/about" className="hover:text-slate-900 dark:hover:text-white transition-colors">Architecture & About</Link>
              </li>
              <li>
                <Link to="/assistant" className="text-emerald-600 dark:text-emerald-400 hover:underline">Flowza AI Assistant</Link>
              </li>
            </ul>
          </div>

          {/* Links: Security */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 tracking-wider uppercase mb-3.5 font-heading">
              Trust & Compliance
            </h4>
            <ul className="space-y-2.5 text-xs md:text-sm">
              <li className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>GSTIN Verified Trade</span>
              </li>
              <li>
                <span className="text-slate-600 dark:text-slate-400">OAuth2 JWT + BCrypt</span>
              </li>
              <li>
                <span className="text-slate-600 dark:text-slate-400">Multi-Tenant Isolation</span>
              </li>
              <li>
                <span className="text-slate-600 dark:text-slate-400">Immutable Audit Logs</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500 font-mono">
          <p>&copy; {new Date().getFullYear()} Flowza Precision B2B Network. All rights reserved.</p>
          <div className="flex space-x-4">
            <span>Production Grade v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
