import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Accordion } from '../../components/ui/Accordion';
import { Badge } from '../../components/ui/Badge';
import {
  Building,
  Search,
  FileText,
  UserCheck,
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
} from 'lucide-react';

export const Landing: React.FC = () => {
  const [activeRole, setActiveRole] = useState<'vendor' | 'supplier' | 'admin'>('vendor');
  const [simStep, setSimStep] = useState<number>(1);

  const features = [
    {
      title: 'Verified Business Directory',
      desc: 'Connect with verified B2B vendors and wholesale distributors with validated GSTIN profiles and regional logistics parameters.',
      icon: <Building className="h-6 w-6 text-emerald-500" />,
      tag: 'ACTIVE PLATFORM',
    },
    {
      title: 'Zero-Latency Product Catalog',
      desc: 'Explore real-time wholesale product pricing, tiered quantity discounts, live stock indicators, and SKU categorizations.',
      icon: <Search className="h-6 w-6 text-emerald-500" />,
      tag: 'INSTANT SYNC',
    },
    {
      title: 'Automated Purchase Orders',
      desc: 'Dispatch structured purchase order requests instantly with line-item totals, delivery scheduling, and priority tagging.',
      icon: <FileText className="h-6 w-6 text-emerald-500" />,
      tag: 'PRECISION LOGISTICS',
    },
    {
      title: 'Real-Time WebSocket Engine',
      desc: 'Receive push notifications the instant suppliers review, modify quantities, accept, or dispatch pending orders.',
      icon: <Zap className="h-6 w-6 text-indigo-500" />,
      tag: 'LIVE STREAM',
    },
    {
      title: 'Supply Chain Analytics',
      desc: 'Track procurement velocity, spending trends, regional demand forecasts, and order fulfillment SLA metrics.',
      icon: <TrendingUp className="h-6 w-6 text-cyan-500" />,
      tag: 'INTELLIGENT INSIGHTS',
    },
    {
      title: 'Enterprise Security & Compliance',
      desc: 'OAuth2 JWT token authentication, BCrypt password encryption, role-based access control, and full audit logging.',
      icon: <ShieldCheck className="h-6 w-6 text-emerald-500" />,
      tag: 'GST COMPLIANT',
    },
  ];

  const steps = [
    {
      title: 'Configure Organization Profile',
      desc: 'Register as a Vendor or Wholesale Supplier, setup company credentials, and link verified GSTIN parameters.',
    },
    {
      title: 'Stage Products or Browse Catalogs',
      desc: 'Suppliers list real-time inventory and pricing; vendors build multi-item procurement orders in the live cart.',
    },
    {
      title: 'Instant Order Fulfillment',
      desc: 'Suppliers receive push alerts, accept requests, schedule dispatches, and trigger real-time inventory sync.',
    },
  ];

  const metrics = [
    { label: 'Fulfillment Accuracy', value: '99.98%' },
    { label: 'Order Processing Speed', value: '< 2.4s' },
    { label: 'Verified Trade Partners', value: '12,500+' },
    { label: 'Monthly Logistics Volume', value: '₹180Cr+' },
  ];

  const faqs = [
    {
      id: 'faq-1',
      title: 'What is Flowza?',
      content: 'Flowza is an enterprise-grade B2B Supply Chain & Procurement Network designed to connect retail vendors directly with wholesale suppliers, eliminating manual paperwork, phone call delays, and inventory mismatch.',
    },
    {
      id: 'faq-2',
      title: 'How does real-time order dispatch work?',
      content: 'When a vendor submits a Purchase Order Request, Flowza’s WebSocket engine immediately pushes a high-priority payload to the supplier’s dashboard. Suppliers can accept, adjust quantities, or dispatch orders with instant feedback.',
    },
    {
      id: 'faq-3',
      title: 'Is Flowza GST-compliant?',
      content: 'Yes. Every company profile on Flowza includes validated 15-character GSTIN fields, verified business billing addresses, and tax-ready order breakdown statements.',
    },
    {
      id: 'faq-4',
      title: 'What security standards does Flowza enforce?',
      content: 'We use OAuth2 Bearer Tokens (JWT) for session control, BCrypt password hashing, parameter-bound ORM queries against SQL injection, and strict Role-Based Access Control (RBAC).',
    },
  ];

  const testimonials = [
    {
      name: 'Rajesh Malhotra',
      company: 'Malhotra Mega Wholesalers',
      avatar: 'RM',
      quote: 'Flowza has completely eliminated order ambiguity. We receive instant order requests with itemized quantities directly in our incoming order desk.',
    },
    {
      name: 'Kavita Reddy',
      company: 'FreshMart Supermarkets',
      avatar: 'KR',
      quote: 'The speed of placing procurement requests from supplier catalogs is phenomenal. We get real-time status notifications as soon as orders are accepted.',
    },
    {
      name: 'Suresh Patel',
      company: 'Patel Agriculture & Foodtech',
      avatar: 'SP',
      quote: 'The modern interface and instant stock updates have allowed us to scale distribution to over 40 regional vendors without hiring extra admin staff.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200 overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent">
        {/* Ambient Grid Overlay */}
        <div className="absolute inset-0 mesh-grid-bg [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center"
          >
            {/* Hero Left Content */}
            <motion.div variants={itemVariants} className="lg:col-span-7 text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold glass-panel border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <Sparkles size={14} className="text-emerald-500 animate-pulse" />
                <span className="font-mono tracking-tight font-bold">NEXT-GEN B2B LOGISTICS PLATFORM</span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Precision B2B Supply Chain & <span className="shimmer-text">Automated Procurement.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Connect enterprise vendors directly with wholesale suppliers. Zero manual friction, real-time inventory synchronization, and verified GST trade logistics.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/register">
                  <Button variant="primary" size="xl" glow className="w-full sm:w-auto font-heading">
                    Start Platform Setup Free
                    <ArrowRight size={18} />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="glass" size="xl" className="w-full sm:w-auto font-heading">
                    Explore Logistics Engine
                  </Button>
                </a>
              </div>

              {/* Interactive Role Switcher Bar */}
              <div className="pt-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading mb-3">Live Interactive Platform Simulation</p>
                <div className="inline-flex p-1.5 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 gap-1">
                  <button
                    onClick={() => setActiveRole('vendor')}
                    className={`relative px-4 py-2 rounded-xl text-xs font-semibold font-heading transition-colors cursor-pointer ${
                      activeRole === 'vendor' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {activeRole === 'vendor' && (
                      <motion.div
                        layoutId="activeRoleTab"
                        className="absolute inset-0 bg-emerald-600 rounded-xl shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Store size={14} /> Vendor View
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveRole('supplier')}
                    className={`relative px-4 py-2 rounded-xl text-xs font-semibold font-heading transition-colors cursor-pointer ${
                      activeRole === 'supplier' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {activeRole === 'supplier' && (
                      <motion.div
                        layoutId="activeRoleTab"
                        className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Truck size={14} /> Wholesale Supplier View
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveRole('admin')}
                    className={`relative px-4 py-2 rounded-xl text-xs font-semibold font-heading transition-colors cursor-pointer ${
                      activeRole === 'admin' ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {activeRole === 'admin' && (
                      <motion.div
                        layoutId="activeRoleTab"
                        className="absolute inset-0 bg-slate-800 rounded-xl shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Cpu size={14} /> System Engine Telemetry
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Interactive Morphing Hero Preview Card */}
            <motion.div variants={itemVariants} className="lg:col-span-5 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRole}
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="relative mx-auto max-w-md glass-panel rounded-3xl p-6 shadow-2xl border border-white/20 dark:border-white/10 glow-emerald"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    </div>
                    <Badge variant={activeRole === 'vendor' ? 'emerald' : activeRole === 'supplier' ? 'indigo' : 'cyan'} ping>
                      {activeRole === 'vendor' ? 'VENDOR DASHBOARD' : activeRole === 'supplier' ? 'SUPPLIER DESK' : 'ADMIN ENGINE'}
                    </Badge>
                  </div>

                  {/* Simulated Content based on activeRole */}
                  {activeRole === 'vendor' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400">PO #FLW-9482</span>
                          <Badge variant="emerald" dot>SUBMITTED</Badge>
                        </div>
                        <div>
                          <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                            25x Organic Rice (25kg Bags)
                          </h4>
                          <p className="text-xs text-slate-500 font-mono">Target Supplier: GreenEarth Wholesale</p>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400">Order Budget</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹18,500.00</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSimStep((prev) => (prev % 3) + 1)}
                        className="w-full text-xs font-heading font-semibold"
                      >
                        Simulate Next Pipeline Stage (Step {simStep}/3)
                      </Button>
                    </div>
                  )}

                  {activeRole === 'supplier' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                        <div className="flex items-center justify-between text-xs font-mono text-indigo-400 font-bold">
                          <span>INCOMING PO REQUEST</span>
                          <Badge variant="indigo" ping>NEW ALERT</Badge>
                        </div>
                        <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                          FreshMart Supermarkets (Order #PO-8821)
                        </h4>
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>Items: 50x Sunflower Oil 5L</span>
                          <span className="font-bold text-indigo-400">₹24,000</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="primary" className="w-full text-xs">Accept PO</Button>
                          <Button size="sm" variant="outline" className="w-full text-xs">Review</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeRole === 'admin' && (
                    <div className="space-y-4 font-mono text-xs">
                      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>SYSTEM STATUS</span>
                          <span>100% OPERATIONAL</span>
                        </div>
                        <div className="space-y-1 text-slate-400 text-[11px]">
                          <p>• FastAPI Core latency: 0.4ms</p>
                          <p>• WebSocket Clients: 1,420 connected</p>
                          <p>• GST Verification Engine: Active</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="py-12 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {metrics.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="space-y-1"
              >
                <div className="text-3xl lg:text-4xl font-extrabold font-mono shimmer-text">
                  {m.value}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-heading">
                  {m.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="features" className="py-24 relative bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <Badge variant="indigo" className="uppercase">Platform Architecture</Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for Enterprise Supply Chains
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Everything required to modernize wholesale ordering, eliminate inventory leaks, and ensure trade compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                viewport={{ once: true }}
                className="glass-card p-6 rounded-2xl flex flex-col justify-between spotlight-card cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 group-hover:scale-110 transition-transform">
                      {feat.icon}
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* How Flowza Works */}
      <section id="how-it-works" className="py-24 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <Badge variant="cyan" className="uppercase">Logistics Pipeline</Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Zero-Friction 3-Step Operations
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Transform legacy manual registers into a high-speed digital procurement cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="glass-card p-8 rounded-2xl relative text-left space-y-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white font-extrabold font-mono flex items-center justify-center text-base shadow-md">
                  0{idx + 1}
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <Badge variant="emerald" className="uppercase">Customer Endorsements</Badge>
            <h2 className="font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
              Trusted by Leading Supply Networks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test, idx) => (
              <div
                key={idx}
                className="glass-card p-6 rounded-2xl flex flex-col justify-between"
              >
                <p className="text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-sans">
                  "{test.quote}"
                </p>
                <div className="flex items-center space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs font-mono border border-emerald-500/20">
                    {test.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white font-heading">
                      {test.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {test.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="font-heading text-3xl font-extrabold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear technical answers regarding Flowza’s architecture and deployment options.
            </p>
          </div>

          <Accordion items={faqs} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

