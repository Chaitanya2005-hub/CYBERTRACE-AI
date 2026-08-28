/**
 * Format Kaggle CDR data to match Cyber Trace AI schema
 * Input: realtime_cdr_fraud_dataset.csv
 * Output: cdr_kaggle_formatted.csv
 */

import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '..', 'mock-data', 'realtime_cdr_fraud_dataset.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'mock-data', 'cdr_kaggle_formatted.csv');

interface KaggleCDRRecord {
  caller_id: string;
  receiver_id: string;
  start_time: string;
  duration_sec: string;
  call_type: string;
  sim_id: string;
  device_id: string;
  location_origin: string;
  country_origin: string;
  location_dest: string;
  country_dest: string;
  is_night_call: string;
  transaction_status: string;
  fraud_type: string;
}

interface FormattedCDRRecord {
  caller_number: string;
  receiver_number: string;
  timestamp: string;
  duration_sec: number;
  tower_id: string;
  call_type: 'voice' | 'sms' | 'data';
}

function convertToISO8601(dateTimeStr: string): string {
  // Input format: "2025-05-31 16:09:56"
  // Output format: "2025-05-31T16:09:56.000Z"
  const [date, time] = dateTimeStr.split(' ');
  if (!date || !time) return new Date().toISOString();
  
  const parts = date.split('-').map(Number);
  const timeParts = time.split(':').map(Number);
  
  const year = parts[0] ?? 2025;
  const month = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const seconds = timeParts[2] ?? 0;
  
  const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  return dateObj.toISOString();
}

function mapCallType(callType: string): 'voice' | 'sms' | 'data' {
  const type = callType.toLowerCase();
  if (type === 'local' || type === 'international') return 'voice';
  if (type === 'sms') return 'sms';
  if (type === 'data') return 'data';
  return 'voice'; // Default to voice for unknown types
}

function generateTowerId(location: string, country: string): string {
  // Generate a tower ID from location and country
  const locCode = location.substring(0, 3).toUpperCase();
  const countryCode = country.substring(0, 2).toUpperCase();
  return `TOW${locCode}${countryCode}`;
}

async function formatCDRData() {
  console.log('🔄 Formatting Kaggle CDR data...');
  
  const formattedRecords: FormattedCDRRecord[] = [];
  let processedCount = 0;
  let errorCount = 0;

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_FILE)
      .pipe(csvParser())
      .on('data', (row: KaggleCDRRecord) => {
        try {
          const formatted: FormattedCDRRecord = {
            caller_number: row.caller_id,
            receiver_number: row.receiver_id,
            timestamp: convertToISO8601(row.start_time),
            duration_sec: parseInt(row.duration_sec, 10),
            tower_id: generateTowerId(row.location_origin, row.country_origin),
            call_type: mapCallType(row.call_type)
          };
          
          formattedRecords.push(formatted);
          processedCount++;
          
          if (processedCount % 1000 === 0) {
            console.log(`  Processed ${processedCount} records...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  Error processing record: ${error}`);
        }
      })
      .on('end', () => {
        console.log(`  ✅ Processed ${processedCount} records successfully`);
        console.log(`  ❌ ${errorCount} records had errors`);
        
        // Write formatted data
        const header = 'caller_number,receiver_number,timestamp,duration_sec,tower_id,call_type\n';
        const csvContent = header + formattedRecords
          .map(record => 
            `${record.caller_number},${record.receiver_number},${record.timestamp},${record.duration_sec},${record.tower_id},${record.call_type}`
          )
          .join('\n');
        
        fs.writeFileSync(OUTPUT_FILE, csvContent);
        console.log(`  📁 Formatted data saved to: ${OUTPUT_FILE}`);
        console.log(`  📊 Total records in output: ${formattedRecords.length}`);
        
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Error reading input file:', error);
        reject(error);
      });
  });
}

// Run the formatting
formatCDRData()
  .then(() => {
    console.log('✅ CDR data formatting completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CDR data formatting failed:', error);
    process.exit(1);
  });