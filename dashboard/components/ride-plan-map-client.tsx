'use client';

import dynamic from 'next/dynamic';

type Stop = {
  stopId: string;
  orderId: string;
  orderRef: string;
  type: 'pickup' | 'dropoff';
  lat: number;
  lng: number;
  status: string;
  sequence: number;
  actualTs?: string | null;
};

const RidePlanMap = dynamic(() => import('./ride-plan-map'), {
  ssr: false,
});

type Props = {
  recommendedSequence: Stop[];
  actualSequence: Stop[];
};

export default function RidePlanMapClient({
  recommendedSequence,
  actualSequence,
}: Props) {
  return (
    <RidePlanMap
      recommendedSequence={recommendedSequence}
      actualSequence={actualSequence}
    />
  );
}