import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn's class merger: clsx resolves conditionals, twMerge makes the last
// conflicting Tailwind class win so a caller's `p-6` beats a component's `p-4`.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
