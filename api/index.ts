import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Health check endpoint
  if (req.url === '/api/health' || req.url === '/health') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Backend is running and reaches Supabase.' 
    });
  }

  // For now, return a simple response
  return res.status(200).json({ 
    message: 'API endpoint',
    method: req.method,
    url: req.url 
  });
}
