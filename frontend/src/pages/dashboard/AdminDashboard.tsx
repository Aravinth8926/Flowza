import React, { useState } from 'react';
import { PageWrapper } from '../../components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Progress } from '../../components/ui/Progress';
import { Input } from '../../components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../../components/ui/Table';
import { Users, Truck, Store, ShieldCheck, Database, Server, Search, Activity, Cpu, HardDrive } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'SYSTEM' | 'AUTH' | 'DB'>('ALL');

  const stats = [
    { label: 'Total Registered Users', value: 3, icon: <Users size={22} className="text-blue-500" /> },
    { label: 'Active Vendors', value: 2, icon: <Store size={22} className="text-indigo-500" /> },
    { label: 'Active Suppliers', value: 1, icon: <Truck size={22} className="text-emerald-500" /> },
  ];

  const systemHealth = [
    { name: 'FastAPI Backend Core', status: 'Healthy', load: 18, icon: <Server size={16} className="text-emerald-500" /> },
    { name: 'SQLite Database Session', status: 'Connected', load: 32, icon: <Database size={16} className="text-emerald-500" /> },
    { name: 'JWT Auth Security Subsystem', status: 'Active', load: 8, icon: <ShieldCheck size={16} className="text-emerald-500" /> },
  ];

  const userDirectory = [
    { name: 'Flowza Admin', email: 'admin@flowza.com', role: 'admin', status: 'Active' },
    { name: 'Test Vendor', email: 'testvendor@example.com', role: 'vendor', status: 'Active' },
    { name: 'New Supplier', email: 'user_1785320153@example.com', role: 'supplier', status: 'Active' },
  ];

  const filteredUsers = userDirectory.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const logs = [
    { type: 'SYSTEM', text: '[SYSTEM] Backend core running on port 8000 (0.4ms latency)', color: 'text-emerald-400' },
    { type: 'AUTH', text: '[AUTH] JWT secret validation operational - 0 active revocations', color: 'text-blue-400' },
    { type: 'DB', text: '[DB] Session pool initialised (Active connections: 4/20)', color: 'text-purple-400' },
    { type: 'SYSTEM', text: '[SYSTEM] Automated health check passed (100% uptime)', color: 'text-emerald-400' },
  ];

  const filteredLogs = logFilter === 'ALL' ? logs : logs.filter((l) => l.type === logFilter);

  return (
    <PageWrapper title="Flowza Platform Administration">
      <div className="space-y-8">
        {/* Stat Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <Card key={idx}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xxs font-semibold text-slate-500 dark:text-[#8896ab] uppercase tracking-wider">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-[#f1f5f9] mt-1">{stat.value}</h3>
                  <p className="text-xxs text-emerald-600 dark:text-[hsl(160_84%_65%)] font-medium mt-1 flex items-center gap-1">
                    <Activity size={12} /> Platform active
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-[#1c2740] flex items-center justify-center">
                  {stat.icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Col: User Directory */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="glass-card">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <div>
                  <CardTitle className="text-base font-bold">Platform User Directory</CardTitle>
                  <CardDescription className="text-xs">Registered system users and role permissions</CardDescription>
                </div>
                <div className="w-full sm:w-64 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 py-1.5 text-xs"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((usr, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold text-slate-900 dark:text-white">{usr.name}</TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 font-mono text-xs">{usr.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={usr.role === 'admin' ? 'destructive' : usr.role === 'vendor' ? 'primary' : 'success'}
                              className="text-xxs uppercase tracking-wider font-bold"
                            >
                              {usr.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-xxs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {usr.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                          No users found matching "{searchTerm}"
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Server Resource Metrics */}
            <Card className="glass-card">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Infrastructure Utilization</span>
                  <Cpu size={18} className="text-blue-500" />
                </CardTitle>
                <CardDescription className="text-xs">Live server CPU & memory load stats</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div>
                  <Progress label="CPU Core Utilization" value={24} variant="primary" showLabel animated />
                </div>
                <div>
                  <Progress label="RAM Memory Pool (4GB / 16GB)" value={38} variant="info" showLabel />
                </div>
                <div>
                  <Progress label="Database Storage Disk Usage" value={15} variant="success" showLabel />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Col: System Diagnostics */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="glass-card">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-bold">System Health & Services</CardTitle>
                <CardDescription className="text-xs">Real-time status of underlying infrastructure</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {systemHealth.map((sys, idx) => (
                  <div key={idx} className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {sys.icon}
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{sys.name}</span>
                      </div>
                      <Badge variant="success" className="text-xxs px-2 py-0.5">
                        {sys.status}
                      </Badge>
                    </div>
                    <Progress value={sys.load} variant="success" size="sm" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold">Real-time Event Logs</CardTitle>
                  <div className="flex gap-1 text-xxs font-bold">
                    {(['ALL', 'SYSTEM', 'AUTH', 'DB'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setLogFilter(cat)}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          logFilter === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xxs text-slate-400 font-mono space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 min-h-[160px]">
                {filteredLogs.map((log, idx) => (
                  <div key={idx} className={log.color}>
                    {log.text}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

