import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.ts';
import { signAuthToken, type AuthenticatedRequest, type UserRole } from '../middleware/auth.ts';
import { logAudit } from '../services/auditService.ts';
import { isNonEmptyString } from '../validators/validators.ts';

interface UserRow {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, email, phone, password } = req.body as {
      identifier?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const loginInput = (identifier || email || phone || '').trim();
    if (!isNonEmptyString(loginInput) || !isNonEmptyString(password)) {
      res.status(400).json({ error: 'Email or phone number and password are required.' });
      return;
    }

    const user = await db.queryOne<UserRow>(
      'SELECT user_id, name, email, phone, password_hash, role, created_at FROM users WHERE email = ? OR phone = ?',
      [loginInput, loginInput]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. Please check your email/phone and password.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials. Please check your email/phone and password.' });
      return;
    }

    let tenantId: number | null = null;
    let tenantCode: string | null = null;
    if (user.role === 'TENANT') {
      const tenant = await db.queryOne<{ tenant_id: number; tenant_code: string; status: string }>(
        'SELECT tenant_id, tenant_code, status FROM tenants WHERE user_id = ?',
        [user.user_id]
      );
      if (tenant) {
        tenantId = tenant.tenant_id;
        tenantCode = tenant.tenant_code;
      }
    }

    const authUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      tenant_id: tenantId,
    };

    const token = signAuthToken(authUser);

    await logAudit({
      userId: user.user_id,
      action: 'USER_LOGIN',
      entityType: 'users',
      entityId: user.user_id,
      details: `${user.role} logged in`,
    });

    res.json({
      token,
      user: {
        ...authUser,
        tenant_code: tenantCode,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to process login request.' });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.user_id,
        action: 'USER_LOGOUT',
        entityType: 'users',
        entityId: req.user.user_id,
        details: `${req.user.role} logged out`,
      });
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const user = await db.queryOne<Omit<UserRow, 'password_hash'>>(
      'SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id = ?',
      [req.user.user_id]
    );

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const notifRow = await db.queryOne<{ unread_count: number }>(
      "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND status = 'UNREAD'",
      [user.user_id]
    );

    let tenantProfile: Record<string, unknown> | null = null;
    if (user.role === 'TENANT') {
      tenantProfile = await db.queryOne(
        `SELECT t.tenant_id, t.tenant_code, t.joining_date, t.monthly_rent, t.emergency_contact, t.address, t.status,
                b.bed_id, b.bed_number, r.room_id, r.room_number, r.floor, r.room_type
         FROM tenants t
         LEFT JOIN stay_history sh ON sh.tenant_id = t.tenant_id AND sh.check_out IS NULL
         LEFT JOIN beds b ON b.bed_id = sh.bed_id
         LEFT JOIN rooms r ON r.room_id = b.room_id
         WHERE t.user_id = ?`,
        [user.user_id]
      );
    }

    res.json({
      user: {
        ...user,
        tenant_id: tenantProfile ? Number(tenantProfile.tenant_id) : null,
        unread_notifications: Number(notifRow?.unread_count || 0),
        tenant_profile: tenantProfile,
      },
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { identifier } = req.body as { identifier?: string };
    if (!isNonEmptyString(identifier)) {
      res.status(400).json({ error: 'Please provide your registered email or phone number.' });
      return;
    }

    const user = await db.queryOne<{ user_id: number; email: string; role: string }>(
      'SELECT user_id, email, role FROM users WHERE email = ? OR phone = ?',
      [identifier.trim(), identifier.trim()]
    );

    if (user) {
      await logAudit({
        userId: user.user_id,
        action: 'PASSWORD_RESET_REQUESTED',
        entityType: 'users',
        entityId: user.user_id,
        details: `Password reset requested for ${user.email}`,
      });
    }

    res.json({
      message:
        'If an account matches that email or phone number, password reset instructions have been sent. For local demo accounts, contact your PG Manager or Owner.',
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ error: 'Unable to process password reset request.' });
  }
}
