import React from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardContent } from '../../components/ui/Card';
import { ShieldCheck, Truck, Users, Activity } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <Navbar />

      <div className="pt-24 pb-12 flex-1">
        <PageWrapper title="About Flowza">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Mission Statement */}
            <div className="space-y-4 text-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-200">
                Transforming B2B Supply Chains & Procurement
              </h2>
              <p className="text-slate-650 dark:text-slate-350 leading-relaxed">
                Flowza was founded with the mission to solve the inefficiencies of manual supply chains.
                By connecting retail shops (Vendors) and product sellers (Suppliers) in a secure, digital portal,
                we bring transparency, automated logging, and trust to B2B procurement processes across India.
              </p>
            </div>

            {/* Core Values */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Verify & Comply</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      We support full business profile building, including state-by-state locations and GST verification, reducing trade risks.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Logistics Coordination</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      We organize dispatch locations, shipping/billing addresses, and provide structured communication pipelines for businesses.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Direct Network</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      No intermediaries. Vendors search for wholesalers or manufacturers in their own cities and transact directly.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Secure Foundation</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Built on a modern stack: React 19, FastAPI, PostgreSQL, and token-based JWT sessions, safeguarding critical records.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sprint Progress */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Roadmap — Sprint 1</h3>
              <p className="text-sm text-slate-600 dark:text-slate-350">
                Currently, we are in **Sprint 1: Project Foundation & Authentication**. During this phase, we have successfully implemented secure, role-based dashboards, the multi-step registration flow, and address management. 
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 rounded">React + Vite</span>
                <span className="bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 rounded">FastAPI Layered API</span>
                <span className="bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 rounded">PostgreSQL DB</span>
                <span className="bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 rounded">JWT Auth Flow</span>
              </div>
            </div>
          </div>
        </PageWrapper>
      </div>

      <Footer />
    </div>
  );
};
