import prisma from "../../lib/prisma";
import { SubmissionStatus } from "../submission/submission.Schema";

class VerificationRepository {
  async GetStages() {
    const stages = await prisma.tbm_verification_stage.findMany({
      orderBy: { id: "asc" },
      include: {
        verifiers: {
          include: {
            user: true,
          },
        },
      },
    });

    return stages.map((s) => ({
      stage: s.id,
      name: s.name,
      description: s.description,
      is_by_unit: s.is_by_unit,
      verifiers: s.verifiers.map((v) => v.user).filter(Boolean),
    }));
  }

  async AddVerifier({ stage, nip }: { stage: number; nip: string }) {
    const user = await prisma.tbm_user.findFirst({
      where: {
        OR: [{ nip }, { id: nip }],
        is_deleted: false,
      },
    });

    if (!user) {
      throw new Error("Pegawai / Verifikator dengan NIP tersebut tidak ditemukan.");
    }

    const stageData = await prisma.tbm_verification_stage.findUnique({
      where: { id: Number(stage) },
    });

    if (!stageData) {
      throw new Error(`Tahap verifikasi ${stage} tidak ditemukan.`);
    }

    const existing = await prisma.tbm_verification_stage_verifier.findUnique({
      where: {
        stage_id_user_id: {
          stage_id: Number(stage),
          user_id: user.id,
        },
      },
    });

    if (existing) {
      throw new Error(`Verifikator ${user.nama} sudah terdaftar pada Tahap ${stage}.`);
    }

    await prisma.tbm_verification_stage_verifier.create({
      data: {
        stage_id: Number(stage),
        user_id: user.id,
      },
    });

    return {
      message: `Verifikator ${user.nama} berhasil ditambahkan ke Tahap ${stage}.`,
      user,
    };
  }

  async RemoveVerifier({ stage, nip }: { stage: number; nip: string }) {
    const user = await prisma.tbm_user.findFirst({
      where: {
        OR: [{ nip }, { id: nip }],
        is_deleted: false,
      },
    });

    if (!user) {
      throw new Error("Pegawai / Verifikator tidak ditemukan.");
    }

    await prisma.tbm_verification_stage_verifier.deleteMany({
      where: {
        stage_id: Number(stage),
        user_id: user.id,
      },
    });

    return {
      message: `Verifikator ${user.nama} berhasil dihapus dari Tahap ${stage}.`,
    };
  }

  async GetApprovals({
    stage = 1,
    page = 1,
    page_size = 10,
    search = "",
  }: {
    stage?: number;
    page?: number;
    page_size?: number;
    search?: string;
  }) {
    const current_stage = Number(stage) || 1;
    const skip = (Number(page) - 1) * Number(page_size);
    const take = Number(page_size);

    const whereBase: any = {
      is_deleted: false,
      status: SubmissionStatus.POSTED,
    };

    const whereStage: any = {
      ...whereBase,
      current_stage: current_stage,
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    const [rows, total_items, count1, count2, count3] = await Promise.all([
      prisma.tbl_submission.findMany({
        where: whereStage,
        skip,
        take,
        orderBy: { updated_at: "desc" },
        include: {
          creator: true,
          verifications: {
            include: { verifier: true },
          },
        },
      }),
      prisma.tbl_submission.count({ where: whereStage }),
      prisma.tbl_submission.count({
        where: { ...whereBase, current_stage: 1 },
      }),
      prisma.tbl_submission.count({
        where: { ...whereBase, current_stage: 2 },
      }),
      prisma.tbl_submission.count({
        where: { ...whereBase, current_stage: 3 },
      }),
    ]);

    const formattedRows = rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      status: r.status,
      current_stage: r.current_stage,
      creator: r.creator,
      created_at: r.created_at,
      stage_entered_at: r.updated_at,
    }));

    return {
      rows: formattedRows,
      pagination: {
        page: Number(page),
        page_size: Number(page_size),
        total_items,
        total_pages: Math.max(1, Math.ceil(total_items / take)),
      },
      meta: {
        per_stage: { 1: count1, 2: count2, 3: count3 },
      },
    };
  }

  async GetTracking(submission_id: string) {
    const submission = await prisma.tbl_submission.findFirst({
      where: { id: submission_id, is_deleted: false },
      include: {
        creator: true,
        verifications: {
          include: { verifier: true },
        },
        logs: {
          orderBy: { created_at: "desc" },
          include: { creator: true },
        },
      },
    });

    if (!submission) throw new Error("Pengajuan tidak ditemukan");

    const masterStages = await prisma.tbm_verification_stage.findMany({
      orderBy: { id: "asc" },
    });

    const stageConfig = masterStages.length > 0
      ? masterStages.map((s) => ({ stage: s.id, name: s.name }))
      : [
          { stage: 1, name: "Verifikasi Unit" },
          { stage: 2, name: "Verifikasi Bagian Umum" },
          { stage: 3, name: "Verifikasi Pimpinan" },
        ];

    const steps = stageConfig.map((sc) => {
      const v = submission.verifications.find((x) => x.stage === sc.stage);
      let state = "PENDING";

      if (v?.status === "APPROVED") {
        state = "DONE";
      } else if (v?.status === "REJECTED") {
        state = "REJECTED";
      } else if (
        submission.status === SubmissionStatus.REJECTED &&
        submission.current_stage === sc.stage
      ) {
        state = "REJECTED";
      } else if (
        ["APPROVED", "PUBLISHED"].includes(submission.status) &&
        sc.stage <= (submission.total_stages || 3)
      ) {
        state = "DONE";
      } else if (sc.stage < submission.current_stage) {
        state = "DONE";
      } else if (
        sc.stage === submission.current_stage &&
        submission.status === SubmissionStatus.POSTED
      ) {
        state = "CURRENT";
      }

      const acted = state === "DONE" || state === "REJECTED";

      return {
        stage: sc.stage,
        name: v?.stage_name || sc.name,
        state,
        verifiers: v?.verifier ? [v.verifier] : [],
        acted_by: acted ? v?.verifier : null,
        acted_at: acted ? v?.acted_at || v?.updated_at : null,
        remarks: state === "REJECTED" ? v?.remarks : null,
      };
    });

    return {
      current_stage: submission.current_stage,
      steps,
    };
  }
}

export default new VerificationRepository();
