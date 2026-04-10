import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/auto-assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            data?.message || 'Auto assign failed. No suitable courier found.',
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order assigned successfully.',
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error during quick auto assign.',
      },
      { status: 500 },
    );
  }
}