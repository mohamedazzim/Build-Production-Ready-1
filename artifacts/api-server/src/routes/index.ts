import { Router, type IRouter } from "express";
import healthRouter from "./health";
import recordsRouter from "./records";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/records", recordsRouter);

export default router;
