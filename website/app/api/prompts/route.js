import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROMPTS_PATH = path.join(process.cwd(), '..', 'prompts.json');

export async function GET() {
  try {
    const raw = fs.readFileSync(PROMPTS_PATH, 'utf-8');
    const prompts = JSON.parse(raw);

    const categories = Object.values(prompts).map(p => ({
      id: p.id,
      name: p.name,
    }));

    return NextResponse.json({ categories });
  } catch (err) {
    console.error('Failed to load prompts.json:', err.message);
    return NextResponse.json({ categories: [], error: err.message }, { status: 500 });
  }
}
