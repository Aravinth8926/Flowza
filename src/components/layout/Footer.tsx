import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 dark:bg-[#090d17] text-slate-400 dark:text-[#64748b] border-t border-slate-800 dark:border-[#1e293b] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Tagline */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                F
              </div>
              <span className="text-lg font-bold text-white dark:text-[#f1f5f9] tracking-tight">Flowza</span>
            </div>
            <p className="text-xs max-w-xs leading-relaxed text-slate-400 dark:text-[#8896ab]">
              Flowza is a secure B2B Supply Chain & Procurement Platform connecting verified Vendors and Wholesale Suppliers.
            </p>
          </div>

          {/* Links: Platform */}
          <div>
            <h4 className="text-xs font-semibold text-white dark:text-[#f1f5f9] tracking-wider uppercase mb-4">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-white dark:hover:text-[#f1f5f9] transition-colors">Features</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white dark:hover:text-[#f1f5f9] transition-colors">How It Works</a>
              </li>
              <li>
                <Link to="/about" className="hover:text-white dark:hover:text-[#f1f5f9] transition-colors">About Us</Link>
              </li>
            </ul>
          </div>

          {/* Links: Legal */}
          <div>
            <h4 className="text-xs font-semibold text-white dark:text-[#f1f5f9] tracking-wider uppercase mb-4">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#" className="hover:text-white dark:hover:text-[#f1f5f9] transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="hover:text-white dark:hover:text-[#f1f5f9] transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="hover:text-white dark:hover:text-[#f1f5f9] transition-colors">Contact Support</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 dark:border-[#1e293b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Flowza Inc. All rights reserved.</p>
          <div className="flex space-x-4">
            <span className="text-slate-500 dark:text-[#64748b]">Enterprise B2B Procurement</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
