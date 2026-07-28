import { PANEL } from '../../lib/surfaces';

// Thin wrapper over the shared PANEL surface. Only a couple of pages use this;
// most compose the token directly because they need it on a form or a section.
export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`${PANEL} p-6 ${onClick ? 'cursor-pointer hover:border-ninja-blue transition-colors' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
