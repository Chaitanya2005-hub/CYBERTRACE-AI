/**
 * Format Kaggle Financial data (SAML-D) to match Cyber Trace AI schema
 * Input: SAML-D.csv
 * Output: fin_kaggle_formatted.csv (sampled subset for testing)
 */

import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '..', 'mock-data', 'SAML-D.csv');
const OUTPUT_FILE = path.join(__dirname, '..', 'mock-data', 'fin_kaggle_formatted.csv');
const SAMPLE_SIZE = 1000; // Sample 1,000 records for testing (original has ~9.5M)

interface KaggleFinancialRecord {
  Time: string;
  Date: string;
  Sender_account: string;
  Receiver_account: string;
  Amount: string;
  Payment_currency: string;
  Received_currency: string;
  Sender_bank_location: string;
  Receiver_bank_location: string;
  Payment_type: string;
  Is_laundering: string;
  Laundering_type: string;
}

interface FormattedFinancialRecord {
  sender_account: string;
  receiver_account: string;
  amount_inr: number;
  timestamp: string;
  txn_type: string;
  flagged_risk_score?: number;
}

function convertToISO8601(time: string, date: string): string {
  // Input format: time="10:35:19", date="2022-10-07"
  // Output format: "2022-10-07T10:35:19.000Z"
  const dateParts = date.split('-').map(Number);
  const timeParts = time.split(':').map(Number);
  
  const year = dateParts[0] ?? 2022;
  const month = (dateParts[1] ?? 1) - 1;
  const day = dateParts[2] ?? 1;
  const hours = timeParts[0] ?? 0;
  const minutes = timeParts[1] ?? 0;
  const seconds = timeParts[2] ?? 0;
  
  const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  return dateObj.toISOString();
}

function convertToINR(amount: number, currency: string): number {
  // Simple currency conversion (simplified for demo)
  // In production, use real exchange rates
  const conversionRates: { [key: string]: number } = {
    'UK pounds': 105, // 1 GBP ≈ 105 INR
    'Dirham': 22,     // 1 AED ≈ 22 INR
    'US Dollar': 83,  // 1 USD ≈ 83 INR
    'Euro': 90,       // 1 EUR ≈ 90 INR
    'Yen': 0.56,      // 1 JPY ≈ 0.56 INR
    'Rupee': 1,       // 1 INR = 1 INR
  };
  
  const rate = conversionRates[currency] || 83; // Default to USD rate
  return Math.round(amount * rate);
}

function mapTransactionType(paymentType: string): string {
  // Map payment types to simplified transaction types
  const type = paymentType.toLowerCase();
  if (type.includes('cash')) return 'cash_withdrawal';
  if (type.includes('cheque')) return 'cheque';
  if (type.includes('cross-border')) return 'international_transfer';
  if (type.includes('ach')) return 'bank_transfer';
  if (type.includes('card')) return 'card_payment';
  return 'transfer'; // Default
}

function calculateRiskScore(isLaundering: string, launderingType: string): number | undefined {
  // Calculate risk score based on laundering labels
  if (isLaundering === '1') {
    return 0.9; // High risk for laundering
  }
  
  const type = launderingType.toLowerCase();
  if (type.includes('fan_out') || type.includes('fan_in')) {
    return 0.7; // Medium risk for fan patterns
  }
  if (type.includes('small')) {
    return 0.3; // Low risk for small transactions
  }
  
  return undefined; // No risk score for normal transactions
}

async function formatFinancialData() {
  console.log('🔄 Formatting Kaggle Financial data (SAML-D)...');
  console.log(`  📊 Sampling ${SAMPLE_SIZE} records from large dataset...`);
  
  const formattedRecords: FormattedFinancialRecord[] = [];
  let processedCount = 0;
  let errorCount = 0;
  let sampledCount = 0;

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(INPUT_FILE)
      .pipe(csvParser())
      .on('data', (row: KaggleFinancialRecord) => {
        try {
          // Sample records to manage file size
          if (sampledCount >= SAMPLE_SIZE) return;
          
          const amount = parseFloat(row.Amount);
          const timestamp = convertToISO8601(row.Time, row.Date);
          const riskScore = calculateRiskScore(row.Is_laundering, row.Laundering_type);
          
          const formatted: FormattedFinancialRecord = {
            sender_account: row.Sender_account,
            receiver_account: row.Receiver_account,
            amount_inr: convertToINR(amount, row.Payment_currency),
            timestamp: timestamp,
            txn_type: mapTransactionType(row.Payment_type),
          };
          
          if (riskScore !== undefined) {
            formatted.flagged_risk_score = riskScore;
          }
          
          formattedRecords.push(formatted);
          processedCount++;
          sampledCount++;
          
          if (processedCount % 1000 === 0) {
            console.log(`  Processed ${processedCount} records (sampled: ${sampledCount})...`);
          }
        } catch (error) {
          errorCount++;
          if (errorCount <= 10) { // Only show first 10 errors
            console.error(`  Error processing record: ${error}`);
          }
        }
      })
      .on('end', () => {
        console.log(`  ✅ Processed ${processedCount} records successfully`);
        console.log(`  ❌ ${errorCount} records had errors`);
        console.log(`  📊 Sampled ${sampledCount} records for output`);
        
        // Write formatted data
        const header = 'sender_account,receiver_account,amount_inr,timestamp,txn_type,flagged_risk_score\n';
        const csvContent = header + formattedRecords
          .map(record => 
            `${record.sender_account},${record.receiver_account},${record.amount_inr},${record.timestamp},${record.txn_type},${record.flagged_risk_score ?? ''}`
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
formatFinancialData()
  .then(() => {
    console.log('✅ Financial data formatting completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Financial data formatting failed:', error);
    process.exit(1);
  });