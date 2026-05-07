export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white border border-ninja-border rounded-xl shadow-sm p-6 ${onClick ? 'cursor-pointer hover:border-ninja-blue transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
