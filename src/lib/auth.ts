import { db } from './db'
import crypto from 'crypto'

// ============ PASSWORD HASHING (PBKDF2) ============

const ITERATIONS = 120000
const KEYLEN = 64
const SALT_LEN = 16

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, 'sha512')
    .toString('hex')
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
    const iterations = parseInt(parts[1], 10)
    const salt = parts[2]
    const hash = parts[3]
    const verify = crypto
      .pbkdf2Sync(password, salt, iterations, KEYLEN, 'sha512')
      .toString('hex')
    // constant-time comparison
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'))
  } catch {
    return false
  }
}

// ============ PASSWORD POLICY (FR-M12-05) ============

export function validatePasswordPolicy(password: string): { ok: boolean; msg?: string } {
  if (password.length < 10) return { ok: false, msg: 'Kata laluan mesti sekurang-kurangnya 10 aksara' }
  if (!/[A-Z]/.test(password)) return { ok: false, msg: 'Mesti mengandungi huruf besar' }
  if (!/[a-z]/.test(password)) return { ok: false, msg: 'Mesti mengandungi huruf kecil' }
  if (!/[0-9]/.test(password)) return { ok: false, msg: 'Mesti mengandungi nombor' }
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, msg: 'Mesti mengandungi simbol khas' }
  return { ok: true }
}

// ============ SESSION TOKEN (HMAC-signed JWT-like) ============

const SECRET = process.env.SESSION_SECRET || 'spkp-jtm-dev-secret-change-in-production-2026'
const TOKEN_TTL = 60 * 60 // 1 hour (FR: JWT expiry 1 hour)

export interface SessionPayload {
  userId: string
  email: string
  roleCodes: string[]
  institutionId?: string | null
  exp: number
}

export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split('.')
    if (!data || !sig) return null
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// ============ COOKIE HELPERS ============

export const SESSION_COOKIE = 'spkp_jtm_session'

export function makeSessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TOKEN_TTL}; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
}

export function makeClearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}

// ============ SESSION RESOLVER (server-side) ============

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  if (!match) return null
  return verifySession(match[1])
}

export async function getCurrentUser(req: Request) {
  const session = await getSession(req)
  if (!session) return null
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: {
      roles: { include: { role: true } },
      institution: true,
    },
  })
  if (!user || user.status !== 'active') return null
  if (user.lockedUntil && user.lockedUntil > new Date()) return null
  return { user, session }
}

// ============ RBAC HELPERS ============

export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMINISTRATOR: 'ADMINISTRATOR',
  PENARAH: 'PENARAH',
  TIMBALAN_PENARAH: 'TIMBALAN_PENARAH',
  BAHAGIAN_KURIKULUM: 'BAHAGIAN_KURIKULUM',
  PEGAWAI_KURIKULUM: 'PEGAWAI_KURIKULUM',
  PEGAWAI_PENTAULIAHAN: 'PEGAWAI_PENTAULIAHAN',
  PEGAWAI_QA: 'PEGAWAI_QA',
  KETUA_PROGRAM: 'KETUA_PROGRAM',
  KETUA_JABATAN: 'KETUA_JABATAN',
  PENSYARAH: 'PENSYARAH',
  PANEL_INDUSTRI: 'PANEL_INDUSTRI',
  PANEL_AKADEMIK: 'PANEL_AKADEMIK',
  PANEL_PENILAI: 'PANEL_PENILAI',
  AUDITOR: 'AUDITOR',
  VIEWER: 'VIEWER',
  GUEST: 'GUEST',
} as const

export type RoleCode = keyof typeof ROLE_CODES

const APPROVERS = new Set<string>([
  ROLE_CODES.SUPER_ADMIN,
  ROLE_CODES.ADMINISTRATOR,
  ROLE_CODES.PENARAH,
  ROLE_CODES.TIMBALAN_PENARAH,
  ROLE_CODES.BAHAGIAN_KURIKULUM,
  ROLE_CODES.KETUA_JABATAN,
  ROLE_CODES.PEGAWAI_QA,
  ROLE_CODES.PEGAWAI_PENTAULIAHAN,
])

const CREATORS = new Set<string>([
  ROLE_CODES.SUPER_ADMIN,
  ROLE_CODES.ADMINISTRATOR,
  ROLE_CODES.PEGAWAI_KURIKULUM,
  ROLE_CODES.KETUA_PROGRAM,
  ROLE_CODES.PENSYARAH,
])

export function hasRole(session: SessionPayload, ...codes: string[]): boolean {
  return codes.some((c) => session.roleCodes.includes(c))
}

export function canApprove(session: SessionPayload): boolean {
  return session.roleCodes.some((r) => APPROVERS.has(r))
}

export function canCreateCurriculum(session: SessionPayload): boolean {
  return session.roleCodes.some((r) => CREATORS.has(r))
}

export function isAdmin(session: SessionPayload): boolean {
  return hasRole(session, ROLE_CODES.SUPER_ADMIN, ROLE_CODES.ADMINISTRATOR)
}

// ============ AUDIT LOG (FR-M13-01, FR-M13-03 immutable) ============

export async function logAudit(opts: {
  tableName: string
  recordId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  oldValues?: any
  newValues?: any
  performedById?: string
  ipAddress?: string
  source?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        tableName: opts.tableName,
        recordId: opts.recordId,
        action: opts.action,
        oldValues: opts.oldValues ?? null,
        newValues: opts.newValues ?? null,
        performedById: opts.performedById || null,
        ipAddress: opts.ipAddress || null,
        source: opts.source || 'user',
      },
    })
  } catch (e) {
    // audit log failure must not crash main flow, but record to console
    console.error('[AUDIT LOG ERROR]', e)
  }
}

// ============ NOTIFICATION HELPER ============

export async function pushNotification(opts: {
  userId: string
  category: string
  title: string
  message: string
  link?: string
  priority?: string
}) {
  try {
    await db.notification.create({
      data: {
        userId: opts.userId,
        category: opts.category,
        title: opts.title,
        message: opts.message,
        link: opts.link || null,
        priority: opts.priority || 'normal',
      },
    })
  } catch (e) {
    console.error('[NOTIFICATION ERROR]', e)
  }
}

// ============ INPUT SANITIZATION (OWASP XSS prevention) ============

export function sanitizeText(s: unknown): string {
  if (typeof s !== 'string') return ''
  return s
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 10000) // cap length
}

// ============ RATE LIMIT (in-memory basic) ============

const loginAttempts = new Map<string, { count: number; lastAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000 // 15 min

export function checkRateLimit(ip: string): { ok: boolean; msg?: string } {
  const entry = loginAttempts.get(ip)
  if (!entry) return { ok: true }
  const since = Date.now() - entry.lastAt
  if (since > LOCK_WINDOW_MS) {
    loginAttempts.delete(ip)
    return { ok: true }
  }
  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    return { ok: false, msg: 'Terlalu banyak percubaan log masuk. Cuba lagi selepas 15 minit.' }
  }
  return { ok: true }
}

export function recordFailedLogin(ip: string) {
  const entry = loginAttempts.get(ip) || { count: 0, lastAt: Date.now() }
  entry.count += 1
  entry.lastAt = Date.now()
  loginAttempts.set(ip, entry)
}

export function clearFailedLogin(ip: string) {
  loginAttempts.delete(ip)
}
