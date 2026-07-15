import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ctx = await getCurrentUser(req)
  if (!ctx) return NextResponse.json({ user: null }, { status: 200 })
  const { user, session } = ctx
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      icNumber: user.icNumber,
      staffId: user.staffId,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      institutionId: user.institutionId,
      institutionName: user.institution?.name,
      institutionCode: user.institution?.code,
      roles: session.roleCodes,
      roleName: user.roles[0]?.role.name,
      mfaEnabled: user.mfaEnabled,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    },
    permissions: session.roleCodes, // for client-side menu gating
  })
}
