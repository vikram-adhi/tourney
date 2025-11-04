// Simple serverless login endpoint.
// Validates username/password against environment variables ADMIN_USER and ADMIN_PASS.
// Returns 200 { success: true } on success, 401 on failure.

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { username, password } = body || {};

    // Ensure env variables are available in local dev by loading .env.local when missing
    let adminUser = process.env.ADMIN_USER;
    let adminPass = process.env.ADMIN_PASS;
    if (!adminUser || !adminPass) {
      try {
        // load dotenv dynamically so production doesn't require the dev dependency
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const dotenv = require('dotenv');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path');
        dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
        adminUser = process.env.ADMIN_USER;
        adminPass = process.env.ADMIN_PASS;
      } catch (e) {
        // ignore - will handle as misconfigured below
      }
    }

    if (!adminUser || !adminPass) {
      // Misconfigured server - do not return credentials
      res.status(500).json({ error: 'Server not configured' });
      return;
    }

    if (username === adminUser && password === adminPass) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  } catch (err) {
    res.status(400).json({ error: 'Bad request' });
  }
}
