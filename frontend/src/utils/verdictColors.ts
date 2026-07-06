import type { Verdict } from '../types';

export function getVerdictColor(verdict: Verdict): {
  bg: string;
  text: string;
  ring: string;
  gradient: string;
} {
  switch (verdict) {
    case 'True':
    case 'Mostly true':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        ring: 'ring-emerald-200',
        gradient: 'from-emerald-400 to-green-500',
      };
    case 'Unclear':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        ring: 'ring-amber-200',
        gradient: 'from-amber-400 to-yellow-500',
      };
    case 'Mostly false':
    case 'False':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        ring: 'ring-red-200',
        gradient: 'from-red-400 to-rose-500',
      };
    case 'Not enough evidence':
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        ring: 'ring-gray-200',
        gradient: 'from-gray-300 to-gray-400',
      };
  }
}
