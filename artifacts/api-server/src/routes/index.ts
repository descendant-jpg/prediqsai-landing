import { Router, type IRouter } from "express";

import authRouter from "./auth";
import bankrollRouter from "./bankroll";
import chatRouter from "./chat";
import healthRouter from "./health";
import predictionsRouter from "./predictions";
import setupRouter from "./setup";
import subscriptionRouter from "./subscription";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(userRouter);
router.use(chatRouter);
router.use(predictionsRouter);
router.use(bankrollRouter);
router.use(subscriptionRouter);
router.use(setupRouter);

export default router;
