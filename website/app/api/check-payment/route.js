import { NextResponse } from 'next/server';

const MBBANK_PAYMENT_API = process.env.MBBANK_PAYMENT_API || 'http://127.0.0.1:5555';

export async function POST(request) {
  try {
    const body = await request.json();
    const content = (body.content || '').trim().toUpperCase();
    const amount = parseInt(body.amount) || 40000;

    if (!content) {
      return NextResponse.json({ found: false, error: 'Missing content' }, { status: 400 });
    }

    // Call Python microservice /check-payment endpoint directly
    const res = await fetch(`${MBBANK_PAYMENT_API}/check-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, amount }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({ found: false, error: errData.error || 'Không thể kết nối MBBank API' }, { status: 503 });
    }

    const data = await res.json();

    if (data.success && data.paid) {
      return NextResponse.json({
        found: true,
        transaction: {
          amount: data.amount,
          description: data.description,
          date: data.date,
        },
        message: `Đã tìm thấy giao dịch ${amount.toLocaleString()}đ với nội dung "${content}".`,
      });
    }

    return NextResponse.json({
      found: false,
      message: data.message || `Chưa tìm thấy giao dịch phù hợp. Vui lòng chuyển khoản đúng nội dung "${content}" và số tiền ${amount.toLocaleString()}đ.`,
    });
  } catch (err) {
    return NextResponse.json({ found: false, error: err.message }, { status: 500 });
  }
}
