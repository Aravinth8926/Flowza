import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Store,
  Truck,
  ShieldCheck,
  Receipt,
  Boxes,
  Clock,
  FileText,
  Sparkles,
  ChevronDown,
  Building2,
  Lock,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [activeSimStep, setActiveSimStep] = useState<number>(2);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const simulationSteps = [
    {
      id: 1,
      title: 'Order Placed',
      actor: 'Retailer (Fresh Mart)',
      action: 'Purchase order #FZ-2084 submitted for 20 bags Basmati Rice + 6 tins Sunflower Oil.',
      status: 'Pending Supplier Review',
      inventory: '100 On-Hand • 20 Requested',
    },
    {
      id: 2,
      title: 'Stock Reserved & Confirmed',
      actor: 'Wholesale Supplier (Apex FMCG)',
      action: 'Supplier reviews order, accepts line items, and system immediately locks 20 units in reserve.',
      status: 'Confirmed & Packed',
      inventory: '100 On-Hand • 20 Reserved • 80 Available',
    },
    {
      id: 3,
      title: 'In-Transit Dispatch',
      actor: 'Logistics Fleet',
      action: 'Carrier picks up package. Both retailer and supplier monitor real-time fulfillment status.',
      status: 'Out for Delivery',
      inventory: '100 On-Hand • 20 Reserved • 80 Available',
    },
    {
      id: 4,
      title: 'Delivery & GST Invoice Ready',
      actor: 'Retailer Receiving',
      action: 'Retailer confirms physical delivery. Stock settles to 80 units and GST tax invoice is generated.',
      status: 'Completed & Settled',
      inventory: '80 On-Hand • 0 Reserved • 80 Available',
    },
  ];

  const faqs = [
    {
      q: 'How does Flowza prevent suppliers from overselling stock?',
      a: 'The moment a wholesale supplier accepts an order, the required quantities are automatically locked in reserve. This prevents other retailers from ordering stock that is already committed.',
    },
    {
      q: 'Are the invoices valid for Indian GST filing?',
      a: 'Yes. Invoices include verified 15-character GSTIN numbers for both retailer and supplier, complete with accurate CGST, SGST, or IGST breakdowns, ready for one-click PDF download.',
    },
    {
      q: 'Can retailers order from multiple wholesale suppliers?',
      a: 'Yes. Retailers can connect with multiple verified distributors on Flowza, place separate purchase orders, and manage all tracking and invoices from a single dashboard.',
    },
    {
      q: 'How does the built-in AI Assistant help my business?',
      a: 'The AI assistant can instantly answer questions like "Which items are low in stock?", "Show me pending orders from Apex FMCG", or "List overdue invoices this month" without digging through spreadsheets.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F2] dark:bg-[#0D0E12] text-[#111216] dark:text-[#F8F8FA] selection:bg-amber-500/20 selection:text-amber-950 dark:selection:text-amber-200 font-sans">
      {/* Top Navigation */}
      <Navbar />

      {/* ========================================================= */}
      {/* 1. HERO SECTION — ASYMMETRICAL SPLIT SCREEN               */}
      {/* ========================================================= */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* LEFT 45%: Clean Business Narrative */}
          <div className="lg:col-span-5 space-y-6">
            {/* Small Eyebrow */}
            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">
              <span className="w-2 h-2 bg-amber-500 rounded-xs" />
              <span>For Retailers & Wholesale Suppliers</span>
            </div>

            {/* Clear Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[52px] font-black tracking-tight text-neutral-950 dark:text-white leading-[1.08]">
              One wholesale order. Both sides in sync.
            </h1>

            {/* Supporting Value Copy */}
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Flowza gives retailers and wholesale suppliers one shared workspace to place, confirm, and track purchase orders—with live inventory updates and GST-ready invoices.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3.5 rounded-lg text-sm font-semibold bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
              >
                <span>Get Started Free</span>
                <ArrowRight size={15} />
              </button>

              <a
                href="#how-it-works"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors"
              >
                <span>See how it works</span>
                <ArrowDown size={14} />
              </a>
            </div>

            {/* Proof Badges */}
            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                Live order updates
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                GST-ready invoices
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                Secure order records
              </span>
            </div>
          </div>

          {/* RIGHT 55%: Clean Shared Purchase Order Workspace Card */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-[#12141A] text-neutral-900 dark:text-neutral-100 shadow-xl overflow-hidden">
              {/* Workspace Card Header */}
              <div className="px-5 py-4 bg-neutral-50 dark:bg-[#161820] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-neutral-500 block font-semibold">
                    Purchase Order
                  </span>
                  <span className="text-sm font-mono font-bold text-neutral-900 dark:text-white">
                    #FZ-2084
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    CONFIRMED
                  </span>
                </div>
              </div>

              {/* Connecting Parties Bar */}
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-[#14161D]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="p-3 rounded-lg bg-white dark:bg-[#181A22] border border-neutral-200/80 dark:border-neutral-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Retailer (Buyer)
                    </span>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      Fresh Mart Supermarket
                    </p>
                    <p className="text-[11px] text-neutral-500">Coimbatore Central</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white dark:bg-[#181A22] border border-neutral-200/80 dark:border-neutral-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Wholesale Supplier
                    </span>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      Apex FMCG Wholesale
                    </p>
                    <p className="text-[11px] text-neutral-500">Tamil Nadu Hub</p>
                  </div>
                </div>
              </div>

              {/* Order Status Stepper */}
              <div className="px-5 py-3.5 bg-white dark:bg-[#12141A] border-b border-neutral-100 dark:border-neutral-800/80">
                <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} /> Placed
                  </span>
                  <span className="h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={13} /> Confirmed
                  </span>
                  <span className="h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
                  <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold">3</span>
                    Stock Reserved
                  </span>
                  <span className="h-px w-6 bg-neutral-200 dark:bg-neutral-800" />
                  <span className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
                    <span className="w-3.5 h-3.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px]">4</span>
                    Invoice Ready
                  </span>
                </div>
              </div>

              {/* Order Line Items Table */}
              <div className="p-5 space-y-4">
                <div className="rounded-lg border border-neutral-200/80 dark:border-neutral-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 dark:bg-[#161820] text-neutral-500 border-b border-neutral-200/80 dark:border-neutral-800">
                      <tr>
                        <th className="p-3 font-semibold">Product Name</th>
                        <th className="p-3 font-semibold">Quantity</th>
                        <th className="p-3 font-semibold text-right">Unit Price</th>
                        <th className="p-3 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                      <tr>
                        <td className="p-3 font-medium text-neutral-900 dark:text-white">
                          Organic Basmati Rice (25kg)
                        </td>
                        <td className="p-3 font-mono">20 bags</td>
                        <td className="p-3 text-right font-mono">₹200.00</td>
                        <td className="p-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                          ₹4,000.00
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium text-neutral-900 dark:text-white">
                          Refined Sunflower Oil (5L)
                        </td>
                        <td className="p-3 font-mono">6 tins</td>
                        <td className="p-3 text-right font-mono">₹150.00</td>
                        <td className="p-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                          ₹900.00
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Real-time Confirmation Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                      Inventory Status
                    </span>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Check size={14} className="text-amber-600 dark:text-amber-400" />
                      20 units locked in reserve
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                      GST Invoice
                    </span>
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                      GSTIN verified &amp; ready
                    </p>
                  </div>
                </div>

                {/* Total Line */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-neutral-900 text-white dark:bg-[#181A22] border border-neutral-800">
                  <span className="text-xs text-neutral-300">
                    Subtotal ₹4,900.00 + 5% GST (₹245.00)
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase block">Total Due</span>
                    <span className="text-base font-bold font-mono text-amber-400">₹5,145.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. BUILT FOR BOTH SIDES OF WHOLESALE                      */}
      {/* ========================================================= */}
      <section id="retailers" className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="mb-12 text-center max-w-3xl mx-auto space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">
            Two Sided Procurement
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white tracking-tight">
            Built for both sides of wholesale.
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Whether you run a supermarket chain or a high-volume warehouse, Flowza keeps your operations aligned.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: For Retailers */}
          <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                For Retailers
              </span>
              <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-2xl font-bold text-neutral-950 dark:text-white">
                Order with clarity.
              </h3>
              <p className="text-xs text-neutral-500">
                Stop guessing stock availability or losing track of WhatsApp orders.
              </p>
            </div>

            <ul className="space-y-3.5 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Send structured purchase orders in minutes</strong> — clean line items with pricing and delivery terms.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>See confirmed stock before you sell it</strong> — know exactly what is reserved and shipped.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Track every order in one place</strong> — live updates from supplier receipt to doorstep delivery.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Receive GST-ready invoices automatically</strong> — clean tax breakdowns with instant PDF downloads.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <span>Launch Retailer Workspace</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 2: For Wholesale Suppliers */}
          <div id="suppliers" className="p-8 rounded-xl border border-neutral-950/20 dark:border-amber-500/30 bg-neutral-50 dark:bg-[#151720] space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                For Wholesale Suppliers
              </span>
              <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-2xl font-bold text-neutral-950 dark:text-white">
                Fulfil with confidence.
              </h3>
              <p className="text-xs text-neutral-500">
                Eliminate unconfirmed orders, missed requests, and manual billing errors.
              </p>
            </div>

            <ul className="space-y-3.5 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Receive clean, complete purchase orders</strong> — verified buyer details, quantities, and GSTINs.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Confirm availability without phone calls</strong> — accept or adjust quantities with one click.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Reserve stock as orders are accepted</strong> — prevent duplicate sales across multiple buyers.</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Keep order records and invoices organised</strong> — permanent, searchable, auditable transaction records.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <span>Launch Supplier Workspace</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. HOW IT WORKS (3 SIMPLE STEPS)                          */}
      {/* ========================================================= */}
      <section id="how-it-works" className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="mb-12 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">
            Simple 3-Step Process
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white tracking-tight">
            From order to invoice, without the back-and-forth.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-4">
            <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 block">
              01 / PLACE
            </span>
            <h3 className="font-heading text-xl font-bold text-neutral-950 dark:text-white">
              Retailer places an order
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Select products from verified suppliers and send a structured, clean purchase order in minutes.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-4">
            <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 block">
              02 / CONFIRM
            </span>
            <h3 className="font-heading text-xl font-bold text-neutral-950 dark:text-white">
              Supplier confirms availability
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Review line items, confirm available stock, and lock inventory reservations immediately.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-4">
            <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400 block">
              03 / SYNC
            </span>
            <h3 className="font-heading text-xl font-bold text-neutral-950 dark:text-white">
              Both sides stay updated
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Track live shipment progress, maintain permanent digital records, and download GST-ready PDF invoices.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. INTERACTIVE ORDER SIMULATOR (TEST-DRIVE WORKFLOW)      */}
      {/* ========================================================= */}
      <section id="simulator" className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">
              Interactive Workflow
            </span>
            <h2 className="font-heading text-2xl sm:text-4xl font-extrabold text-neutral-950 dark:text-white tracking-tight">
              See the order lifecycle in action.
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-neutral-200/80 dark:bg-neutral-800 p-1 rounded-lg">
            {simulationSteps.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSimStep(s.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeSimStep === s.id
                    ? 'bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                Step 0{s.id}
              </button>
            ))}
          </div>
        </div>

        {/* Active Simulation Step View */}
        <div className="p-6 md:p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] shadow-sm">
          {simulationSteps
            .filter((s) => s.id === activeSimStep)
            .map((s) => (
              <div key={s.id} className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold flex items-center justify-center text-xs">
                      0{s.id}
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-neutral-950 dark:text-white">
                        {s.title}
                      </h3>
                      <span className="text-xs text-neutral-500">Active Role: {s.actor}</span>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded font-medium text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700">
                    Status: {s.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-3 text-sm text-neutral-700 dark:text-neutral-300">
                    <p className="leading-relaxed">{s.action}</p>
                    <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs">
                      <span className="text-neutral-500 block mb-0.5 uppercase font-mono text-[10px]">
                        Live Inventory Coordination
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-white font-mono">{s.inventory}</span>
                    </div>
                  </div>

                  <div className="p-5 rounded-lg bg-neutral-900 text-white dark:bg-[#161820] space-y-2 border border-neutral-800 text-xs">
                    <span className="text-amber-400 font-bold block mb-1 font-mono">
                      // ORDER AUDIT TRAIL
                    </span>
                    <p className="text-neutral-300">
                      Purchase Order #FZ-2084 updated to state '{s.status}'.
                    </p>
                    <p className="text-emerald-400 flex items-center gap-1.5">
                      <Check size={13} /> Shared record synced across Retailer and Supplier workspaces.
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. GST, TRUST & COMPLIANCE                                */}
      {/* ========================================================= */}
      <section id="trust" className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Receipt size={18} />
            </div>
            <h3 className="font-heading text-lg font-bold text-neutral-950 dark:text-white">
              GST-Compliant Invoicing
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Exact 2-decimal CGST, SGST, and IGST calculations with automated tax breakdown and instant PDF export.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Boxes size={18} />
            </div>
            <h3 className="font-heading text-lg font-bold text-neutral-950 dark:text-white">
              Zero Overselling
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Confirmed orders immediately reserve inventory in the warehouse, ensuring stock availability is always accurate.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <h3 className="font-heading text-lg font-bold text-neutral-950 dark:text-white">
              Verified Business Network
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Every retailer and supplier operates with verified credentials and company isolation for secure trade.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. FAQS                                                  */}
      {/* ========================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="mb-8 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 font-bold">
            Frequently Asked Questions
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-neutral-950 dark:text-white tracking-tight">
            Common questions about Flowza.
          </h2>
        </div>

        <div className="space-y-2.5 text-xs">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#12141A] overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
              >
                <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-neutral-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-amber-500' : ''
                  }`}
                />
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 text-neutral-600 dark:text-neutral-400 leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FINAL CALL TO ACTION                                   */}
      {/* ========================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-neutral-200 dark:border-neutral-800">
        <div className="rounded-2xl p-8 sm:p-12 bg-neutral-950 text-white dark:bg-[#14161F] border border-neutral-800 text-center space-y-6 max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to simplify wholesale ordering?
          </h2>
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Join verified retailers and wholesale suppliers coordinating purchase orders with live inventory and automated GST invoices.
          </p>
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3.5 rounded-lg text-sm font-semibold bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
            >
              <span>Launch Workspace</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

const ArrowDown = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);
