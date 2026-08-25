import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Accordion } from '../../components/ui/Accordion';
import { Badge } from '../../components/ui/Badge';
import {
  Building,
  Search,
  FileText,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Zap,
  CheckCircle2,
  PackageCheck,
  Clock,
  Sparkles,
  Layers,
  Activity,
  ChevronRight,
  Store,
  Truck,
  Cpu,
  Receipt,
  Boxes,
  Lock,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<'vendor' | 'supplier' | 'admin'>('vendor');
  const [simStep, setSimStep] = useState<number>(1);

  const features = [
    {
      title: 'Verified Trade Directory',
      desc: 'Connect directly with wholesale distributors with verified 15-character GSTIN profiles and regional logistics parameters.',
      icon: <Building className="h-5 w-5 text-emerald-500" />,
      tag: 'GST VERIFIED',
      span: 'col-span-1 md:col-span-2 lg:col-span-2',
    },
    {
      title: 'Zero-Latency Catalog Sync',
      desc: 'Real-time inventory levels, tiered quantity pricing, and SKU reservations updated in milliseconds.',
      icon: <Boxes className="h-5 w-5 text-emerald-500" />,
      tag: 'LIVE INVENTORY',
      span: 'col-span-1 md:col-span-1 lg:col-span-1',
    },
    {
      title: 'Native WebSocket Push Engine',
      desc: 'Instant dispatch alerts, order status transitions, and multi-tenant live push events.',
      icon: <Zap className="h-5 w-5 text-indigo-500" />,
      tag: 'WSS REAL-TIME',
      span: 'col-span-1 md:col-span-1 lg:col-span-1',
    },
    {
      title: 'Multi-Model Agentic AI Assistant',
      desc: 'Ask operational questions about low stock, revenue, or pending purchase orders with zero hallucination and live tool execution telemetry.',
      icon: <Sparkles className="h-5 w-5 text-emerald-500" />,
      tag: 'GEMINI 3.6 / 3.5 AI',
      span: 'col-span-1 md:col-span-2 lg:col-span-2',
    },
    {
      title: 'Automated Invoices & PDF Engine',
      desc: 'High-precision GST tax computations, partial payment settlement tracking, and ReportLab PDF downloads.',
      icon: <Receipt className="h-5 w-5 text-sky-500" />,
      tag: 'FINANCIAL INTEGRITY',
      span: 'col-span-1 md:col-span-2 lg:col-span-2',
    },
    {
      title: 'Enterprise Security & RBAC',
      desc: 'OAuth2 JWT tokens, BCrypt password hashing, parameter-bound ORM queries, and immutable status audit trails.',
      icon: <Lock className="h-5 w-5 text-emerald-500" />,
      tag: 'SOC-2 READY',
      span: 'col-span-1 md:col-span-1 lg:col-span-1',
    },
  ];

  const metrics = [
    { label: 'Fulfillment Accuracy', value: '99.98%' },
    { label: 'WebSocket Push Latency', value: '< 180ms' },
    { label: 'Verified Trade Partners', value: '12,500+' },
    { label: 'Monthly Logistics Volume', value: '₹180Cr+' },
  ];

  const faqs = [
    {
      id: 'faq-1',
      title: 'What is Flowza and who is it built for?',
      content: 'Flowza is a high-precision B2B Supply Chain & Procurement Network designed to connect retail vendors directly with wholesale suppliers, eliminating manual paperwork, telephone ordering delays, and inventory mismatch.',
    },
    {
      id: 'faq-2',
      title: 'How does real-time WebSocket order dispatch work?',
      content: 'When a vendor places an order, Flowza’s native WebSocket engine instantly pushes a high-priority payload to the supplier’s dashboard. Suppliers accept, adjust quantities, and dispatch with instant live client updates.',
    },
    {
      id: 'faq-3',
      title: 'Is Flowza GST-compliant?',
      content: 'Yes. Every company profile on Flowza includes validated 15-character GSTIN fields, verified billing addresses, and tax-accurate GST invoices with ReportLab PDF export.',
    },
    {
      id: 'faq-4',
      title: 'How does the Flowza AI Business Assistant work?',
      content: 'Flowza integrates an Agentic AI Assistant powered by Google Gemini with multi-model fallback. The assistant runs database-backed tools to retrieve live inventory, sales, and invoice data with zero hallucinations.',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] dark:bg-[#08090A] text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-200">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-44 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle Ambient Background Grids */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Precision B2B Supply Chain Network</span>
          </div>

          {/* Massive Display Heading */}
          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08]">
            Wholesale Procurement, <br className="hidden sm:inline" />
            <span className="text-emerald-600 dark:text-emerald-400">Zero Latency.</span>
          </h1>

          {/* High-Contrast Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Connect verified retail vendors directly with wholesale suppliers. Live inventory sync, automated purchase orders, and AI-powered operations.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Button
              size="lg"
              variant="primary"
              trailingIcon={<ArrowRight size={16} />}
              iconCircle={true}
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto text-base font-semibold"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto text-base"
            >
              Launch Live Demo
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>GSTIN Verified Trade</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Zap size={14} className="text-indigo-500" />
              <span>Instant WebSocket Push</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-500" />
              <span>Agentic AI Copilot</span>
            </span>
          </div>
        </div>

        {/* Live Interactive Supply Chain Simulator */}
        <div id="simulator" className="mt-16 md:mt-24">
          <div className="double-bezel max-w-5xl mx-auto">
            <div className="double-bezel-inner p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <h2 className="font-heading text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                      Live Trade Lifecycle Simulator
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Experience how a single purchase order flows seamlessly between Vendor and Supplier in real time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((step) => (
                    <button
                      key={step}
                      onClick={() => setSimStep(step)}
                      className={`h-8 px-3 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        simStep === step
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      Step 0{step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulator Stage Content */}
              <div className="py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Vendor Side */}
                <div className={`p-5 rounded-2xl border transition-all ${simStep >= 1 ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-semibold uppercase text-emerald-600 dark:text-emerald-400">1. Retail Vendor</span>
                    <Store size={18} className="text-slate-600 dark:text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Fresh Mart Supermarket</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">PO: ORD-2026-893B19</p>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between text-xs font-mono">
                    <span>Items: 40 Bags Rice</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹4,800.00</span>
                  </div>
                </div>

                {/* WebSocket Push Stream */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mx-auto">
                    <Zap size={20} className={simStep === 2 ? 'animate-bounce' : ''} />
                  </div>
                  <p className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {simStep === 1 && '1. Vendor places order in live cart'}
                    {simStep === 2 && '2. WebSocket pushes alert to Supplier (<180ms)'}
                    {simStep === 3 && '3. Supplier accepts & reserves stock'}
                    {simStep === 4 && '4. Order fulfilled & Invoice PDF ready'}
                  </p>
                  <span className="inline-block text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    State: <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">{simStep === 1 ? 'Pending' : simStep === 2 ? 'Dispatched' : simStep === 3 ? 'Accepted' : 'Completed'}</span>
                  </span>
                </div>

                {/* Supplier Side */}
                <div className={`p-5 rounded-2xl border transition-all ${simStep >= 3 ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-semibold uppercase text-emerald-600 dark:text-emerald-400">2. Wholesale Supplier</span>
                    <Truck size={18} className="text-slate-600 dark:text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Apex FMCG Wholesale Ltd</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">GSTIN: 33AABCU9603R1ZM</p>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between text-xs font-mono">
                    <span>Stock: -40 Units</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Auto-Sync OK</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Step {simStep} of 4</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSimStep(simStep < 4 ? simStep + 1 : 1)}
                >
                  {simStep < 4 ? 'Next Step →' : 'Replay Simulation ↺'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className="py-12 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-100/60 dark:bg-[#0A0C10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {metrics.map((m, idx) => (
              <div key={idx} className="space-y-1">
                <p className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white font-mono-num">
                  {m.value}
                </p>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Asymmetrical Bento Grid: Core Platform Features */}
      <section id="features" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-4 max-w-2xl mb-12 md:mb-16">
          <Badge variant="emerald" dot className="uppercase font-mono text-xs">
            Architecture Matrix
          </Badge>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Engineered for High-Frequency Trade.
          </h2>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
            Every feature in Flowza is purpose-built to eliminate reconciliation friction, reduce stockouts, and automate procurement workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {features.map((f, idx) => (
            <div key={idx} className={`double-bezel ${f.span}`}>
              <div className="double-bezel-inner p-6 md:p-8 h-full flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/80 dark:border-slate-700/80">
                      {f.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
                      {f.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-heading text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                      {f.title}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono text-emerald-600 dark:text-emerald-400">
                  <span>Engine Active</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Role-Based Interactive Preview Strip */}
      <section className="py-16 md:py-24 bg-slate-100/50 dark:bg-[#0B0D12] border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
              Tailored Dashboards for Every Stakeholder
            </h2>
            <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveRole('vendor')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeRole === 'vendor'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Retail Vendor
              </button>
              <button
                onClick={() => setActiveRole('supplier')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeRole === 'supplier'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Wholesale Supplier
              </button>
              <button
                onClick={() => setActiveRole('admin')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeRole === 'admin'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Platform Admin
              </button>
            </div>
          </div>

          <div className="double-bezel max-w-4xl mx-auto">
            <div className="double-bezel-inner p-6 md:p-8">
              {activeRole === 'vendor' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="indigo" dot>VENDOR PROCUREMENT WORKSPACE</Badge>
                    <span className="text-xs font-mono text-slate-500">Cart • Direct POs • Tax Invoices</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                    Build Multi-Supplier Orders and Track Live Deliveries
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Vendors can browse verified supplier catalogs, add items to supplier-isolated carts, submit structured purchase orders, and monitor real-time fulfillment status.
                  </p>
                </div>
              )}

              {activeRole === 'supplier' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="emerald" dot>SUPPLIER FULFILLMENT DESK</Badge>
                    <span className="text-xs font-mono text-slate-500">Live Queue • Stock Sync • PDF Generator</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                    Accept Instant Orders, Manage Inventory & Issue Invoices
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Suppliers receive push notifications via WebSockets, accept or adjust quantities, maintain stock levels with reorder thresholds, and generate tax-compliant PDF invoices.
                  </p>
                </div>
              )}

              {activeRole === 'admin' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="destructive" dot>ENTERPRISE OVERSIGHT CONSOLE</Badge>
                    <span className="text-xs font-mono text-slate-500">Platform Analytics • System Audit</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                    System-Wide Financial Health & Trade Volume Metrics
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    Platform administrators monitor active organizations, total platform GMV, payment settlement velocities, and operational compliance audit trails across the entire network.
                  </p>
                </div>
              )}

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                <Button size="sm" variant="primary" trailingIcon={<ArrowRight size={14} />} onClick={() => navigate('/login')}>
                  Open {activeRole.toUpperCase()} Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="neutral" className="uppercase font-mono text-xs">Knowledge Base</Badge>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion items={faqs} />
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24">
        <div className="double-bezel">
          <div className="double-bezel-inner p-8 md:p-16 text-center space-y-6 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
            <h2 className="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight">
              Ready to Upgrade Your Supply Chain?
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-normal">
              Join thousands of verified vendors and wholesale suppliers on Flowza’s high-precision B2B trade network.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Button
                size="lg"
                variant="primary"
                trailingIcon={<ArrowRight size={16} />}
                iconCircle={true}
                onClick={() => navigate('/register')}
              >
                Create Account Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/login')}
                className="text-white border-white/20 hover:bg-white/10"
              >
                Explore Live Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};
