// Helper used by every /api/admin/* route to require an admin session.
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function requireAdmin(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (!session.user?.isAdmin) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return session;
}
