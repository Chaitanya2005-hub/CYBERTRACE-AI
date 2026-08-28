import type { Request, Response, NextFunction } from 'express';

// For Phase 1, we mock authentication by injecting the seed user ID.
// In a real app, this middleware would verify the JWT and extract auth.uid().
export const mockAuth = (req: Request, res: Response, next: NextFunction) => {
  // Use the seeded test user ID
  (req as any).user = {
    id: '3f69bd20-8625-429e-b16c-3c4c27310d52'
  };
  next();
};
