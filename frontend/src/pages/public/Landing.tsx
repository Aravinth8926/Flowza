import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Accordion } from '../../components/ui/Accordion';
import {
  Building,
  Search,
  FileText,
  UserCheck,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  User,
  Plus,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const features = [
    {
      title: 'Company Profiles',
      desc: 'Create detailed business profiles with verified GST details, company descriptions, and office addresses.',
      icon: <Building className="h-6 w-6 text-primary" />,
    },
    {
      title: 'Product Catalog',
      desc: 'Browse and manage product catalogs from verified suppliers to compare and negotiate prices. (Future Feature)',
      icon: <Search className="h-6 w-6 text-primary" />,
      upcoming: true,
    },
    {
      title: 'Purchase Orders',
      desc: 'Create, dispatch, and track purchase orders with real-time status updates and delivery timelines. (Future Feature)',
      icon: <FileText className="h-6 w-6 text-primary" />,
      upcoming: true,
    },
    {
      title: 'Vendor-Supplier Matching',
      desc: 'Connect with verified business partners in your geographical region or specific product category. (Future Feature)',
      icon: <UserCheck className="h-6 w-6 text-primary" />,
      upcoming: true,
    },
    {
      title: 'Procurement Analytics',
      desc: 'Analyze procurement cycles, vendor performance, order frequencies, and spending trends. (Future Feature)',
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      upcoming: true,
    },
    {
      title: 'Secure & Compliant',
      desc: 'State-of-the-art authentication, strict role control, and database design ready for GST validation.',
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    },
  ];

  const steps = [
    {
      title: 'Register & Verify',
      desc: 'Sign up as a Vendor or Supplier, add your company profile details, and verify your business details.',
    },
    {
      title: 'Connect & Network',
      desc: 'Browse and find matching partners, view supplier business catalogs, and establish direct relationships.',
    },
    {
      title: 'Procure & Fulfill',
      desc: 'Negotiate orders, dispatch digital purchase orders, and coordinate transparent delivery cycles.',
    },
  ];

  const faqs = [
    {
      id: 'faq-1',
      title: 'What is Flowza?',
      content: 'Flowza is a modern, enterprise-grade B2B Supply Chain & Procurement Platform designed to connect retail vendors and wholesale suppliers directly, simplifying the order negotiation and fulfillment process.',
    },
    {
      id: 'faq-2',
      title: 'Who can use Flowza?',
      content: 'Flowza is designed for B2B transactions: Vendors (e.g. supermarkets, groceries, restaurants, pharmacies) who buy products, and Suppliers (distributors, manufacturers, wholesalers) who sell products.',
    },
    {
      id: 'faq-3',
      title: 'Is there a free plan available?',
      content: 'Yes! Flowza is free for small businesses during our early access release. Advanced integrations and analytical tools will be introduced under premium plans in future sprints.',
    },
    {
      id: 'faq-4',
      title: 'How do I verify my business on Flowza?',
      content: 'During registration, you provide your basic business details and optionally your 15-character GST number. Once submitted, our team reviews profiles to maintain a high trust quotient across the platform.',
    },
    {
      id: 'faq-5',
      title: 'What types of businesses can I find on Flowza?',
      content: 'You can discover verified regional distributors, direct-from-farm supply wholesalers, commercial packaging manufacturers, and retail shops of all types from major Indian states and districts.',
    },
    {
      id: 'faq-6',
      title: 'Is my procurement data secure on Flowza?',
      content: 'Absolutely. Security is our priority. We hash passwords using industry-standard bcrypt, use short-lived JWT authorization tokens in memory, and prevent SQL injection through parameters via SQLAlchemy ORM.',
    },
  ];

  const testimonials = [
    {
      name: 'Ramesh Kumar',
      company: 'Kumar Wholesale Groceries',
      avatar: 'RK',
      quote: 'Flowza helps us organize incoming retail requests effortlessly. We have completely replaced paper registers and phone orders.',
    },
    {
      name: 'Priya Sharma',
      company: 'Organic Life Supermarket',
      avatar: 'PS',
      quote: 'Verifying GST details of new suppliers is immediate. The transparency of the procurement cycle makes logistics planning simple.',
    },
    {
      name: 'Anil Gupta',
      company: 'Gupta Distributors & Sons',
      avatar: 'AG',
      quote: 'Managing product distributions across multiple local regions is much easier with a structured, online company profile.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text details */}
            <div className="text-left space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <span>Sprint 1 Live</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Streamline Your <span className="text-primary">Procurement</span>.
                <br />
                Simplify Your Supply Chain.
              </h1>
              <p className="text-lg text-slate-650 dark:text-slate-300 max-w-lg leading-relaxed">
                Flowza connects vendors and suppliers on one intelligent platform — making B2B procurement faster, transparent, and highly efficient.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2">
                    Get Started Free
                    <ArrowRight size={16} />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    See How It Works
                  </Button>
                </a>
              </div>
            </div>

            {/* Abstract Graphic */}
            <div className="relative flex justify-center">
              <div className="w-full max-w-lg aspect-square relative flex items-center justify-center">
                {/* Background circles */}
                <div className="absolute inset-0 rounded-full bg-primary/5 dark:bg-primary/10 blur-3xl animate-pulse" />
                <div className="w-80 h-80 rounded-full border border-dashed border-slate-350 dark:border-slate-800 flex items-center justify-center">
                  <div className="w-60 h-60 rounded-full border border-dashed border-slate-300 dark:border-slate-750 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full border border-primary/30 flex items-center justify-center bg-white dark:bg-slate-900 shadow-xl">
                      <Building className="h-16 w-16 text-primary" />
                    </div>
                  </div>
                </div>
                {/* floating elements */}
                <div className="absolute top-10 right-10 p-3 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-semibold">GST Verified</span>
                </div>
                <div className="absolute bottom-10 left-10 p-3 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold">Verified Suppliers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Features Built for Business Growth
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Discover how Flowza simplifies day-to-day B2B transactions and streamlines partnerships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="relative p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl transition-all-300 hover:shadow-md hover:-translate-y-1"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-5">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feat.title}
                </h3>
                <p className="text-sm text-slate-550 dark:text-slate-400 leading-relaxed">
                  {feat.desc}
                </p>
                {feat.upcoming && (
                  <span className="absolute top-4 right-4 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded text-xxs font-medium uppercase tracking-wider">
                    Upcoming
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Flowza Works */}
      <section id="how-it-works" className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              How Flowza Works
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              A clear, 3-step pipeline to transform your supply procurement.
            </p>
          </div>

          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 hidden lg:block" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
              {steps.map((step, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-primary text-white font-bold flex items-center justify-center mx-auto text-lg shadow-md">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {/* For Vendors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">For Vendors</span>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                Source products from verified suppliers, negotiate pricing, and grow.
              </h2>
              <p className="text-slate-650 dark:text-slate-450 leading-relaxed text-sm">
                Get access to commercial wholesale suppliers. Manage your profile, inspect addresses, verify GST compliance details, and keep track of all partner relations from a single, fast portal.
              </p>
              <div className="flex gap-4">
                <Link to="/register">
                  <Button>Register as Vendor</Button>
                </Link>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-20 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary">GST Ready</div>
                  <div className="h-20 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary">1-Click PO</div>
                  <div className="h-20 bg-primary/10 rounded-lg flex items-center justify-center font-bold text-primary">Fast Dispatch</div>
                </div>
              </div>
            </div>
          </div>

          {/* For Suppliers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
            <div className="lg:order-2 space-y-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">For Suppliers</span>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                Reach more business customers and track catalog distributions.
              </h2>
              <p className="text-slate-650 dark:text-slate-450 leading-relaxed text-sm">
                Broaden your wholesale distribution network. Register your business listing with details, highlight state/city delivery points, and manage orders with verified B2B vendors instantly.
              </p>
              <div className="flex gap-4">
                <Link to="/register">
                  <Button className="bg-emerald-500 hover:bg-emerald-650 focus:ring-emerald-500">Register as Supplier</Button>
                </Link>
              </div>
            </div>
            <div className="lg:order-1 bg-slate-50 dark:bg-slate-950 p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-3/4" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-2/3" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-emerald-500/10 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-emerald-500">100%</span>
                    <span className="text-xxs text-slate-500 uppercase font-medium">B2B Compliance</span>
                  </div>
                  <div className="h-24 bg-emerald-500/10 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-emerald-500">0%</span>
                    <span className="text-xxs text-slate-500 uppercase font-medium">Retail Noise</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 border-t border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Trusted by Businesses Across India
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              See how other procurement teams are digitizing their procurement pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((test, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <p className="text-sm italic text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                  "{test.quote}"
                </p>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                    {test.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {test.name}
                    </h4>
                    <p className="text-xxs text-slate-550 dark:text-slate-400">
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
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-550 dark:text-slate-405">
              Clear answers to common questions about Flowza.
            </p>
          </div>

          <Accordion items={faqs} />
        </div>
      </section>

      <Footer />
    </div>
  );
};
