import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Input, InputProps } from '../ui/Input';
import { Textarea, TextareaProps } from '../ui/Textarea';
import { Select, SelectProps } from '../ui/Select';

interface FormFieldProps {
  name: string;
  children: (helpers: { error?: string; register: any }) => React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ name, children }) => {
  const context = useFormContext();
  if (!context) {
    return <>{children({ register: () => ({}), error: undefined })}</>;
  }
  const { register, formState: { errors } } = context;
  const errorMsg = errors[name]?.message as string | undefined;
  return <>{children({ register: (options?: any) => register(name, options), error: errorMsg })}</>;
};

interface FormInputProps extends InputProps {
  name: string;
}

export const FormInput: React.FC<FormInputProps> = ({ name, ...props }) => {
  const context = useFormContext();
  if (!context) return <Input {...props} />;
  const { register, formState: { errors } } = context;
  const errorMsg = errors[name]?.message as string | undefined;
  return <Input error={errorMsg} {...register(name)} {...props} />;
};

interface FormTextareaProps extends TextareaProps {
  name: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({ name, ...props }) => {
  const context = useFormContext();
  if (!context) return <Textarea {...props} />;
  const { register, formState: { errors } } = context;
  const errorMsg = errors[name]?.message as string | undefined;
  return <Textarea error={errorMsg} {...register(name)} {...props} />;
};

interface FormSelectProps extends SelectProps {
  name: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({ name, ...props }) => {
  const context = useFormContext();
  if (!context) return <Select {...props} />;
  const { register, formState: { errors } } = context;
  const errorMsg = errors[name]?.message as string | undefined;
  return <Select error={errorMsg} {...register(name)} {...props} />;
};
