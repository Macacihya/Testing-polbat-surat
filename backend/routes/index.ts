import { Router } from "express";
import { VerifyAuthToken } from "../middlewares/auth";
import { Request, Response } from "express";
import { Ok } from "../utils/api-response";

import AuthRoute from "../app/auth/auth.Route";

import { protectedRoutes } from "./protected";
import { generatedRoutes } from "./generated";

import prisma from "../lib/prisma";

const routes = Router();

// AUTH
routes.use("/", AuthRoute);

routes.use("/generate", generatedRoutes);
routes.use("/", VerifyAuthToken, protectedRoutes);

// WHOAMI
routes.get("/whoami", VerifyAuthToken, async (req: Request, res: Response) => {
  const user = req.cookies.user;
  if (!user) {
    return Ok({ res, data: null });
  }

  let verifier_stages: number[] = [];

  if (user.is_admin || user.nip === "admin") {
    verifier_stages = [1, 2, 3];
  } else {
    try {
      const assigned = await prisma.tbm_verification_stage_verifier.findMany({
        where: {
          OR: [{ user_id: user.id }, { user_id: user.nip }],
        },
        select: { stage_id: true },
      });

      const stagesSet = new Set(assigned.map((a) => a.stage_id));

      // Jika user merupakan pimpinan unit, otomatis punya hak verifikasi Tahap 1 (Unit)
      const isLeader = await prisma.tbm_unit.findFirst({
        where: {
          OR: [{ leader_id: user.id }, { leader_id: user.nip }],
          is_deleted: false,
        },
      });

      if (isLeader) {
        stagesSet.add(1);
      }

      verifier_stages = Array.from(stagesSet).sort();
    } catch {
      verifier_stages = [];
    }
  }

  return Ok({ res, data: { ...user, verifier_stages } });
});

export default routes;
