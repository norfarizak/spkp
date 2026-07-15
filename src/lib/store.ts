'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  icNumber?: string | null
  staffId?: string | null
  phone?: string | null
  institutionId?: string | null
  institutionName?: string | null
  institutionCode?: string | null
  roles: string[]
  roleName?: string
  mfaEnabled: boolean
  status: string
  lastLoginAt?: string | null
}

export type ModuleKey =
  | 'dashboard'
  | 'curriculum'
  | 'noss'
  | 'wim'
  | 'accreditation'
  | 'experts'
  | 'workflow'
  | 'documents'
  | 'reports'
  | 'users'
  | 'audit'
  | 'notifications'
  | 'settings'
  | 'ai'

interface AppState {
  user: CurrentUser | null
  setUser: (u: CurrentUser | null) => void
  activeModule: ModuleKey
  setActiveModule: (m: ModuleKey) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  aiOpen: boolean
  setAiOpen: (v: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      activeModule: 'dashboard',
      setActiveModule: (m) => set({ activeModule: m }),
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      aiOpen: false,
      setAiOpen: (v) => set({ aiOpen: v }),
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'spkp-jtm-state',
      partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed, activeModule: s.activeModule }),
    }
  )
)

export function hasAnyRole(roles: string[], ...codes: string[]): boolean {
  return codes.some((c) => roles.includes(c))
}
