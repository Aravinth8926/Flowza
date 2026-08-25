import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { FlowzaLogo } from '../common/FlowzaLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#F7F6F2] dark:bg-[#0D0E12] text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <FlowzaLogo size="sm" badge="B2B Network" />
            </Link>
            <p className="text-xs md:text-sm max-w-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              One shared wholesale procurement workspace connecting verified retail supermarkets with wholesale suppliers.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-700 dark:text-amber-400 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Production Engine Active — PostgreSQL Database Connected</span>
            </div>
          </div>

          {/* Links: Platform */}
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-200 tracking-wider uppercase mb-3.5">
              Platform Workflow
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#how-it-works" className="hover:text-neutral-950 dark:hover:text-white transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#retailers" className="hover:text-neutral-950 dark:hover:text-white transition-colors">For Retailers</a>
              </li>
              <li>
                <a href="#suppliers" className="hover:text-neutral-950 dark:hover:text-white transition-colors">For Wholesale Suppliers</a>
              </li>
              <li>
                <a href="#simulator" className="hover:text-neutral-950 dark:hover:text-white transition-colors">Order Lifecycle Simulator</a>
              </li>
            </ul>
          </div>

          {/* Links: Security */}
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-200 tracking-wider uppercase mb-3.5">
              Compliance & Safety
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400" />
                <span>15-Digit GSTIN Verification</span>
              </li>
              <li>
                <span className="text-neutral-500">Atomic Stock Reservations</span>
              </li>
              <li>
                <span className="text-neutral-500">OAuth2 JWT + Encrypted Passwords</span>
              </li>
              <li>
                <span className="text-neutral-500">Immutable Audit Records</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Flowza B2B Procurement. All rights reserved.</p>
          <div className="flex space-x-4 font-mono text-[11px]">
            <span>FastAPI • PostgreSQL • Production Workspace</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
