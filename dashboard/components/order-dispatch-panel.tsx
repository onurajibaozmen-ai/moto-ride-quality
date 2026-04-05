'use client';

import { useEffect, useState } from 'react';
import {
  recommendCourier,
  autoAssignOrder,
  getBatchSuggestions,
} from '@/lib/api';

type Props = {
  orderId: string;
};

export default function OrderDispatchPanel({ orderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rec, batchRes] = await Promise.all([
        recommendCourier(orderId),
        getBatchSuggestions(orderId),
      ]);
      setRecommendation(rec);
      setBatch(batchRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      await autoAssignOrder(orderId);
      await load();
      alert('Auto assigned!');
    } catch (e) {
      alert('Auto assign failed');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div>Loading dispatch insights...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Recommendation */}
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Recommended Courier</h3>

        {recommendation?.recommendedCourier ? (
          <div className="space-y-2">
            <div>
              <strong>{recommendation.recommendedCourier.courier.name}</strong>
            </div>
            <div className="text-sm text-gray-600">
              Score: {recommendation.recommendedCourier.recommendationScore}
            </div>

            <button
              onClick={handleAutoAssign}
              disabled={assigning}
              className="mt-2 px-4 py-2 bg-black text-white rounded-lg"
            >
              {assigning ? 'Assigning...' : 'Auto Assign'}
            </button>
          </div>
        ) : (
          <div>No recommendation</div>
        )}
      </div>

      {/* Candidates */}
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Top Candidates</h3>

        <div className="space-y-2">
          {recommendation?.candidates?.slice(0, 5).map((c: any) => (
            <div
              key={c.courier.id}
              className="flex justify-between border p-2 rounded-lg"
            >
              <span>{c.courier.name}</span>
              <span className="text-sm text-gray-500">
                {c.recommendationScore}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Suggestions */}
      <div className="border rounded-xl p-4">
        <h3 className="font-semibold mb-2">Batch Suggestions</h3>

        {batch?.suggestions?.length === 0 && <div>No batch candidates</div>}

        <div className="space-y-2">
          {batch?.suggestions?.map((s: any) => (
            <div
              key={s.order.id}
              className="flex justify-between border p-2 rounded-lg"
            >
              <span>{s.order.externalRef ?? s.order.id}</span>
              <span className="text-sm text-gray-500">
                score: {s.batchScore}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}