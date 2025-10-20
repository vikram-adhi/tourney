// This file is intentionally left as a placeholder. The app now uses Supabase directly
// from the client. Returning 410 to indicate the endpoint is gone.

export default function handler(_req: any, res: any) {
  res.status(410).json({ error: 'Endpoint removed. Use Supabase directly from the client.' });
}