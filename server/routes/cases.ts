import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabaseAdmin } from '../utils/supabaseAdmin.js';
import { mockAuth } from '../middleware/auth.js';

export const casesRouter = Router();

casesRouter.use(mockAuth);

// Create a new case
casesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { caseName } = req.body;
  const userId = (req as any).user.id;

  if (!caseName) {
    res.status(400).json({ error: 'Case name is required' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .insert({
        user_id: userId,
        case_name: caseName
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.id,
      caseName: data.case_name,
      createdAt: data.created_at
    });
  } catch (err: any) {
    console.error('Error creating case:', err);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// Get all cases for the current user
casesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user.id;

  try {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('id, case_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (err: any) {
    console.error('Error fetching cases:', err);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});