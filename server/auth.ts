import { Request, Response, NextFunction } from 'express';
import db from './db';
import { User } from './types';

export function loadUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    next();
    return;
  }
  const user = db.prepare(
    'SELECT id, email, display_name, role, department_id, is_active, created_at, updated_at FROM users WHERE id = ?'
  ).get(req.session.userId) as User | undefined;

  if (!user || !user.is_active) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as AuthRequest).user = user;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as AuthRequest).user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export interface AuthRequest extends Request {
  user: User;
}
