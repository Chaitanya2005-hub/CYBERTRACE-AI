import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import fs from 'fs';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { mockAuth } from '../middleware/auth.js';

const upload = multer({ dest: 'uploads/' }); // temporary storage before stream parse
export const uploadRouter = Router();

uploadRouter.use(mockAuth);

uploadRouter.post('/cdr', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const caseId = req.body.caseId;
  if (!caseId) {
    res.status(400).json({ error: 'Case ID is required. Please create a case first.' });
    return;
  }
  const userId = (req as any).user.id;

  // Anti-IDOR: Check if user owns the case
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('user_id', userId)
    .single();

  if (caseError || !caseData) {
    res.status(403).json({ error: 'Forbidden: Case not found or unowned' });
    return;
  }

  const results: any[] = [];
  const errors: string[] = [];

  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (data) => {
      // Validate schema
      if (!data.caller_number || !data.receiver_number || !data.timestamp || !data.duration_sec || !data.call_type) {
        errors.push(`Row missing required fields: ${JSON.stringify(data)}`);
        return;
      }
      results.push({
        case_id: caseId,
        caller_number: data.caller_number,
        receiver_number: data.receiver_number,
        timestamp: new Date(data.timestamp).toISOString(),
        duration_sec: parseInt(data.duration_sec, 10),
        tower_id: data.tower_id || null,
        call_type: data.call_type
      });
    })
    .on('end', async () => {
      fs.unlinkSync(req.file!.path); // Clean up
      
      if (results.length === 0) {
        res.status(400).json({ error: 'No valid rows found', details: errors });
        return;
      }

      // Batch insert (in chunks if large, but for 10k Supabase can handle ~1000 per request)
      const chunkSize = 1000;
      let insertedCount = 0;
      try {
        for (let i = 0; i < results.length; i += chunkSize) {
          const chunk = results.slice(i, i + chunkSize);
          const { error } = await supabaseAdmin.from('cdr_records').insert(chunk);
          if (error) throw error;
          insertedCount += chunk.length;
        }
        res.json({ message: 'Upload successful', inserted: insertedCount, errors });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error during DB insert' });
      }
    });
});

uploadRouter.post('/transactions', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const caseId = req.body.caseId;
  if (!caseId) {
    res.status(400).json({ error: 'Case ID is required. Please create a case first.' });
    return;
  }
  const userId = (req as any).user.id;

  // Anti-IDOR
  const { data: caseData, error: caseError } = await supabaseAdmin
    .from('cases')
    .select('id')
    .eq('id', caseId)
    .eq('user_id', userId)
    .single();

  if (caseError || !caseData) {
    res.status(403).json({ error: 'Forbidden: Case not found or unowned' });
    return;
  }

  const results: any[] = [];
  const errors: string[] = [];

  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (data) => {
      // Validate schema
      if (!data.sender_account || !data.receiver_account || !data.amount_inr || !data.timestamp || !data.txn_type) {
        errors.push(`Row missing required fields: ${JSON.stringify(data)}`);
        return;
      }
      results.push({
        case_id: caseId,
        sender_account: data.sender_account,
        receiver_account: data.receiver_account,
        amount_inr: parseFloat(data.amount_inr),
        timestamp: new Date(data.timestamp).toISOString(),
        txn_type: data.txn_type,
        flagged_risk_score: data.flagged_risk_score ? parseFloat(data.flagged_risk_score) : null
      });
    })
    .on('end', async () => {
      fs.unlinkSync(req.file!.path);
      
      if (results.length === 0) {
        res.status(400).json({ error: 'No valid rows found', details: errors });
        return;
      }

      const chunkSize = 1000;
      let insertedCount = 0;
      try {
        for (let i = 0; i < results.length; i += chunkSize) {
          const chunk = results.slice(i, i + chunkSize);
          const { error } = await supabaseAdmin.from('financial_transactions').insert(chunk);
          if (error) throw error;
          insertedCount += chunk.length;
        }
        res.json({ message: 'Upload successful', inserted: insertedCount, errors });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error during DB insert' });
      }
    });
});
