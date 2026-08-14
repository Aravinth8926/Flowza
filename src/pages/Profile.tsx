import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUserStore } from '../store/user';
import { useAuthStore } from '../store/auth';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { FormInput, FormSelect, FormTextarea } from '../components/forms/FormComponents';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Avatar } from '../components/ui/Avatar';
import { toast } from 'sonner';
import { User as UserIcon, Building, ShieldAlert, Key, Upload, Trash2, ShieldX } from 'lucide-react';
import { userService } from '../services/user.service';
import { companyService } from '../services/company.service';

const personalSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
});

const companySchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  business_type: z.string().min(1, 'Business type is required'),
  gst_number: z.string().length(15, 'GST must be exactly 15 characters').optional().or(z.literal('')),
  description: z.string().max(500, 'Max 500 characters').optional(),
  country: z.string().min(1, 'Country is required'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
  address_line: z.string().min(5, 'Address must be at least 5 characters'),
});

const passwordSchema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[a-z]/, 'Must include at least one lowercase letter')
    .regex(/[0-9]/, 'Must include at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must include at least one special character'),
  confirm_password: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

type PersonalValues = z.infer<typeof personalSchema>;
type CompanyValues = z.infer<typeof companySchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export const Profile: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { profile, company, address, fetchProfile, fetchCompany, fetchAddress, updateProfile, updateCompany, updateAddress } = useUserStore();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchProfile().catch(() => {});
    fetchCompany().catch(() => {});
    fetchAddress().catch(() => {});
  }, []);

  const personalMethods = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    values: {
      full_name: profile?.full_name || user?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || user?.phone || '',
    },
  });

  const companyMethods = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    values: {
      company_name: company?.company_name || '',
      business_type: company?.business_type || '',
      gst_number: company?.gst_number || '',
      description: company?.description || '',
      country: address?.country || '',
      state: address?.state || '',
      city: address?.city || '',
      address_line: address?.address_line || '',
    },
  });

  const passwordMethods = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const handlePersonalSubmit = async (values: PersonalValues) => {
    setPersonalLoading(true);
    try {
      await updateProfile({ full_name: values.full_name, phone: values.phone });
      toast.success('Personal profile updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update personal details.');
    } finally {
      setPersonalLoading(false);
    }
  };

  const handleCompanySubmit = async (values: CompanyValues) => {
    setCompanyLoading(true);
    try {
      await updateCompany({
        company_name: values.company_name,
        business_type: values.business_type,
        gst_number: values.gst_number || undefined,
        description: values.description || undefined,
      });

      await updateAddress({
        country: values.country,
        state: values.state,
        city: values.city,
        address_line: values.address_line,
      });

      toast.success('Company & Address updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update company details.');
    } finally {
      setCompanyLoading(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordValues) => {
    setPasswordLoading(true);
    try {
      await userService.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      toast.success('Password changed successfully!');
      passwordMethods.reset();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Password change failed.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    if (fileType !== 'image/jpeg' && fileType !== 'image/png' && fileType !== 'image/jpg') {
      toast.error('Only JPG, JPEG or PNG formats supported.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size cannot exceed 2MB.');
      return;
    }

    if (type === 'avatar') {
      setUploadingPic(true);
      try {
        await userService.uploadProfilePicture(file);
        toast.success('Profile picture updated!');
        fetchProfile();
      } catch (err: any) {
        toast.error('Avatar upload failed.');
      } finally {
        setUploadingPic(false);
      }
    } else {
      setUploadingLogo(true);
      try {
        await companyService.uploadLogo(file);
        toast.success('Company logo updated!');
        fetchCompany();
      } catch (err: any) {
        toast.error('Logo upload failed.');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await userService.deleteAccount();
      toast.success('Your account has been deactivated.');
      logout();
      setDeleteOpen(false);
    } catch (err: any) {
      toast.error('Account deletion failed.');
    }
  };

  const selectedRole = user?.role?.name || 'vendor';

  return (
    <PageWrapper title="Account & Profile Settings" breadcrumbs={[{ label: 'Home', path: '/' }, { label: 'Settings' }]}>
      <Tabs defaultValue="personal" className="max-w-3xl">
        <TabsList className="mb-6 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <TabsTrigger value="personal" className="rounded-lg font-semibold text-xs py-2">
            Profile Info
          </TabsTrigger>
          <TabsTrigger value="company" className="rounded-lg font-semibold text-xs py-2">
            Company Info
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg font-semibold text-xs py-2">
            Security & Account
          </TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
              <div className="relative">
                <Avatar
                  src={profile?.profile_picture_url}
                  fallback={profile?.full_name || 'U'}
                  size="lg"
                />
                <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white dark:border-slate-900 cursor-pointer shadow-md">
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => handleFileChange(e, 'avatar')}
                    disabled={uploadingPic}
                  />
                  <Upload size={13} className={uploadingPic ? 'animate-pulse' : ''} />
                </label>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Personal Profile Information</CardTitle>
                <CardDescription className="text-xs">Manage contact credentials and account owner details</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <FormProvider {...personalMethods}>
                <form onSubmit={personalMethods.handleSubmit(handlePersonalSubmit)} className="space-y-4">
                  <FormInput name="full_name" label="Full Name" />
                  <FormInput name="email" type="email" label="Email Address" disabled helperText="Email cannot be modified." />
                  <FormInput name="phone" label="Phone Number" />
                  <Button type="submit" isLoading={personalLoading} className="rounded-xl shadow-md">
                    Save Profile Changes
                  </Button>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Info Tab */}
        <TabsContent value="company">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
              <div className="relative">
                <Avatar
                  src={company?.logo_url}
                  fallback={company?.company_name || 'C'}
                  size="lg"
                />
                <label className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white dark:border-slate-900 cursor-pointer shadow-md">
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => handleFileChange(e, 'logo')}
                    disabled={uploadingLogo}
                  />
                  <Upload size={13} className={uploadingLogo ? 'animate-pulse' : ''} />
                </label>
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Business & Operations Details</CardTitle>
                <CardDescription className="text-xs">Manage company details, GST, and distribution address</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <FormProvider {...companyMethods}>
                <form onSubmit={companyMethods.handleSubmit(handleCompanySubmit)} className="space-y-4">
                  <FormInput name="company_name" label="Company / Merchant Name" />

                  <FormSelect
                    name="business_type"
                    label="Business Category"
                    options={
                      selectedRole === 'vendor'
                        ? [
                            { value: 'Supermarket', label: 'Supermarket' },
                            { value: 'Grocery Store', label: 'Grocery Store' },
                            { value: 'Restaurant', label: 'Restaurant' },
                            { value: 'Hotel', label: 'Hotel' },
                            { value: 'Pharmacy', label: 'Pharmacy' },
                            { value: 'Retail Shop', label: 'Retail Shop' },
                          ]
                        : [
                            { value: 'Distributor', label: 'Distributor' },
                            { value: 'Manufacturer', label: 'Manufacturer' },
                            { value: 'Wholesaler', label: 'Wholesaler' },
                          ]
                    }
                  />

                  <FormInput name="gst_number" label="GST Number (15 Characters)" />
                  <FormTextarea name="description" label="Business Overview" rows={2} />

                  <div className="border-t border-slate-200/60 dark:border-slate-800 pt-4 mt-6">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Business Address</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormInput name="country" label="Country" />
                      <FormInput name="state" label="State" />
                    </div>
                    <div className="mt-4">
                      <FormInput name="city" label="City" />
                    </div>
                    <div className="mt-4">
                      <FormTextarea name="address_line" label="Street Details" rows={2} />
                    </div>
                  </div>

                  <Button type="submit" className="mt-6 rounded-xl shadow-md" isLoading={companyLoading}>
                    Save Business Profile
                  </Button>
                </form>
              </FormProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <CardTitle className="text-lg font-bold">Change Password</CardTitle>
                <CardDescription className="text-xs">Update your security credentials</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FormProvider {...passwordMethods}>
                  <form onSubmit={passwordMethods.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                    <FormInput name="old_password" type="password" label="Current Account Password" />
                    <FormInput
                      name="new_password"
                      type="password"
                      label="New Account Password"
                      helperText="Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special character"
                    />
                    <FormInput name="confirm_password" type="password" label="Confirm New Password" />
                    <Button type="submit" isLoading={passwordLoading} className="rounded-xl shadow-md">
                      Update Password
                    </Button>
                  </form>
                </FormProvider>
              </CardContent>
            </Card>

            <Card className="glass-card border-red-200 dark:border-red-950/50">
              <CardHeader className="bg-red-50/40 dark:bg-red-950/20 border-b border-red-100 dark:border-red-950/40 pb-4">
                <CardTitle className="text-lg font-bold text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                <CardDescription className="text-xs text-red-500/80">Account deactivation settings</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Deactivate Account</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Soft-delete account profile and company listings on Flowza.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    className="flex items-center gap-2 shrink-0 rounded-xl"
                  >
                    <Trash2 size={16} />
                    Deactivate Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirm Account Deactivation"
        description="Are you sure you want to deactivate your Flowza account?"
        footerActions={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} className="flex items-center gap-2">
              <ShieldX size={16} />
              Confirm Deactivation
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your account will be deactivated and marked as soft-deleted. You can contact support if you need account recovery.
        </p>
      </Dialog>
    </PageWrapper>
  );
};
