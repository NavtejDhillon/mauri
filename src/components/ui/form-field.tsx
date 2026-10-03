type Props = {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "url" | "search" | "none";
  autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
  spellCheck?: boolean;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  pattern?: string;
  min?: string;
  max?: string;
  // Guidance shown under the input and read out with it.
  hint?: string;
  // A message about this input; marks it invalid and is read out with it.
  error?: string | null;
};

export function FormField({ id, label, type = "text", hint, error, ...rest }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        {...rest}
        className={`w-full min-h-11 px-3 py-2 text-base border rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-1 transition-colors duration-150 ${
          error ? "border-coral-600 focus:border-coral-600 focus:ring-coral-600" : "border-field-line focus:border-sage-600 focus:ring-sage-600"
        }`}
      />
      {hint && (
        <p id={hintId} className="text-xs text-warm-400 mt-1.5">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-coral-600 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
}
