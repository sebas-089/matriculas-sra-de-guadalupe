import { Router, type IRouter } from "express";
import healthRouter from "./health";
import matriculasRouter from "./matriculas";
import adminRouter from "./admin";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(settingsRouter);
router.use(matriculasRouter);
router.use(adminRouter);

export default router;
