/* eslint-disable */
// SPKP-JTM Seed Data
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'
import crypto from 'crypto'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SPKP-JTM...')

  // ---------- INSTITUTIONS ----------
  const institutions = await Promise.all([
    db.institution.create({ data: { name: 'Institut Kemahiran Belia Negara Kuala Lumpur', code: 'IKBN-KL', type: 'IKBN', address: 'Jalan Sentul, 51100 Kuala Lumpur', phone: '03-4043 7000', email: 'info@ikbnkl.gov.my', status: 'active' } }),
    db.institution.create({ data: { name: 'Advanced Technology Training Center Shah Alam', code: 'ATC-SA', type: 'ATC', address: 'Persiaran Sukan, 40000 Shah Alam', phone: '03-5510 2000', email: 'info@atcsa.gov.my', status: 'active' } }),
    db.institution.create({ data: { name: 'Kolej Komuniti Bukit Beruang', code: 'KK-BB', type: 'Kolej Komuniti', address: 'Bukit Beruang, 75450 Melaka', phone: '06-232 3000', email: 'info@kkbb.edu.my', status: 'active' } }),
    db.institution.create({ data: { name: 'Institut Latihan Perindustrian Cawangan Ipoh', code: 'ILP-IPOH', type: 'ILP', address: 'Jalan Kuala Kangsar, 30000 Ipoh', phone: '05-255 8000', email: 'info@ilpipoh.gov.my', status: 'active' } }),
    db.institution.create({ data: { name: 'Pusat Latihan Teknologi Tinggi Swasta', code: 'PLTT-SW', type: 'Swasta', address: 'Cyberjaya, 63000 Selangor', phone: '03-8311 9000', email: 'admin@plttsw.edu.my', status: 'active' } }),
    db.institution.create({ data: { name: 'Institut Kemahiran MARA Johor Bahru', code: 'IKM-JB', type: 'IKM', address: 'Skudai, 81300 Johor Bahru', phone: '07-555 4000', email: 'info@ikmjb.gov.my', status: 'active' } }),
  ])

  // ---------- CAMPUSES ----------
  const campuses = await Promise.all([
    db.campus.create({ data: { institutionId: institutions[0].id, name: 'Kampus Utama Sentul', address: 'Jalan Sentul' } }),
    db.campus.create({ data: { institutionId: institutions[0].id, name: 'Kampus Cawangan Gombak', address: 'Gombak' } }),
    db.campus.create({ data: { institutionId: institutions[1].id, name: 'Kampus Utama Shah Alam', address: 'Shah Alam' } }),
    db.campus.create({ data: { institutionId: institutions[2].id, name: 'Kampus Bukit Beruang', address: 'Melaka' } }),
    db.campus.create({ data: { institutionId: institutions[3].id, name: 'Kampus Ipoh Timur', address: 'Ipoh' } }),
    db.campus.create({ data: { institutionId: institutions[4].id, name: 'Kampus Cyberjaya', address: 'Cyberjaya' } }),
    db.campus.create({ data: { institutionId: institutions[5].id, name: 'Kampus Skudai', address: 'Skudai' } }),
    db.campus.create({ data: { institutionId: institutions[5].id, name: 'Kampus Pasir Gudang', address: 'Pasir Gudang' } }),
  ])

  // ---------- DEPARTMENTS ----------
  const departments = await Promise.all([
    db.department.create({ data: { name: 'Bahagian Kurikulum', code: 'BG-KUR' } }),
    db.department.create({ data: { name: 'Bahagian Pentauliahan', code: 'BG-PTL' } }),
    db.department.create({ data: { name: 'Bahagian Kualiti & Audit', code: 'BG-QA' } }),
    db.department.create({ data: { name: 'Bahagian Panel Pakar', code: 'BG-PP' } }),
  ])

  // ---------- ROLES ----------
  const roleDefs = [
    { code: 'SUPER_ADMIN', name: 'Super Administrator', description: 'Akses penuh sistem' },
    { code: 'ADMINISTRATOR', name: 'Administrator', description: 'Pentadbir sistem' },
    { code: 'PENARAH', name: 'Pengarah', description: 'Pengarah institusi - kelulusan akhir' },
    { code: 'TIMBALAN_PENARAH', name: 'Timbalan Pengarah', description: 'Semakan & kelulusan' },
    { code: 'BAHAGIAN_KURIKULUM', name: 'Ketua Bahagian Kurikulum', description: 'Pengurusan kurikulum' },
    { code: 'PEGAWAI_KURIKULUM', name: 'Pegawai Kurikulum', description: 'Cipta/edit kurikulum' },
    { code: 'PEGAWAI_PENTAULIAHAN', name: 'Pegawai Pentauliahan', description: 'Pentauliahan institusi' },
    { code: 'PEGAWAI_QA', name: 'Pegawai QA', description: 'Semakan kualiti' },
    { code: 'KETUA_PROGRAM', name: 'Ketua Program', description: 'Pengurusan program' },
    { code: 'KETUA_JABATAN', name: 'Ketua Jabatan', description: 'Semakan jabatan' },
    { code: 'PENSYARAH', name: 'Pensyarah', description: 'Pencipta WIM & CU' },
    { code: 'PANEL_INDUSTRI', name: 'Panel Industri', description: 'Penilaian industri' },
    { code: 'PANEL_AKADEMIK', name: 'Panel Akademik', description: 'Penilaian akademik' },
    { code: 'PANEL_PENILAI', name: 'Panel Penilai', description: 'Penilaian pentauliahan' },
    { code: 'AUDITOR', name: 'Auditor', description: 'Audit pematuhan' },
    { code: 'VIEWER', name: 'Viewer', description: 'Papar sahaja' },
    { code: 'GUEST', name: 'Tetamu', description: 'Akses terhad' },
  ]
  const roles = await Promise.all(roleDefs.map((r) => db.role.create({ data: r })))
  const roleByCode: any = Object.fromEntries(roles.map((r) => [r.code, r]))

  // ---------- PERMISSIONS ----------
  const permDefs = [
    { code: 'dashboard:view', name: 'Lihat Dashboard', module: 'dashboard' },
    { code: 'curriculum:create', name: 'Cipta Kurikulum', module: 'curriculum' },
    { code: 'curriculum:edit', name: 'Edit Kurikulum', module: 'curriculum' },
    { code: 'curriculum:approve', name: 'Lulus Kurikulum', module: 'curriculum' },
    { code: 'curriculum:view', name: 'Lihat Kurikulum', module: 'curriculum' },
    { code: 'noss:view', name: 'Lihat NOSS', module: 'noss' },
    { code: 'noss:manage', name: 'Urus NOSS', module: 'noss' },
    { code: 'wim:create', name: 'Cipta WIM', module: 'wim' },
    { code: 'wim:approve', name: 'Lulus WIM', module: 'wim' },
    { code: 'accreditation:apply', name: 'Mohon Pentauliahan', module: 'accreditation' },
    { code: 'accreditation:audit', name: 'Audit Pentauliahan', module: 'accreditation' },
    { code: 'expert:manage', name: 'Urus Panel Pakar', module: 'expert' },
    { code: 'document:upload', name: 'Muat Naik Dokumen', module: 'document' },
    { code: 'report:view', name: 'Lihat Laporan', module: 'report' },
    { code: 'user:manage', name: 'Urus Pengguna', module: 'user' },
    { code: 'audit:view', name: 'Lihat Audit Log', module: 'audit' },
    { code: 'ai:use', name: 'Guna AI', module: 'ai' },
  ]
  const perms = await Promise.all(permDefs.map((p) => db.permission.create({ data: p })))
  const permByCode: any = Object.fromEntries(perms.map((p) => [p.code, p]))

  for (const code of ['SUPER_ADMIN', 'ADMINISTRATOR']) {
    for (const p of perms) {
      await db.rolePermission.create({ data: { roleId: roleByCode[code].id, permissionId: p.id } })
    }
  }
  const grants: Record<string, string[]> = {
    PENARAH: ['dashboard:view', 'curriculum:view', 'curriculum:approve', 'noss:view', 'wim:approve', 'accreditation:audit', 'report:view'],
    TIMBALAN_PENARAH: ['dashboard:view', 'curriculum:view', 'curriculum:approve', 'noss:view', 'wim:approve', 'report:view'],
    BAHAGIAN_KURIKULUM: ['dashboard:view', 'curriculum:create', 'curriculum:edit', 'curriculum:approve', 'noss:manage', 'report:view'],
    PEGAWAI_KURIKULUM: ['dashboard:view', 'curriculum:create', 'curriculum:edit', 'noss:view', 'report:view'],
    PEGAWAI_PENTAULIAHAN: ['dashboard:view', 'accreditation:apply', 'accreditation:audit', 'report:view'],
    PEGAWAI_QA: ['dashboard:view', 'curriculum:view', 'noss:view', 'wim:approve', 'accreditation:audit', 'report:view'],
    KETUA_PROGRAM: ['dashboard:view', 'curriculum:create', 'curriculum:edit', 'noss:view', 'wim:create', 'report:view'],
    KETUA_JABATAN: ['dashboard:view', 'curriculum:view', 'curriculum:approve', 'noss:view', 'wim:approve', 'report:view'],
    PENSYARAH: ['dashboard:view', 'curriculum:create', 'noss:view', 'wim:create', 'document:upload', 'ai:use'],
    PANEL_INDUSTRI: ['dashboard:view', 'curriculum:view', 'noss:view'],
    PANEL_AKADEMIK: ['dashboard:view', 'curriculum:view', 'noss:view'],
    PANEL_PENILAI: ['dashboard:view', 'curriculum:view', 'noss:view', 'accreditation:audit'],
    AUDITOR: ['dashboard:view', 'curriculum:view', 'noss:view', 'accreditation:audit', 'audit:view', 'report:view'],
    VIEWER: ['dashboard:view', 'curriculum:view', 'noss:view', 'report:view'],
    GUEST: ['dashboard:view'],
  }
  for (const [roleCode, permCodes] of Object.entries(grants)) {
    const role = roleByCode[roleCode]
    if (!role) continue
    for (const pc of permCodes) {
      const p = permByCode[pc]
      if (p) await db.rolePermission.create({ data: { roleId: role.id, permissionId: p.id } }).catch(() => {})
    }
  }

  // ---------- USERS (40) ----------
  const pwd = hashPassword('Spkp@2026')
  const usersData = [
    { fullName: 'Dr. Ahmad Faizal bin Rahman', email: 'admin@spkp-jtm.gov.my', roleCode: 'SUPER_ADMIN', inst: null, dept: 'BG-KUR' },
    { fullName: 'Siti Nurhaliza binti Abdul Aziz', email: 'sysadmin@spkp-jtm.gov.my', roleCode: 'ADMINISTRATOR', inst: null, dept: 'BG-KUR' },
    { fullName: 'Haji Ismail bin Ibrahim', email: 'pengarah@ikbnkl.gov.my', roleCode: 'PENARAH', inst: 0, dept: null },
    { fullName: 'Lim Chee Wah', email: 'tpengarah@ikbnkl.gov.my', roleCode: 'TIMBALAN_PENARAH', inst: 0, dept: null },
    { fullName: 'Rajesh a/l Kumar', email: 'pengarah@atcsa.gov.my', roleCode: 'PENARAH', inst: 1, dept: null },
    { fullName: 'Noraini binti Othman', email: 'tpengarah@atcsa.gov.my', roleCode: 'TIMBALAN_PENARAH', inst: 1, dept: null },
    { fullName: 'Tan Boon Hui', email: 'bkurikulum@spkp-jtm.gov.my', roleCode: 'BAHAGIAN_KURIKULUM', inst: null, dept: 'BG-KUR' },
    { fullName: 'Fatimah binti Yusof', email: 'pegkur1@ikbnkl.gov.my', roleCode: 'PEGAWAI_KURIKULUM', inst: 0, dept: 'BG-KUR' },
    { fullName: 'Mohd Hafiz bin Roslan', email: 'pegkur2@atcsa.gov.my', roleCode: 'PEGAWAI_KURIKULUM', inst: 1, dept: 'BG-KUR' },
    { fullName: 'Priya d/o Subramaniam', email: 'pegkur3@ilpipoh.gov.my', roleCode: 'PEGAWAI_KURIKULUM', inst: 3, dept: 'BG-KUR' },
    { fullName: 'Cheah Kah Mun', email: 'pegptl1@spkp-jtm.gov.my', roleCode: 'PEGAWAI_PENTAULIAHAN', inst: null, dept: 'BG-PTL' },
    { fullName: 'Wong Pei Ling', email: 'pegptl2@spkp-jtm.gov.my', roleCode: 'PEGAWAI_PENTAULIAHAN', inst: null, dept: 'BG-PTL' },
    { fullName: 'Azhar bin Mahmood', email: 'pegqa1@spkp-jtm.gov.my', roleCode: 'PEGAWAI_QA', inst: null, dept: 'BG-QA' },
    { fullName: 'Kavitha d/o Raju', email: 'pegqa2@spkp-jtm.gov.my', roleCode: 'PEGAWAI_QA', inst: null, dept: 'BG-QA' },
    { fullName: 'Khairul Anuar bin Zaki', email: 'ketuaprog1@ikbnkl.gov.my', roleCode: 'KETUA_PROGRAM', inst: 0, dept: null },
    { fullName: 'Nurul Aini binti Hassan', email: 'ketuaprog2@atcsa.gov.my', roleCode: 'KETUA_PROGRAM', inst: 1, dept: null },
    { fullName: 'Ganesh a/l Muthu', email: 'ketuaprog3@kkbb.edu.my', roleCode: 'KETUA_PROGRAM', inst: 2, dept: null },
    { fullName: 'Faridah binti Salleh', email: 'ketuajab1@ikbnkl.gov.my', roleCode: 'KETUA_JABATAN', inst: 0, dept: null },
    { fullName: 'Zulkifli bin Ahmad', email: 'ketuajab2@atcsa.gov.my', roleCode: 'KETUA_JABATAN', inst: 1, dept: null },
    { fullName: 'Pensyarah Siti Aishah', email: 'pensyarah1@ikbnkl.gov.my', roleCode: 'PENSYARAH', inst: 0, dept: null },
    { fullName: 'Pensyarah Roslan bin Md Nor', email: 'pensyarah2@ikbnkl.gov.my', roleCode: 'PENSYARAH', inst: 0, dept: null },
    { fullName: 'Pensyarah Mei Ling', email: 'pensyarah3@atcsa.gov.my', roleCode: 'PENSYARAH', inst: 1, dept: null },
    { fullName: 'Pensyarah Ariffin', email: 'pensyarah4@atcsa.gov.my', roleCode: 'PENSYARAH', inst: 1, dept: null },
    { fullName: 'Pensyarah Devi', email: 'pensyarah5@kkbb.edu.my', roleCode: 'PENSYARAH', inst: 2, dept: null },
    { fullName: 'Pensyarah Hafizuddin', email: 'pensyarah6@ilpipoh.gov.my', roleCode: 'PENSYARAH', inst: 3, dept: null },
    { fullName: 'Pensyarah Khadijah', email: 'pensyarah7@ikmjb.gov.my', roleCode: 'PENSYARAH', inst: 5, dept: null },
    { fullName: 'Pensyarah Kar Weng', email: 'pensyarah8@plttsw.edu.my', roleCode: 'PENSYARAH', inst: 4, dept: null },
    { fullName: 'Encik Tan Industry Panel', email: 'panel.industri1@spkp-jtm.gov.my', roleCode: 'PANEL_INDUSTRI', inst: null, dept: null },
    { fullName: 'Puan Lim Industry Panel', email: 'panel.industri2@spkp-jtm.gov.my', roleCode: 'PANEL_INDUSTRI', inst: null, dept: null },
    { fullName: 'Prof. Dr. Rahmat Akademik', email: 'panel.akademik1@spkp-jtm.gov.my', roleCode: 'PANEL_AKADEMIK', inst: null, dept: null },
    { fullName: 'Prof. Madya Susila Akademik', email: 'panel.akademik2@spkp-jtm.gov.my', roleCode: 'PANEL_AKADEMIK', inst: null, dept: null },
    { fullName: 'Encik Penilai Awal', email: 'panel.penilai1@spkp-jtm.gov.my', roleCode: 'PANEL_PENILAI', inst: null, dept: null },
    { fullName: 'Puan Penilai Kedua', email: 'panel.penilai2@spkp-jtm.gov.my', roleCode: 'PANEL_PENILAI', inst: null, dept: null },
    { fullName: 'Auditor Siva', email: 'auditor1@spkp-jtm.gov.my', roleCode: 'AUDITOR', inst: null, dept: 'BG-QA' },
    { fullName: 'Auditor Maria', email: 'auditor2@spkp-jtm.gov.my', roleCode: 'AUDITOR', inst: null, dept: 'BG-QA' },
    { fullName: 'Auditor Hafiz', email: 'auditor3@spkp-jtm.gov.my', roleCode: 'AUDITOR', inst: null, dept: 'BG-QA' },
    { fullName: 'Viewer Azman', email: 'viewer1@spkp-jtm.gov.my', roleCode: 'VIEWER', inst: null, dept: null },
    { fullName: 'Viewer Janet', email: 'viewer2@spkp-jtm.gov.my', roleCode: 'VIEWER', inst: null, dept: null },
    { fullName: 'Guest User Demo', email: 'guest@spkp-jtm.gov.my', roleCode: 'GUEST', inst: null, dept: null },
    { fullName: 'Pensyarah Additional', email: 'pensyarah9@ikmjb.gov.my', roleCode: 'PENSYARAH', inst: 5, dept: null },
  ]
  const users: any[] = []
  for (let i = 0; i < usersData.length; i++) {
    const u = usersData[i]
    const dept = u.dept ? departments.find((d) => d.code === u.dept) : null
    const inst = u.inst !== null ? institutions[u.inst] : null
    const campus = inst ? campuses.filter((c) => c.institutionId === inst.id)[0] : null
    const user = await db.user.create({
      data: {
        email: u.email,
        passwordHash: pwd,
        fullName: u.fullName,
        icNumber: '900101-14-55' + String(60 + i).slice(-2),
        staffId: 'STF' + String(1000 + i).padStart(4, '0'),
        institutionId: inst?.id || null,
        campusId: campus?.id || null,
        departmentId: dept?.id || null,
        phone: '+6012-345 6' + String(700 + i).slice(-4),
        status: 'active',
        mfaEnabled: ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(u.roleCode),
      },
    })
    await db.userRole.create({ data: { userId: user.id, roleId: roleByCode[u.roleCode].id } })
    users.push(user)
  }
  const userByEmail: any = Object.fromEntries(users.map((u) => [u.email, u]))

  // ---------- NOSS LIBRARY (25) ----------
  const nossDefs = [
    { nossCode: 'EE-010-3:2020', title: 'Pendawaian Elektrik Domestik & Komersial', sector: 'Elektrik', level: '3', version: '2020', year: 2020 },
    { nossCode: 'EE-021-3:2021', title: 'Pemasangan & Penyelenggaraan Motor Elektrik', sector: 'Elektrik', level: '3', version: '2021', year: 2021 },
    { nossCode: 'MM-034-4:2021', title: 'Reka Bentuk Multimedia Interaktif', sector: 'Multimedia', level: '4', version: '2021', year: 2021 },
    { nossCode: 'AM-021-3:2019', title: 'Penyelenggaraan Enjin & Sistem Automotif', sector: 'Automotif', level: '3', version: '2019', year: 2019 },
    { nossCode: 'IT-001-3:2022', title: 'Pembangunan Aplikasi Web', sector: 'IT', level: '3', version: '2022', year: 2022 },
    { nossCode: 'IT-020-4:2022', title: 'Pentadbiran Sistem & Rangkaian', sector: 'IT', level: '4', version: '2022', year: 2022 },
    { nossCode: 'AC-012-2:2020', title: 'Pemasangan Sistem Penyaman Udara', sector: 'Penyaman Udara', level: '2', version: '2020', year: 2020 },
    { nossCode: 'WM-005-3:2021', title: 'Pengelasan Logam (Welding)', sector: 'Pengelasan', level: '3', version: '2021', year: 2021 },
    { nossCode: 'MK-011-3:2020', title: 'Pemesinan Konvensional & CNC', sector: 'Pemesinan', level: '3', version: '2020', year: 2020 },
    { nossCode: 'BC-002-3:2019', title: 'Pembinaan & Kerja Struktur', sector: 'Pembinaan', level: '3', version: '2019', year: 2019 },
    { nossCode: 'PL-007-2:2020', title: 'Pemasangan Paip & Sanitari', sector: 'Plumbing', level: '2', version: '2020', year: 2020 },
    { nossCode: 'TX-015-3:2021', title: 'Pengeluaran Produk Tekstil', sector: 'Tekstil', level: '3', version: '2021', year: 2021 },
    { nossCode: 'CK-009-3:2020', title: 'Penyediaan Kulinari', sector: 'Kulinari', level: '3', version: '2020', year: 2020 },
    { nossCode: 'BT-022-4:2022', title: 'Pengurusan Perniagaan Runcit', sector: 'Perniagaan', level: '4', version: '2022', year: 2022 },
    { nossCode: 'PH-018-3:2021', title: 'Fotografi & Pengeluaran Video', sector: 'Media Kreatif', level: '3', version: '2021', year: 2021 },
    { nossCode: 'EC-006-2:2020', title: 'Pemasangan Litar Elektronik', sector: 'Elektronik', level: '2', version: '2020', year: 2020 },
    { nossCode: 'FM-024-3:2022', title: 'Pembuatan Perabot Kayu', sector: 'Perabot', level: '3', version: '2022', year: 2022 },
    { nossCode: 'AG-013-2:2019', title: 'Pengurusan Ladang & Tanaman', sector: 'Pertanian', level: '2', version: '2019', year: 2019 },
    { nossCode: 'HS-030-3:2021', title: 'Pengurusan Hos & Perkhidmatan Pelanggan', sector: 'Hospitaliti', level: '3', version: '2021', year: 2021 },
    { nossCode: 'LG-019-3:2020', title: 'Reka Bentuk Grafik & Animasi 2D', sector: 'Media Kreatif', level: '3', version: '2020', year: 2020 },
    { nossCode: 'MN-008-4:2022', title: 'Pengurusan Pembuatan Berskala', sector: 'Pembuatan', level: '4', version: '2022', year: 2022 },
    { nossCode: 'EL-040-5:2023', title: 'Kejuruteraan Sistem Elektrik', sector: 'Elektrik', level: '5', version: '2023', year: 2023 },
    { nossCode: 'CS-027-3:2021', title: 'Pembersihan & Penyelenggaraan Bangunan', sector: 'Penyelenggaraan', level: '3', version: '2021', year: 2021 },
    { nossCode: 'RB-033-2:2020', title: 'Penyelenggaraan Jentera Pembinaan', sector: 'Jentera Berat', level: '2', version: '2020', year: 2020 },
    { nossCode: 'BS-041-4:2022', title: 'Pematuhan & Audit Keselamatan', sector: 'Keselamatan', level: '4', version: '2022', year: 2022 },
  ]
  const nossLibs = await Promise.all(
    nossDefs.map((n) =>
      db.nossLibrary.create({
        data: {
          nossCode: n.nossCode,
          title: n.title,
          sector: n.sector,
          level: n.level,
          version: n.version,
          publishedYear: n.year,
          status: 'active',
          description: `Piawaian kemahiran kebangsaan untuk ${n.title} pada tahap ${n.level}.`,
        },
      })
    )
  )

  const nossCus: any[] = []
  for (const n of nossLibs) {
    const cuCount = 3 + (n.level ? parseInt(n.level) % 3 : 1)
    for (let i = 1; i <= cuCount; i++) {
      const cu = await db.nossCu.create({
        data: {
          nossId: n.id,
          cuCode: `${n.nossCode.split(':')[0]}-CU${String(i).padStart(2, '0')}`,
          title: `Unit Kompetensi ${i} - ${n.title}`,
          learningOutcome: `Pelajar dapat menguasai kemahiran asas ${n.title} bahagian ${i}.`,
          performanceCriteria: `1. Identifikasi keperluan teknikal\n2. Sediakan peralatan\n3. Laksanakan tugasan mengikut SOP\n4. Semak kualiti output`,
        },
      })
      nossCus.push(cu)
    }
  }

  // ---------- PROGRAMS (15) ----------
  const programDefs = [
    { code: 'DTE-2024', name: 'Diploma Teknologi Elektrik', nossCode: 'EE-010-3:2020', inst: 0, status: 'approved', level: 'Diploma', credit: 90, dur: 36, creator: 'pegkur1@ikbnkl.gov.my' },
    { code: 'DMM-2024', name: 'Diploma Multimedia Kreatif', nossCode: 'MM-034-4:2021', inst: 1, status: 'review', level: 'Diploma', credit: 100, dur: 36, creator: 'pegkur2@atcsa.gov.my' },
    { code: 'DAT-2024', name: 'Diploma Teknologi Automotif', nossCode: 'AM-021-3:2019', inst: 2, status: 'draft', level: 'Diploma', credit: 88, dur: 30, creator: 'ketuaprog3@kkbb.edu.my' },
    { code: 'DIT-2024', name: 'Diploma Pembangunan Aplikasi Web', nossCode: 'IT-001-3:2022', inst: 1, status: 'approved', level: 'Diploma', credit: 95, dur: 36, creator: 'pegkur2@atcsa.gov.my' },
    { code: 'STE-2024', name: 'Sijil Teknologi Elektrik', nossCode: 'EE-010-3:2020', inst: 0, status: 'approved', level: 'Sijil', credit: 50, dur: 24, creator: 'pegkur1@ikbnkl.gov.my' },
    { code: 'DWM-2024', name: 'Diploma Pengelasan Logam', nossCode: 'WM-005-3:2021', inst: 3, status: 'review', level: 'Diploma', credit: 80, dur: 30, creator: 'pegkur3@ilpipoh.gov.my' },
    { code: 'DMK-2024', name: 'Diploma Pemesinan CNC', nossCode: 'MK-011-3:2020', inst: 0, status: 'approved', level: 'Diploma', credit: 85, dur: 30, creator: 'pegkur1@ikbnkl.gov.my' },
    { code: 'DCK-2024', name: 'Diploma Kulinari', nossCode: 'CK-009-3:2020', inst: 5, status: 'approved', level: 'Diploma', credit: 78, dur: 24, creator: 'ketuaprog3@kkbb.edu.my' },
    { code: 'DGD-2024', name: 'Diploma Reka Bentuk Grafik', nossCode: 'LG-019-3:2020', inst: 1, status: 'approved', level: 'Diploma', credit: 82, dur: 30, creator: 'pegkur2@atcsa.gov.my' },
    { code: 'DAC-2024', name: 'Diploma Penyaman Udara', nossCode: 'AC-012-2:2020', inst: 2, status: 'draft', level: 'Diploma', credit: 70, dur: 24, creator: 'ketuaprog3@kkbb.edu.my' },
    { code: 'DPL-2024', name: 'Diploma Plumbing Domestik', nossCode: 'PL-007-2:2020', inst: 3, status: 'review', level: 'Diploma', credit: 65, dur: 24, creator: 'pegkur3@ilpipoh.gov.my' },
    { code: 'DBT-2024', name: 'Diploma Pengurusan Perniagaan', nossCode: 'BT-022-4:2022', inst: 4, status: 'approved', level: 'Diploma Lanjutan', credit: 110, dur: 36, creator: 'pensyarah8@plttsw.edu.my' },
    { code: 'SPH-2024', name: 'Sijil Fotografi Digital', nossCode: 'PH-018-3:2021', inst: 1, status: 'approved', level: 'Sijil', credit: 45, dur: 18, creator: 'pegkur2@atcsa.gov.my' },
    { code: 'DHS-2024', name: 'Diploma Hospitaliti & Perkhidmatan', nossCode: 'HS-030-3:2021', inst: 5, status: 'review', level: 'Diploma', credit: 75, dur: 24, creator: 'ketuaprog3@kkbb.edu.my' },
    { code: 'SEC-2024', name: 'Sijil Elektronik Asas', nossCode: 'EC-006-2:2020', inst: 0, status: 'draft', level: 'Sijil', credit: 40, dur: 18, creator: 'pegkur1@ikbnkl.gov.my' },
  ]
  const programs: any[] = []
  for (const p of programDefs) {
    const creator = userByEmail[p.creator]
    const prog = await db.program.create({
      data: {
        institutionId: institutions[p.inst].id,
        code: p.code,
        name: p.name,
        nossCode: p.nossCode,
        level: p.level,
        totalCredit: p.credit,
        durationMonth: p.dur,
        description: `Program ${p.name} menepati piawaian NOSS ${p.nossCode} bagi menghasilkan tenaga kerja mahir.`,
        status: p.status,
        version: 1,
        createdById: creator.id,
      },
    })
    programs.push(prog)
    const courseCount = 3 + (p.credit % 3)
    for (let c = 1; c <= courseCount; c++) {
      const course = await db.course.create({
        data: {
          programId: prog.id,
          code: `${p.code}-C${c}`,
          name: `Kursus ${c} - Modul Teras ${p.name}`,
          creditHour: 3 + (c % 3),
          semester: c,
        },
      })
      for (let m = 1; m <= 2; m++) {
        await db.module.create({
          data: {
            courseId: course.id,
            code: `${course.code}-M${m}`,
            name: `Modul ${m} ${course.name}`,
            hours: 30 + m * 5,
          },
        })
      }
    }
  }

  // ---------- COMPETENCY UNITS (120) ----------
  const cuTemplates = [
    { lo: 'Merancang sistem pendawaian', pc: '1. Tafsir pelan\n2. Pilih wayar\n3. Pasang', k: 'Teori litar', s: 'Pemasangan', a: 'Disiplin keselamatan', tools: 'Multimeter, Wayar, Pemutus' },
    { lo: 'Memasang litar kawalan', pc: '1. Baca pelan\n2. Pasang komponen\n3. Uji', k: 'Litar kawalan', s: 'Pemasangan', a: 'Ketelitian', tools: 'Tester, Screwdriver' },
    { lo: 'Menyelenggara motor elektrik', pc: '1. Diagnosis kerosakan\n2. Baiki\n3. Uji prestasi', k: 'Motor DC/AC', s: 'Penyelenggaraan', a: 'Sabar & teliti', tools: 'Ohmmeter, Bearing Puller' },
    { lo: 'Membangunkan laman web', pc: '1. Reka UI\n2. Kod HTML/CSS/JS\n3. Deploy', k: 'HTML, CSS, JS', s: 'Pengaturcaraan', a: 'Kreativiti', tools: 'VS Code, Browser' },
    { lo: 'Mereka bentuk grafik digital', pc: '1. Sketsa\n2. Vector\n3. Eksport', k: 'Teori warna', s: 'Reka bentuk', a: 'Estetik', tools: 'Illustrator, Photoshop' },
  ]
  for (const prog of programs) {
    for (let i = 1; i <= 8; i++) {
      const tmpl = cuTemplates[i % cuTemplates.length]
      const cu = await db.competencyUnit.create({
        data: {
          programId: prog.id,
          cuCode: `${prog.code}-CU${String(i).padStart(2, '0')}`,
          title: `Unit Kompetensi ${i} - ${prog.name}`,
          learningOutcome: tmpl.lo,
          performanceCriteria: tmpl.pc,
          knowledge: tmpl.k,
          skill: tmpl.s,
          attitude: tmpl.a,
          toolsEquipment: tmpl.tools,
          creditHour: 2 + (i % 3),
          version: 1,
          status: prog.status === 'approved' ? 'approved' : 'draft',
        },
      })
      for (let l = 1; l <= 2; l++) {
        await db.learningOutcome.create({
          data: { cuId: cu.id, code: `LO${l}`, description: `${tmpl.lo} - Bahagian ${l}`, band: 1 + (l % 3) },
        })
      }
      const matchingNoss = nossLibs.find((n) => n.nossCode === prog.nossCode)
      if (matchingNoss) {
        const nossCu = await db.nossCu.findFirst({ where: { nossId: matchingNoss.id } })
        if (nossCu) {
          await db.nossMapping.create({
            data: { cuId: cu.id, nossCuId: nossCu.id, confidenceScore: 70 + (i % 30) },
          })
        }
      }
    }
    for (let c = 1; c <= 2; c++) {
      await db.coCU.create({
        data: {
          programId: prog.id,
          code: `${prog.code}-CO${c}`,
          name: c === 1 ? 'Kelab Kemahiran & Kepimpinan' : 'Sukan & Kokurikulum',
          hours: 30,
          category: c === 1 ? 'Kelab' : 'Sukan',
        },
      })
    }
  }

  // ---------- WIM DOCUMENTS (60) ----------
  const wimSheetTypes = ['Assignment Sheet', 'Information Sheet', 'Work Sheet', 'Job Sheet', 'Operation Sheet']
  for (let i = 0; i < 60; i++) {
    const prog = programs[i % programs.length]
    const cus = await db.competencyUnit.findMany({ where: { programId: prog.id } })
    if (cus.length === 0) continue
    const cu = cus[i % cus.length]
    const author = i % 2 === 0 ? userByEmail['pensyarah1@ikbnkl.gov.my'] : userByEmail['pensyarah3@atcsa.gov.my']
    const sheetType = wimSheetTypes[i % wimSheetTypes.length]
    const st = i < 20 ? 'approved' : i < 40 ? 'review' : ['draft', 'review', 'approved', 'rejected'][i % 4]
    await db.wimDocument.create({
      data: {
        programId: prog.id,
        cuId: cu.id,
        authorId: author.id,
        code: `WIM-${prog.code}-${String(i + 1).padStart(3, '0')}`,
        title: `${sheetType} - ${cu.title}`,
        sheetType,
        content: `# ${sheetType}\n\n## Tajuk: ${cu.title}\n\n### Objektif\n${cu.learningOutcome}\n\n### Arahan\n1. Baca arahan dengan teliti\n2. Sediakan peralatan: ${cu.toolsEquipment}\n3. Lakukan tugasan mengikut prosedur\n4. Rekod keputusan\n\n### Kriteria Penilaian\n${cu.performanceCriteria}\n\n### Soalan\n1. Huraikan langkah keselamatan sebelum memulakan kerja.\n2. Terangkan fungsi setiap alat yang digunakan.\n3. Demonstrasi prosedur yang betul.`,
        rubric: [
          { band: 4, desc: 'Cemerlang - semua kriteria dipenuhi', score: 90 },
          { band: 3, desc: 'Baik - kebanyakan kriteria dipenuhi', score: 75 },
          { band: 2, desc: 'Memuaskan - kriteria asas dipenuhi', score: 60 },
          { band: 1, desc: 'Lemah - perlu penambahbaikan', score: 40 },
        ],
        answerScheme: 'Skema jawapan: 1. [Penjelasan keselamatan] 2. [Fungsi alat] 3. [Prosedur demonstrasi]',
        status: st,
        version: 1,
        isAiGenerated: i % 5 === 0,
      },
    })
  }

  // ---------- WIM TEMPLATES ----------
  const wimTemplates = [
    { name: 'Template Assignment Sheet Standard', sheetType: 'Assignment Sheet', content: '# ASSIGNMENT SHEET\n\n## Tajuk\n## Objektif\n## Arahan\n## Kriteria Penilaian', category: 'Standard' },
    { name: 'Template Job Sheet Automotif', sheetType: 'Job Sheet', content: '# JOB SHEET - AUTOMOTIF\n## Tajuk\n## Peralatan\n## Prosedur\n## Semakan Kualiti', category: 'Automotif' },
    { name: 'Template Operation Sheet Elektrik', sheetType: 'Operation Sheet', content: '# OPERATION SHEET - ELEKTRIK\n## Tajuk\n## Peralatan Keselamatan\n## Prosedur Langkah Demi Langkah\n## Pengujian', category: 'Elektrik' },
    { name: 'Template Information Sheet IT', sheetType: 'Information Sheet', content: '# INFORMATION SHEET - IT\n## Konsep\n## Definisi\n## Contoh Kod\n## Rujukan', category: 'IT' },
    { name: 'Template Work Sheet Multimedia', sheetType: 'Work Sheet', content: '# WORK SHEET - MULTIMEDIA\n## Tajuk\n## Bahan Rujukan\n## Langkah Kerja\n## Hasil Kerja', category: 'Multimedia' },
  ]
  for (const t of wimTemplates) {
    await db.wimTemplate.create({ data: t })
  }

  // ---------- EXPERTS (20) ----------
  const expertDefs = [
    { name: 'Ir. Dr. Kamaludin bin Mohd', cat: 'Industri', area: 'Electrical Engineering', org: 'TNB Research Sdn Bhd', exp: 22 },
    { name: 'Puan Sarala d/o Krishnan', cat: 'Akademik', area: 'Multimedia Design', org: 'Universiti Teknologi Malaysia', exp: 18 },
    { name: 'Encik Frankie Tan', cat: 'Industri', area: 'Automotive Technology', org: 'UMW Toyota Motor Sdn Bhd', exp: 25 },
    { name: 'Prof. Dr. Wong Chee Keong', cat: 'Akademik', area: 'Computer Science', org: 'Universiti Malaya', exp: 30 },
    { name: 'Puan Nor Azlina binti Ali', cat: 'Penilai', area: 'Quality Assurance', org: 'SIRIM Berhad', exp: 20 },
    { name: 'Encik Suresh a/l Maniam', cat: 'Industri', area: 'Welding & Fabrication', org: 'Petronas Penapisan Melaka', exp: 19 },
    { name: 'Dr. Hazim bin Hashim', cat: 'Akademik', area: 'CNC Machining', org: 'Politeknik Sultan Salahuddin', exp: 16 },
    { name: 'Chef Ismail bin Ahmad', cat: 'Industri', area: 'Culinary Arts', org: 'Mandarin Oriental KL', exp: 24 },
    { name: 'Puan Lily Cheah', cat: 'Penilai', area: 'Graphic Design', org: 'Limkokwing University', exp: 15 },
    { name: 'Encik Raj a/l Murugan', cat: 'Industri', area: 'Air-Cond & Refrigeration', org: 'Daikin Malaysia', exp: 17 },
    { name: 'Dr. Siti Khadijah binti Ali', cat: 'Akademik', area: 'Business Management', org: 'Universiti Utara Malaysia', exp: 21 },
    { name: 'Encik Tan Hock Seng', cat: 'Penilai', area: 'Plumbing & Sanitary', org: 'IATS Malaysia', exp: 14 },
    { name: 'Puan Mariam binti Yusof', cat: 'Industri', area: 'Hospitality Management', org: 'Hilton Kuala Lumpur', exp: 23 },
    { name: 'Encik Ganesan a/l Suppiah', cat: 'Industri', area: 'Construction & Structure', org: 'IJM Corporation', exp: 26 },
    { name: 'Prof. Madya Dr. Roslan', cat: 'Akademik', area: 'Electronics', org: 'Universiti Sains Malaysia', exp: 19 },
    { name: 'Puan Anita binti Razak', cat: 'Penilai', area: 'Photography', org: 'Free Artist', exp: 12 },
    { name: 'Encik Faizal bin Omar', cat: 'Industri', area: 'Furniture Manufacturing', org: 'Poh Huat Resources', exp: 18 },
    { name: 'Dr. Norhayati binti Abdullah', cat: 'Akademik', area: 'Safety & Compliance', org: 'NIOSH Malaysia', exp: 20 },
    { name: 'Encik Steven Lim', cat: 'Industri', area: 'Heavy Machinery', org: 'Lhoist Malaysia', exp: 16 },
    { name: 'Puan Kamariah binti Man', cat: 'Penilai', area: 'Agriculture Tech', org: 'MARDI', exp: 22 },
  ]
  for (let i = 0; i < expertDefs.length; i++) {
    const e = expertDefs[i]
    await db.expert.create({
      data: {
        fullName: e.name,
        icNumber: '750101-08-12' + String(34 + i).slice(-2),
        email: `expert${i + 1}@external.my`,
        phone: '+6019-345 6' + String(700 + i).slice(-4),
        category: e.cat,
        expertiseArea: e.area,
        qualification: e.cat === 'Akademik' ? 'PhD' : e.cat === 'Penilai' ? 'MSc, Lead Auditor' : 'BSc, Professional Cert',
        experienceYear: e.exp,
        organization: e.org,
        availability: ['available', 'busy', 'unavailable'][i % 3],
        rating: 3.5 + (i % 5) * 0.3,
        totalSessions: 2 + (i % 8),
        status: 'active',
      },
    })
  }
  const experts = await db.expert.findMany()

  for (let i = 0; i < 15; i++) {
    const expert = experts[i % experts.length]
    const appt = await db.expertAppointment.create({
      data: {
        expertId: expert.id,
        assignerId: userByEmail['bkurikulum@spkp-jtm.gov.my'].id,
        purpose: ['Penilaian Kurikulum', 'Mesyuarat Panel Pakar', 'Penilaian WIM', 'Audit Pentauliahan'][i % 4],
        projectId: programs[i % programs.length].id,
        scheduledAt: new Date(Date.now() + (i - 5) * 86400000),
        durationHour: 2 + (i % 3),
        status: i < 8 ? 'completed' : 'scheduled',
        notes: 'Sesi penilaian rasmi mengikut jadual JTM.',
      },
    })
    await db.expertHonorarium.create({
      data: {
        appointmentId: appt.id,
        expertId: expert.id,
        amount: 500 + (i % 4) * 250,
        currency: 'MYR',
        status: i < 5 ? 'paid' : 'pending',
        paidAt: i < 5 ? new Date() : null,
      },
    })
    if (i < 10) {
      await db.expertEvaluation.create({
        data: {
          expertId: expert.id,
          targetType: ['curriculum', 'wim', 'accreditation'][i % 3],
          targetId: programs[i % programs.length].id,
          rating: 3 + (i % 3),
          recommendation: i % 2 === 0 ? 'Lulus dengan penambahbaikan minor' : 'Lulus sepenuhnya',
          comments: 'Penilaian teliti telah dijalankan. Kandungan memenuhi piawaian NOSS.',
        },
      })
    }
  }

  // ---------- ACCREDITATION APPLICATIONS (12) ----------
  const accredTypes = ['Penuh', 'Sementara', 'Pembaharuan']
  const accredStatuses = ['submitted', 'self_assessment', 'audit', 'review', 'approved', 'rejected', 'expired']
  for (let i = 0; i < 12; i++) {
    const inst = institutions[i % institutions.length]
    const prog = programs[i % programs.length]
    const applicant = userByEmail[['pegptl1@spkp-jtm.gov.my', 'pegptl2@spkp-jtm.gov.my'][i % 2]]
    const st = accredStatuses[i % accredStatuses.length]
    const approvedAt = st === 'approved' ? new Date(Date.now() - 30 * 86400000) : null
    const expiryDate = st === 'approved' ? new Date(Date.now() + (3 * 365 - 30) * 86400000) : null
    const auditDate = ['audit', 'review', 'approved', 'rejected'].includes(st) ? new Date(Date.now() - 15 * 86400000) : null

    const app = await db.accreditationApplication.create({
      data: {
        applicationCode: `PTL-2026-${String(i + 1).padStart(3, '0')}`,
        institutionId: inst.id,
        programId: prog.id,
        applicantId: applicant.id,
        type: accredTypes[i % 3],
        status: st,
        submittedAt: new Date(Date.now() - (45 - i * 3) * 86400000),
        auditDate,
        approvedAt,
        expiryDate,
        notes: st === 'rejected' ? 'Beberapa ketidakpatuhan dikenalpasti semasa audit.' : st === 'approved' ? 'Semua kriteria pematuhan dipenuhi.' : null,
      },
    })

    const checklistItems = [
      { item: 'Dokumen Kurikulum Lengkap', req: 'Versi kurikulum terkini dengan tandatangan digital' },
      { item: 'Pemetaan NOSS', req: 'Pemetaan CU kepada NOSS rasmi sekurang-kurangnya 80%' },
      { item: 'Kelayakan Pensyarah', req: 'Sijil pengajar TVET & pengalaman industri min 3 tahun' },
      { item: 'Kemudahan Latihan', req: 'Bengkel & makmal memenuhi nisbah 1:10' },
      { item: 'Bahan Pengajaran WIM', req: 'WIM bagi setiap CU dengan kelulusan rasmi' },
      { item: 'Sistem Penilaian', req: 'Rubrik & skema jawapan konsisten' },
      { item: 'Dasar Keselamatan', req: 'SOP keselamatan bengkel & rekod latihan' },
      { item: 'Pengurusan Kualiti', req: 'Dokumen kualiti ISO 9001 atau setara' },
    ]
    for (const c of checklistItems) {
      await db.complianceChecklist.create({
        data: {
          applicationId: app.id,
          item: c.item,
          requirement: c.req,
          isMet: i % 4 !== 0,
          remarks: i % 2 === 0 ? 'Bukti disahkan' : null,
        },
      })
    }

    if (auditDate) {
      const auditor = userByEmail[['auditor1@spkp-jtm.gov.my', 'auditor2@spkp-jtm.gov.my', 'auditor3@spkp-jtm.gov.my'][i % 3]]
      const audit = await db.auditSchedule.create({
        data: {
          applicationId: app.id,
          auditorId: auditor.id,
          scheduledAt: auditDate,
          location: inst.name,
          status: 'completed',
        },
      })
      const findingCats = ['Major', 'Minor', 'Observation']
      const severities = ['low', 'medium', 'high', 'critical']
      for (let f = 0; f < 3; f++) {
        await db.auditFinding.create({
          data: {
            auditId: audit.id,
            auditorId: auditor.id,
            category: findingCats[f % 3],
            description: `Temuan ${f + 1}: Kekurangan dokumentasi pada bahagian ${f + 1}.`,
            severity: severities[f % 4],
            correctiveAction: `Tindakan pembetulan: Lengkapkan dokumentasi dalam tempoh 30 hari.`,
            status: f === 0 ? 'resolved' : f === 1 ? 'in_progress' : 'open',
            dueDate: new Date(Date.now() + 30 * 86400000),
            resolvedAt: f === 0 ? new Date() : null,
          },
        })
      }
    }

    if (st === 'approved') {
      await db.certificate.create({
        data: {
          applicationId: app.id,
          certNumber: `SPL-JTM-${2026}-${String(i + 1).padStart(4, '0')}`,
          institutionName: inst.name,
          programName: prog.name,
          type: app.type,
          expiryDate: expiryDate!,
          status: 'active',
          signedBy: userByEmail['pengarah@ikbnkl.gov.my'].fullName,
        },
      })
    }
  }

  // ---------- WORKFLOW INSTANCES ----------
  const wims = await db.wimDocument.findMany({ take: 15 })
  const accreds = await db.accreditationApplication.findMany()
  const wfEntities: any[] = [
    ...programs.slice(0, 8).map((p) => ({ entityType: 'program', entityId: p.id, status: p.status })),
    ...wims.map((w) => ({ entityType: 'wim_document', entityId: w.id, status: w.status })),
    ...accreds.map((a) => ({ entityType: 'accreditation_application', entityId: a.id, status: a.status })),
  ]
  for (let i = 0; i < Math.min(50, wfEntities.length); i++) {
    const wf = wfEntities[i]
    const owner = [userByEmail['ketuajab1@ikbnkl.gov.my'], userByEmail['tpengarah@ikbnkl.gov.my'], userByEmail['bkurikulum@spkp-jtm.gov.my']][i % 3]
    const inst = await db.workflowInstance.create({
      data: {
        entityType: wf.entityType,
        entityId: wf.entityId,
        currentStatus: wf.status,
        currentOwnerId: owner.id,
        slaDueAt: new Date(Date.now() + (7 - (i % 14)) * 86400000),
        priority: ['low', 'normal', 'high', 'urgent'][i % 4],
      },
    })
    const transitions = [
      { from: null, to: 'draft', action: 'create' },
      { from: 'draft', to: 'review', action: 'submit' },
    ]
    if (['approved', 'rejected', 'archived'].includes(wf.status)) {
      transitions.push({ from: 'review', to: wf.status, action: wf.status === 'approved' ? 'approve' : wf.status === 'rejected' ? 'reject' : 'archive' })
    }
    for (const t of transitions) {
      await db.workflowTransition.create({
        data: {
          workflowId: inst.id,
          fromStatus: t.from,
          toStatus: t.to,
          action: t.action,
          actionById: owner.id,
          remarks: t.action === 'approve' ? 'Diluluskan selepas semakan rapi.' : t.action === 'reject' ? 'Berdasarkan ketidakpatuhan dikenalpasti.' : '',
        },
      })
    }
  }

  // ---------- DOCUMENTS (25) ----------
  const docCats = ['curriculum', 'wim', 'accreditation', 'certificate', 'general']
  const docTypes = ['pdf', 'docx', 'xlsx', 'image']
  for (let i = 0; i < 25; i++) {
    const doc = await db.document.create({
      data: {
        name: `Dokumen ${docCats[i % 5]} ${i + 1}.${docTypes[i % 4]}`,
        category: docCats[i % 5],
        module: ['M2', 'M4', 'M5', 'M6', 'M8'][i % 5],
        ownerId: userByEmail['pensyarah1@ikbnkl.gov.my'].id,
        fileType: docTypes[i % 4],
        fileSize: 102400 + i * 4096,
        description: 'Dokumen sokongan untuk modul berkaitan.',
        tags: ['rasmi', 'tvet', docCats[i % 5]].join(','),
        status: 'active',
      },
    })
    await db.documentVersion.create({
      data: {
        documentId: doc.id,
        version: 1,
        fileUrl: `/uploads/${doc.name}`,
        uploadedById: userByEmail['pensyarah1@ikbnkl.gov.my'].id,
        checksum: crypto.randomUUID().slice(0, 32),
      },
    })
  }

  // ---------- NOTIFICATIONS (100) ----------
  const notifTemplates = [
    { cat: 'workflow', title: 'Tugasan Baharu Menunggu Semakan', msg: 'Kurikulum DTE-2024 telah dihantar untuk semakan anda.' },
    { cat: 'workflow', title: 'Dokumen Ditolak', msg: 'WIM-WIM-2024-005 ditolak. Sila semak komen pemeriksa.' },
    { cat: 'workflow', title: 'Kelulusan Selesai', msg: 'Program DIT-2024 telah diluluskan.' },
    { cat: 'accreditation', title: 'Permohonan Pentauliahan Diterima', msg: 'Permohonan PTL-2026-001 telah diterima dan sedang diproses.' },
    { cat: 'accreditation', title: 'Audit Dijadualkan', msg: 'Audit pentauliahan dijadualkan pada 15 Ogos 2026.' },
    { cat: 'reminder', title: 'Sijil Hampir Tamat Tempoh', msg: 'Sijil SPL-JTM-2026-0001 akan tamat tempoh dalam 60 hari.' },
    { cat: 'reminder', title: 'Tugasan Tertunggak Melebihi SLA', msg: 'Tugasan semakan melebihi SLA 7 hari. Eskalasi kepada penyelia.' },
    { cat: 'system', title: 'Kemas Kini Sistem', msg: 'Sistem SPKP-JTM akan dikemas kini pada 20 Julai 2026, 02:00 pagi.' },
    { cat: 'ai', title: 'Draf AI Sedia untuk Semakan', msg: 'Draf WIM yang dijana AI sedia untuk semakan manusia.' },
  ]
  const notifUsers = users.slice(0, 20)
  for (let i = 0; i < 100; i++) {
    const tmpl = notifTemplates[i % notifTemplates.length]
    await db.notification.create({
      data: {
        userId: notifUsers[i % notifUsers.length].id,
        category: tmpl.cat,
        title: tmpl.title,
        message: tmpl.msg,
        isRead: i % 3 === 0,
        priority: ['low', 'normal', 'high'][i % 3],
        link: i % 2 === 0 ? '/dashboard' : null,
      },
    })
  }

  // ---------- SYSTEM SETTINGS ----------
  const settings = [
    { key: 'app.name', value: 'SPKP-JTM', category: 'general' },
    { key: 'app.version', value: '1.0.0', category: 'general' },
    { key: 'session.timeout', value: '3600', category: 'security' },
    { key: 'password.min_length', value: '10', category: 'security' },
    { key: 'password.expiry_days', value: '90', category: 'security' },
    { key: 'login.max_attempts', value: '5', category: 'security' },
    { key: 'workflow.default_sla_days', value: '7', category: 'workflow' },
    { key: 'ai.model', value: 'glm-5.2', category: 'ai' },
    { key: 'ai.disclaimer', value: 'Draf AI - Perlu Semakan Manusia', category: 'ai' },
    { key: 'cert.expiry_years', value: '3', category: 'accreditation' },
    { key: 'cert.reminder_days', value: '90,60,30', category: 'accreditation' },
  ]
  for (const s of settings) {
    await db.systemSetting.create({ data: s })
  }

  // ---------- AI GENERATION LOGS ----------
  for (let i = 0; i < 10; i++) {
    await db.aiGenerationLog.create({
      data: {
        userId: userByEmail['pensyarah1@ikbnkl.gov.my'].id,
        feature: ['wim_generator', 'curriculum_generator', 'rubric', 'chat', 'smart_search'][i % 5],
        input: { cu_id: 'sample', sheet_type: 'Assignment Sheet' },
        output: { draft: 'Draf WIM dijana...', disclaimer: 'Draf AI - Perlu Semakan Manusia' },
        model: 'glm-5.2',
        tokensUsed: 350 + i * 50,
      },
    })
  }

  // ---------- AUDIT LOGS ----------
  const auditActions = ['INSERT', 'UPDATE', 'DELETE']
  const tables = ['programs', 'competency_units', 'wim_documents', 'accreditation_applications', 'users']
  for (let i = 0; i < 30; i++) {
    await db.auditLog.create({
      data: {
        tableName: tables[i % tables.length],
        recordId: programs[i % programs.length].id,
        action: auditActions[i % 3],
        oldValues: i % 3 === 1 ? { status: 'draft' } : undefined,
        newValues: { status: ['review', 'approved', 'rejected'][i % 3], updated_at: new Date().toISOString() },
        performedById: userByEmail['admin@spkp-jtm.gov.my'].id,
        source: i % 4 === 0 ? 'AI_GENERATED' : 'user',
        ipAddress: '192.168.1.' + (100 + i),
      },
    })
  }

  // ---------- NOTIFICATION PREFERENCES ----------
  for (const u of users.slice(0, 10)) {
    await db.notificationPreference.create({
      data: { userId: u.id, emailEnabled: true, inAppEnabled: true, whatsappEnabled: u.email.includes('admin') || u.email.includes('pengarah'), pushEnabled: true },
    })
  }

  console.log('✅ Seeding complete!')
  console.log(`   - ${institutions.length} institutions`)
  console.log(`   - ${users.length} users (password: Spkp@2026)`)
  console.log(`   - ${programs.length} programs`)
  console.log(`   - ${nossLibs.length} NOSS libraries`)
  console.log(`   - ${experts.length} experts`)
  console.log(`   - ${roles.length} roles, ${perms.length} permissions`)
  console.log('\n🔐 Login credentials:')
  console.log('   Super Admin: admin@spkp-jtm.gov.my / Spkp@2026')
  console.log('   Pengarah: pengarah@ikbnkl.gov.my / Spkp@2026')
  console.log('   Pegawai Kurikulum: pegkur1@ikbnkl.gov.my / Spkp@2026')
  console.log('   Pensyarah: pensyarah1@ikbnkl.gov.my / Spkp@2026')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
