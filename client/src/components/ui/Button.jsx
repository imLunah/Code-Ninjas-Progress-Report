const VARIANTS = {
  primary: 'bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja font-bold rounded-lg px-5 py-2.5 transition-colors',
  secondary: 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue hover:text-ninja-blue font-ninja font-bold rounded-lg px-5 py-2.5 transition-colors',
  ghost: 'bg-transparent text-ninja-navy hover:text-ninja-blue font-ninja font-bold transition-colors',
  danger: 'bg-red-50 border border-red-200 text-ninja-red hover:bg-red-100 font-ninja font-bold rounded-lg px-5 py-2.5 transition-colors',
};

const sizeClasses = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base',
  lg: 'text-lg px-6 py-3',
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  size = 'md',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${VARIANTS[variant]}
        ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}
