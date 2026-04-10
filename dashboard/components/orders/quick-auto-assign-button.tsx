'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type QuickAutoAssignButtonProps = {
  orderId: string;
};

export default function QuickAutoAssignButton({
  orderId,
}: QuickAutoAssignButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const [message, setMessage] = useState('');

  async function handleAssign() {
    setState('loading');
    setMessage('');

    try {
      const res = await fetch(`/api/orders/${orderId}/quick-auto-assign`, {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setState('error');
        setMessage(data?.message || 'No suitable courier found');
        return;
      }

      setState('success');
      setMessage('Assigned');

      // kısa delay → kullanıcı tik'i görsün
      setTimeout(() => {
        startTransition(() => {
          router.refresh();
        });
      }, 800);
    } catch (e) {
      setState('error');
      setMessage('Unexpected error');
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAssign}
        disabled={isPending || state === 'loading'}
        className={`rounded-lg px-3 py-2 text-xs font-medium text-white transition
        ${
          state === 'success'
            ? 'bg-emerald-600'
            : state === 'error'
            ? 'bg-red-600'
            : 'bg-slate-900 hover:bg-slate-800'
        }
        disabled:opacity-50`}
      >
        {state === 'loading' && 'Assigning...'}
        {state === 'success' && '✓ Assigned'}
        {state === 'error' && 'Retry'}
        {state === 'idle' && 'Quick Auto Assign'}
      </button>

      {state === 'error' && (
        <div className="text-xs text-red-600">{message}</div>
      )}
    </div>
  );
}