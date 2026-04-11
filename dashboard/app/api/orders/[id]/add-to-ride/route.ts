import { NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${API_BASE_URL}/orders/${id}/add-to-ride`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return NextResponse.json(
        {
          message: data?.message || 'Add to ride failed',
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Order added to ride successfully',
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error during add-to-ride',
      },
      { status: 500 },
    );
  }
}