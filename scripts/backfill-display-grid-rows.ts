#!/usr/bin/env npx tsx
/**
 * Backfill display_grid_rows for text_documents that have display_content but no grid rows.
 * Run after applying migration 20260318_0647--addDisplayGridRowsToTextDocuments.sql
 *
 * Usage: npm run backfill:display-grid-rows
 * Loads .env.local for NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { htmlToBlockGridRowsWithChars } from '../src/lib/display/html';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // Count totals for diagnostics
  const { count: totalDocs } = await supabase
    .from('text_documents')
    .select('*', { count: 'exact', head: true });
  const { count: withDisplayContent } = await supabase
    .from('text_documents')
    .select('*', { count: 'exact', head: true })
    .not('display_content', 'is', null);
  const { count: withGridRows } = await supabase
    .from('text_documents')
    .select('*', { count: 'exact', head: true })
    .not('display_grid_rows', 'is', null);

  const { data: docs, error } = await supabase
    .from('text_documents')
    .select('id, display_content')
    .not('display_content', 'is', null)
    .is('display_grid_rows', null);

  if (error) {
    console.error('Failed to fetch documents:', error);
    process.exit(1);
  }

  const needBackfill = docs?.length ?? 0;
  console.log(
    `text_documents: ${totalDocs ?? '?'} total, ${withDisplayContent ?? '?'} with display_content, ${withGridRows ?? '?'} with display_grid_rows, ${needBackfill} need backfill`
  );

  if (needBackfill === 0) {
    console.log('No documents need backfill.');
    return;
  }

  console.log(`Backfilling ${needBackfill} document(s)...`);

  let ok = 0;
  let fail = 0;

  for (const doc of docs ?? []) {
    try {
      const gridRows = htmlToBlockGridRowsWithChars(doc.display_content!);
      const { error: upErr } = await supabase
        .from('text_documents')
        .update({ display_grid_rows: gridRows })
        .eq('id', doc.id);

      if (upErr) {
        console.error(`[${doc.id}] Update failed:`, upErr.message);
        fail++;
      } else {
        ok++;
        console.log(`[${doc.id}] OK (${gridRows.length} rows)`);
      }
    } catch (err) {
      console.error(`[${doc.id}] Parse failed:`, err);
      fail++;
    }
  }

  console.log(`Done. ${ok} updated, ${fail} failed.`);
}

main();
