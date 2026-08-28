import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadCDRData() {
  console.log('Loading CDR data into Supabase...');

  const caseId = 'e020d299-0ed7-4ea1-88b0-2f40ad7985db'; // Demo case ID
  const batchSize = 1000;
  let records: any[] = [];
  let totalInserted = 0;

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../mock-data/cdr_kaggle_formatted.csv'))
      .pipe(csv())
      .on('data', async (row) => {
        records.push({
          case_id: caseId,
          caller_number: row.caller_number,
          receiver_number: row.receiver_number,
          timestamp: row.timestamp,
          duration_sec: parseInt(row.duration_sec),
          tower_id: row.tower_id,
          call_type: row.call_type
        });

        if (records.length >= batchSize) {
          await insertBatch(records);
          totalInserted += records.length;
          console.log(`Inserted ${totalInserted} CDR records...`);
          records = [];
        }
      })
      .on('end', async () => {
        if (records.length > 0) {
          await insertBatch(records);
          totalInserted += records.length;
        }
        console.log(`CDR data loading complete. Total: ${totalInserted} records`);
        resolve();
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

async function insertBatch(records: any[]) {
  try {
    const { error } = await supabase
      .from('cdr_records')
      .insert(records);

    if (error) {
      console.error('Error inserting batch:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in insertBatch:', error);
    throw error;
  }
}

loadCDRData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });