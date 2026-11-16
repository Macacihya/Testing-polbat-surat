import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Users
  const users = [
    {
      nip: "admin",
      nama: "Super Administrator (Dummy)",
      email: "admin@polibatam.ac.id",
      is_admin: true,
      unit: "Pusat Informasi & Komputer (P3M)",
      staff: "Tenaga Kependidikan",
      status_karyawan: "PNS",
    },
    {
      nip: "administrasi",
      nama: "Regina Administrasi, S.Sos (Dummy)",
      email: "administrasi@polibatam.ac.id",
      is_admin: true,
      unit: "Urusan Administrasi",
      staff: "Administrasi",
      status_karyawan: "PNS",
    },
    {
      nip: "dosen",
      nama: "Dr. Budi Santoso, M.Kom (Dummy)",
      email: "dosen@polibatam.ac.id",
      is_admin: false,
      unit: "Jurusan Teknik Informatika",
      staff: "Tenaga Pendidik",
      status_karyawan: "Dosen Tetap",
    },
    // Verifikator Tahap 1: Verifikasi Unit
    {
      nip: "198001012005",
      nama: "Ahmad Fauzi, M.T.",
      email: "ahmad@polibatam.ac.id",
      is_admin: false,
      unit: "Jurusan Teknik Elektro",
      staff: "Tenaga Pendidik",
      status_karyawan: "PNS",
    },
    // Verifikator Tahap 2: Verifikasi Bagian Umum
    {
      nip: "staff",
      nama: "Siti Rahmawati, S.tr.kom",
      email: "staff@polibatam.ac.id",
      is_admin: false,
      unit: "Bagian Umum & Keuangan",
      staff: "Tenaga Kependidikan",
      status_karyawan: "Pegawai Tetap",
    },
    // Verifikator Tahap 3: Verifikasi Pimpinan
    {
      nip: "197903032003",
      nama: "Hendra Wijaya, M.si.",
      email: "hendra@polibatam.ac.id",
      is_admin: false,
      unit: "Wakil Direktur I",
      staff: "Wakil Direktur",
      status_karyawan: "PNS",
    },
    {
      nip: "wadir",
      nama: "Dr. Ahmad Riyadi, S.T., M.T. (Wakil Direktur I)",
      email: "wadir@polibatam.ac.id",
      is_admin: false,
      unit: "Pimpinan Politeknik Negeri Batam",
      staff: "Wakil Direktur",
      status_karyawan: "PNS",
    },
    {
      nip: "direktur",
      nama: "Ir. Bambang Hendrawan, S.T., M.S.M., Ph.D. (Direktur)",
      email: "direktur@polibatam.ac.id",
      is_admin: false,
      unit: "Pimpinan Politeknik Negeri Batam",
      staff: "Direktur",
      status_karyawan: "PNS",
    },
  ];

  for (const u of users) {
    await prisma.tbm_user.upsert({
      where: { nip: u.nip },
      update: u,
      create: { id: u.nip, ...u },
    });
  }

  // 2. Units
  const units = [
    { name: "Pusat Informasi & Komputer (P3M)", leader_id: null },
    { name: "Jurusan Teknik Informatika", leader_id: "dosen" },
    { name: "Jurusan Teknik Elektro", leader_id: "198001012005" },
    { name: "Jurusan Teknik Mesin", leader_id: null },
    { name: "Jurusan Manajemen Bisnis", leader_id: null },
    { name: "Bagian Umum & Keuangan", leader_id: "staff" },
    { name: "Urusan Administrasi", leader_id: "administrasi" },
    { name: "Wakil Direktur I", leader_id: "wadir" },
    { name: "Pimpinan Politeknik Negeri Batam", leader_id: "direktur" },
  ];

  for (const u of units) {
    await prisma.tbm_unit.upsert({
      where: { name: u.name },
      update: { leader_id: u.leader_id },
      create: { name: u.name, leader_id: u.leader_id },
    });
  }

  // 3. Groups
  const groups = [
    { name: "Tim Pengembang Kurikulum", note: "Kelompok kerja kurikulum program studi" },
    { name: "Satgas MBKM Polibatam", note: "Tim pelaksana Merdeka Belajar Kampus Merdeka" },
    { name: "Panitia Yudisium & Wisuda", note: "Kepanitiaan acara wisuda tahun berjalan" },
  ];

  for (const g of groups) {
    const existing = await prisma.tbm_group.findFirst({ where: { name: g.name } });
    if (!existing) {
      await prisma.tbm_group.create({ data: g });
    }
  }

  // 4. Sample Notifications untuk Pengujian Notifikasi
  const notifications = [
    {
      user_id: "198001012005",
      title: "Tugas Verifikasi Unit (Tahap 1)",
      message: 'Pengajuan SK "Penetapan Dosen Pembimbing Tugas Akhir Semester Ganjil" menunggu peninjauan dan verifikasi Anda.',
      link: "/verification",
      is_read: false,
    },
    {
      user_id: "staff",
      title: "Tugas Verifikasi Bagian Umum (Tahap 2)",
      message: 'Pengajuan SK "Panitia Workshop Kurikulum OBE Jurusan Elektro" menunggu pemeriksaan administrasi Anda.',
      link: "/verification",
      is_read: false,
    },
    {
      user_id: "197903032003",
      title: "Tugas Verifikasi Pimpinan (Tahap 3)",
      message: 'Pengajuan SK "Kegiatan Seminar Nasional Applied Technology 2026" menunggu persetujuan akhir Wakil Direktur I.',
      link: "/verification",
      is_read: false,
    },
  ];

  for (const n of notifications) {
    const existing = await prisma.tbl_notification.findFirst({
      where: { user_id: n.user_id, title: n.title },
    });
    if (!existing) {
      await prisma.tbl_notification.create({ data: n });
    }
  }

  // 5. Master Tahapan Verifikasi & Verifikator
  const stages = [
    {
      id: 1,
      name: "Verifikasi Unit",
      description: "Verifikasi oleh Pimpinan Unit/Jurusan asal pengusul",
      is_by_unit: true,
      verifiers: ["198001012005"],
    },
    {
      id: 2,
      name: "Verifikasi Bagian Umum",
      description: "Verifikasi keabsahan berkas oleh Bagian Umum/Administrasi",
      is_by_unit: false,
      verifiers: ["staff", "administrasi"],
    },
    {
      id: 3,
      name: "Verifikasi Pimpinan",
      description: "Persetujuan dan pengesahan akhir oleh Pimpinan/Direktur",
      is_by_unit: false,
      verifiers: ["197903032003", "wadir", "direktur"],
    },
  ];

  for (const s of stages) {
    const { verifiers, ...stageData } = s;
    await prisma.tbm_verification_stage.upsert({
      where: { id: s.id },
      update: stageData,
      create: stageData,
    });

    for (const nip of verifiers) {
      const user = await prisma.tbm_user.findUnique({ where: { nip } });
      if (user) {
        await prisma.tbm_verification_stage_verifier.upsert({
          where: {
            stage_id_user_id: {
              stage_id: s.id,
              user_id: user.id,
            },
          },
          update: {},
          create: {
            stage_id: s.id,
            user_id: user.id,
          },
        });
      }
    }
  }

  // 6. Master Template Dokumen Surat
  const templates = [
    {
      code: "TPL-SK-PANITIA-01",
      title: "SK Pengangkatan Panitia Pelaksana Kegiatan",
      type: "SURAT_KEPUTUSAN",
      description: "Template standar pengangkatan susunan kepanitiaan kegiatan akademik/non-akademik di lingkungan Politeknik Negeri Batam.",
      filepath: "templates/submission-approved-template.docx",
      schema_fields: [
        { key: "nama_kegiatan", label: "Nama Kegiatan / Seminar", type: "text", required: true, placeholder: "Contoh: Seminar Nasional Applied Technology 2026" },
        { key: "tahun_anggaran", label: "Tahun Anggaran", type: "number", required: true, default: 2026 },
        { key: "tanggal_mulai", label: "Tanggal Mulai Pelaksanaan", type: "date", required: true },
        { key: "tanggal_selesai", label: "Tanggal Selesai Pelaksanaan", type: "date", required: true },
        { key: "lokasi", label: "Tempat / Lokasi Pelaksanaan", type: "text", required: true, placeholder: "Contoh: Auditorium Gedung Utama Polibatam" },
        { key: "ketua_panitia", label: "Nama Ketua Panitia", type: "text", required: true },
        { key: "sumber_dana", label: "Sumber Pendanaan", type: "select", options: ["DIPA Polibatam", "Mandiri / Swadana", "Kerjasama Industri / Sponsor"], required: true }
      ],
      is_active: true,
    },
    {
      code: "TPL-SK-PEMBIMBING-01",
      title: "SK Penetapan Dosen Pembimbing Tugas Akhir / Skripsi",
      type: "SURAT_KEPUTUSAN",
      description: "Template penugasan dosen pembimbing utama dan pendamping untuk tugas akhir mahasiswa.",
      filepath: "templates/submission-approved-template.docx",
      schema_fields: [
        { key: "semester", label: "Semester Akademik", type: "select", options: ["Ganjil", "Genap"], required: true },
        { key: "tahun_akademik", label: "Tahun Akademik", type: "text", required: true, placeholder: "Contoh: 2026/2027" },
        { key: "jurusan", label: "Jurusan", type: "text", required: true },
        { key: "program_studi", label: "Program Studi", type: "text", required: true }
      ],
      is_active: true,
    }
  ];

  for (const t of templates) {
    await prisma.tbm_template.upsert({
      where: { code: t.code },
      update: {
        title: t.title,
        type: t.type,
        description: t.description,
        filepath: t.filepath,
        schema_fields: t.schema_fields,
        is_active: t.is_active,
      },
      create: {
        code: t.code,
        title: t.title,
        type: t.type,
        description: t.description,
        filepath: t.filepath,
        schema_fields: t.schema_fields,
        is_active: t.is_active,
      },
    });
  }

  console.log("Seeding data dummy berhasil!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
