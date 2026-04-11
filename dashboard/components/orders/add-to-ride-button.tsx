'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type AddToRideButtonProps = {
  orderId: string;
  candidateOrderId: string;
};

export default function AddToRideButton({
  orderId,
  candidateOrderId,
}: AddToRideButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleClick() {
    setMessage('');
    setType('idle');

    try {
      const res = await fetch(`/api/orders/${orderId}/add-to-ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidateOrderId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setType('error');
        setMessage(data?.message || 'Add to ride failed');
        return;
      }

      setType('success');
      setMessage('Added to ride');

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setType('error');
      setMessage('Unexpected error');
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
          type === 'success'
            ? 'bg-emerald-600'
            : type === 'error'
              ? 'bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
        } disabled:opacity-50`}
      >
        {isPending ? 'Adding...' : type === 'success' ? '✓ Added' : 'Add to Ride'}
      </button>

      {message ? (
        <div
          className={`text-xs ${
            type === 'success' ? 'text-emerald-700' : 'text-red-600'
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}