import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadDemoData, DEMO_CASE_ID } from '../utils/demoStore.js';

export const demoRouter = Router();

demoRouter.post(
  '/preload',
  asyncHandler(async (_req, res) => {
    try {
      const counts = await loadDemoData();
      res.json({
        message: 'Demo data loaded successfully',
        caseId: DEMO_CASE_ID,
        caseName: 'Demo Case — Kaggle Real Data',
        cdrInserted: counts.cdrInserted,
        finInserted: counts.finInserted,
      });
    } catch (err: any) {
      console.error('[Demo Preload Error]', err);
      res.status(500).json({ error: err.message || 'Demo preload failed' });
    }
  })
);
