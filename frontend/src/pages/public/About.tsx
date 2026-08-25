import React from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, Truck, Users, Activity, Sparkles, Layers, CheckCircle2, Boxes, Receipt } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#FAFAFA] dark:bg-[#08090A] text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200">
      <Navbar />

      <main className="flex-1 pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-16">
        {/* Mission Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="emerald" dot className="uppercase font-mono text-xs">
            Platform Blueprint
          </Badge>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Transforming B2B Supply Chains & Procurement
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Flowza was engineered to replace manual telephone ordering, fragmented WhatsApp spreadsheets, and inventory mismatch with a real-time, high-precision trade network connecting retail vendors directly with wholesale distributors.
          </p>
        </div>

        {/* 4 Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="double-bezel">
            <div className="double-bezel-inner p-6 md:p-8 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                GSTIN Verified Trade Network
              </h3>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Every business profile includes validated 15-character GSTIN numbers, registered billing addresses, and verified trade role segregation to eliminate counterparty risk.
              </p>
            </div>
          </div>

          <div className="double-bezel">
            <div className="double-bezel-inner p-6 md:p-8 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Boxes size={20} />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Real-Time Inventory & Reservation
              </h3>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Stock is reserved atomically upon purchase order placement and settled upon fulfillment, preventing double-selling and out-of-stock reconciliation delays.
              </p>
            </div>
          </div>

          <div className="double-bezel">
            <div className="double-bezel-inner p-6 md:p-8 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
                <Receipt size={20} />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Automated Invoicing & ReportLab PDF
              </h3>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Instant tax calculation with exact Decimal precision, partial payment settlement tracking, and publication-grade binary PDF generation.
              </p>
            </div>
          </div>

          <div className="double-bezel">
            <div className="double-bezel-inner p-6 md:p-8 space-y-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Sparkles size={20} />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Agentic AI Business Assistant
              </h3>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Google Gemini multi-model fallback assistant executing database-backed analytical tools with zero hallucination and role-enforced tenant boundaries.
              </p>
            </div>
          </div>
        </div>

        {/* Technology Stack Matrix */}
        <div className="double-bezel">
          <div className="double-bezel-inner p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <div>
                <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                  Modern Production Technology Stack
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Engineered for maximum reliability, speed, and cloud deployment readiness
                </p>
              </div>
              <Badge variant="emerald" dot>ACTIVE 1.0.0</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                <p className="text-slate-500 text-[10px] uppercase">Frontend Client</p>
                <p className="font-bold text-slate-900 dark:text-white mt-1">React 19 + Vite 6</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                <p className="text-slate-500 text-[10px] uppercase">Backend API</p>
                <p className="font-bold text-slate-900 dark:text-white mt-1">FastAPI + Python 3.11</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                <p className="text-slate-500 text-[10px] uppercase">Database & ORM</p>
                <p className="font-bold text-slate-900 dark:text-white mt-1">PostgreSQL + Alembic</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                <p className="text-slate-500 text-[10px] uppercase">Real-Time Push</p>
                <p className="font-bold text-slate-900 dark:text-white mt-1">Native WebSockets</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
