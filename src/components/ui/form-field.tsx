type Props = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email" | "tel";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
};

export function FormField({ id, label, type = "text", ...rest }: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        {...rest}
        className="w-full px-3 py-2 text-base md:text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}
