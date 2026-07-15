'use client'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/use-session'
import { LoginScreen } from '@/components/login-screen'
import { AppShell } from '@/components/app-shell'
import { DashboardModule } from '@/modules/dashboard'
import { CurriculumModule } from '@/modules/curriculum'
import { NossModule } from '@/modules/noss'
import { WimModule } from '@/modules/wim'
import { AccreditationModule } from '@/modules/accreditation'
import { ExpertsModule } from '@/modules/experts'
import { WorkflowModule } from '@/modules/workflow'
import { DocumentsModule } from '@/modules/documents'
import { ReportsModule } from '@/modules/reports'
import { UsersModule } from '@/modules/users'
import { AuditModule } from '@/modules/audit'
import { NotificationsModule } from '@/modules/notifications'
import { SettingsModule } from '@/modules/settings'
import { AiModule } from '@/modules/ai'
import { AiChatWidget } from '@/components/ai-chat-widget'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useSession()
  const activeModule = useAppStore((s) => s.activeModule)

  if (loading) {
    return (
      <div className="glass-bg min-h-screen flex items-center justify-center">
        <div className="glass-strong p-8 rounded-2xl flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-300" />
          <div className="text-sm text-cyan-100/80">Memuatkan SPKP-JTM...</div>
        </div>
      </div>
    )
  }

  if (!user) return <LoginScreen />

  return (
    <AppShell>
      {activeModule === 'dashboard' && <DashboardModule />}
      {activeModule === 'curriculum' && <CurriculumModule />}
      {activeModule === 'noss' && <NossModule />}
      {activeModule === 'wim' && <WimModule />}
      {activeModule === 'accreditation' && <AccreditationModule />}
      {activeModule === 'experts' && <ExpertsModule />}
      {activeModule === 'workflow' && <WorkflowModule />}
      {activeModule === 'documents' && <DocumentsModule />}
      {activeModule === 'reports' && <ReportsModule />}
      {activeModule === 'users' && <UsersModule />}
      {activeModule === 'audit' && <AuditModule />}
      {activeModule === 'notifications' && <NotificationsModule />}
      {activeModule === 'settings' && <SettingsModule />}
      {activeModule === 'ai' && <AiModule />}
      <AiChatWidget />
    </AppShell>
  )
}
