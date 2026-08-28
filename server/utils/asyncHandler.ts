import type { Request, Response, NextFunction } from 'express';

/**
 * Wraps an async Express route handler so thrown errors are forwarded to
 * Express's error middleware instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
