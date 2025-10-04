import { Router } from "express";
import returnsRefundsController from "../../controllers/returnsRefundsController/returnsRefundsController.js";

export const returnsRefundsRouter: Router = Router();

// Return management routes
returnsRefundsRouter.post("/orders/:orderId/returns", returnsRefundsController.createReturnRequest);
returnsRefundsRouter.get("/returns/:returnId", returnsRefundsController.getReturnById);
returnsRefundsRouter.put("/returns/:returnId/process", returnsRefundsController.processReturnRequest);
returnsRefundsRouter.post("/returns/:returnId/process-items", returnsRefundsController.processReturnedItems);
returnsRefundsRouter.post("/returns/:returnId/refund", returnsRefundsController.processRefund);
returnsRefundsRouter.get("/returns", returnsRefundsController.searchReturns);
returnsRefundsRouter.get("/returns/analytics", returnsRefundsController.getReturnAnalytics);
returnsRefundsRouter.get("/returns/vendor/analytics", returnsRefundsController.getVendorReturnAnalytics);
returnsRefundsRouter.get("/returns/admin/all", returnsRefundsController.getAllReturns);
returnsRefundsRouter.post("/returns/bulk-process", returnsRefundsController.bulkProcessReturns);

// Store credit routes
returnsRefundsRouter.post("/store-credits", returnsRefundsController.createStoreCredit);
returnsRefundsRouter.get("/store-credits", returnsRefundsController.getUserStoreCredits);
returnsRefundsRouter.post("/store-credits/use", returnsRefundsController.useStoreCredit);
