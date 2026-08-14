import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { Button } from '../../components/ui/Button';
import { FormInput, FormSelect, FormTextarea } from '../../components/forms/FormComponents';
import { RadioGroup } from '../../components/ui/RadioGroup';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { MultiStepForm } from '../../components/forms/MultiStepForm';
import { toast } from 'sonner';
import { ArrowLeft, User, Building, MapPin, Key, Sun, Moon, Store, Truck } from 'lucide-react';

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const registerSchema = z.object({
  // Step 1: Role
  role_name: z.enum(['vendor', 'supplier'], { errorMap: () => ({ message: 'Role is required' }) }),

  // Step 2: Personal Info
  full_name: z.string().min(2, 'Full Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[a-z]/, 'Must include at least one lowercase letter')
    .regex(/[0-9]/, 'Must include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must include at least one special character'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),

  // Step 3: Business Details
  company_name: z.string().min(1, 'Company Name is required'),
  business_type: z.string().min(1, 'Business Type is required'),
  gst_number: z.string().regex(gstRegex, 'Invalid GST number format (15 characters)').optional().or(z.literal('')),
  description: z.string().max(500, 'Max 500 characters').optional(),

  // Step 4: Location Address
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  address_line: z.string().min(5, 'Address must be at least 5 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const COUNTRIES = [
  { value: '', label: 'Select Country' },
  { value: 'India', label: 'India' },
  { value: 'United States', label: 'United States' },
];

const STATES: Record<string, { value: string; label: string }[]> = {
  India: [
    { value: '', label: 'Select State' },
    { value: 'Karnataka', label: 'Karnataka' },
    { value: 'Maharashtra', label: 'Maharashtra' },
    { value: 'Tamil Nadu', label: 'Tamil Nadu' },
    { value: 'Delhi', label: 'Delhi' },
    { value: 'Telangana', label: 'Telangana' },
  ],
  'United States': [
    { value: '', label: 'Select State' },
    { value: 'California', label: 'California' },
    { value: 'New York', label: 'New York' },
    { value: 'Texas', label: 'Texas' },
    { value: 'Washington', label: 'Washington' },
  ],
};

const VENDOR_TYPES = [
  { value: '', label: 'Select Business Type' },
  { value: 'Supermarket', label: 'Supermarket' },
  { value: 'Grocery Store', label: 'Grocery Store' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Hotel', label: 'Hotel' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Retail Shop', label: 'Retail Shop' },
];

const SUPPLIER_TYPES = [
  { value: '', label: 'Select Business Type' },
  { value: 'Distributor', label: 'Distributor' },
  { value: 'Manufacturer', label: 'Manufacturer' },
  { value: 'Wholesaler', label: 'Wholesaler' },
];

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      role_name: 'vendor',
      full_name: '',
      email: '',
      password: '',
      phone: '',
      company_name: '',
      business_type: '',
      gst_number: '',
      description: '',
      country: '',
      state: '',
      city: '',
      address_line: '',
    },
  });

  const selectedRole = methods.watch('role_name');
  const selectedCountry = methods.watch('country');

  useEffect(() => {
    methods.setValue('business_type', '');
  }, [selectedRole, methods]);

  const stepsList = [
    { title: 'Account Role', description: 'Vendor or Supplier' },
    { title: 'Personal Info', description: 'Contact details' },
    { title: 'Business Details', description: 'Company settings' },
    { title: 'Location Address', description: 'Address' },
  ];

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegisterFormValues)[] = [];
    if (step === 0) {
      fieldsToValidate = ['role_name'];
    } else if (step === 1) {
      fieldsToValidate = ['full_name', 'email', 'password', 'phone'];
    } else if (step === 2) {
      fieldsToValidate = ['company_name', 'business_type', 'gst_number', 'description'];
    }

    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      await registerUser({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role_name: values.role_name,
        company_name: values.company_name,
        business_type: values.business_type,
        gst_number: values.gst_number || undefined,
        description: values.description || undefined,
        country: values.country,
        state: values.state,
        city: values.city,
        address_line: values.address_line,
        address_type: 'billing',
      });

      toast.success('Registration successful! Welcome to Flowza.');
      navigate(`/dashboard/${values.role_name}`);
    } catch (error: any) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Registration failed. Please verify your details.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation top bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-2xl space-y-6 relative z-10 pt-8">
        <Card className="glass-card shadow-2xl border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-3 pt-8 pb-4">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30">
              F
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Create Your Flowza Account
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Join verified B2B vendors & suppliers on the modern procurement network
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-8 px-6 sm:px-8">
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
                <MultiStepForm steps={stepsList} currentStep={step}>
                  {/* Step 1: Account Role Selection Upfront */}
                  {step === 0 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                        <Key size={18} />
                        <span className="font-bold text-sm">Step 1: Choose Account Role</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div
                          onClick={() => methods.setValue('role_name', 'vendor')}
                          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            selectedRole === 'vendor'
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                            <Store size={22} />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Vendor (Purchaser)</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Buy wholesale goods for retail stores, supermarkets, grocery shops, hotels, & restaurants.
                          </p>
                        </div>

                        <div
                          onClick={() => methods.setValue('role_name', 'supplier')}
                          className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                            selectedRole === 'supplier'
                              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                            <Truck size={22} />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Supplier (Distributor)</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Supply bulk inventory to retail networks as a manufacturer, wholesaler, or distributor.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Personal Info */}
                  {step === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                        <User size={18} />
                        <span className="font-bold text-sm">Step 2: Contact Details</span>
                      </div>
                      <FormInput name="full_name" label="Full Name" placeholder="e.g. Rahul Sharma" />
                      <FormInput name="email" type="email" label="Email Address" placeholder="rahul@company.com" />
                      <FormInput name="phone" label="Phone Number" placeholder="9876543210" />
                      <FormInput
                        name="password"
                        type="password"
                        label="Password"
                        placeholder="••••••••"
                        helperText="Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special symbol"
                      />
                    </div>
                  )}

                  {/* Step 3: Business Info */}
                  {step === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                        <Building size={18} />
                        <span className="font-bold text-sm">
                          Step 3: {selectedRole === 'vendor' ? 'Retail Business Info' : 'Wholesale Supplier Details'}
                        </span>
                      </div>
                      <FormInput name="company_name" label="Company / Business Name" placeholder="e.g. Acme Wholesale Solutions" />

                      <FormSelect
                        name="business_type"
                        label="Business Type"
                        options={selectedRole === 'vendor' ? VENDOR_TYPES : SUPPLIER_TYPES}
                      />

                      <FormInput name="gst_number" label="GST Number (Optional)" placeholder="e.g. 22AAAAA1111A1Z1" />
                      <FormTextarea
                        name="description"
                        label="Business Overview (Optional)"
                        placeholder="Brief description of products you buy or distribute..."
                        rows={3}
                      />
                    </div>
                  )}

                  {/* Step 4: Location Address */}
                  {step === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                        <MapPin size={18} />
                        <span className="font-bold text-sm">Step 4: Business Location</span>
                      </div>
                      <FormSelect name="country" label="Country" options={COUNTRIES} />

                      <FormSelect
                        name="state"
                        label="State"
                        options={STATES[selectedCountry] || [{ value: '', label: 'Please select a country first' }]}
                        disabled={!selectedCountry}
                      />

                      <FormInput name="city" label="City" placeholder="e.g. Bengaluru" />
                      <FormTextarea name="address_line" label="Street Address Details" placeholder="Building, Street, Landmark..." />
                    </div>
                  )}
                </MultiStepForm>

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  {step > 0 ? (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step < stepsList.length - 1 ? (
                    <Button type="button" onClick={handleNext} className="shadow-md">
                      Next Step
                    </Button>
                  ) : (
                    <Button type="submit" isLoading={submitting} className="shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      Complete Registration
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
