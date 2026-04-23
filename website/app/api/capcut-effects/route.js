import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * GET /api/capcut-effects
 * Returns all available CapCut effects catalog
 */
export async function GET(request) {
  try {
    const catalogPath = path.join(process.cwd(), 'public', 'capcut_effects.json');
    
    if (!existsSync(catalogPath)) {
      return NextResponse.json({ 
        error: 'Effects catalog not found. Run extract_effects_catalog.py first.' 
      }, { status: 404 });
    }
    
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
    
    // Add summary counts
    const summary = {};
    let total = 0;
    for (const [key, effects] of Object.entries(catalog)) {
      summary[key] = effects.length;
      total += effects.length;
    }
    
    return NextResponse.json({
      success: true,
      total,
      summary,
      catalog,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
