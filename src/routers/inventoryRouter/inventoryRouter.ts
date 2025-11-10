import { Router } from "express";
import inventoryController from "../../controllers/inventoryController/inventoryController.js";

export const inventoryRouter: Router = Router();

// Inventory summary and dashboard
inventoryRouter.get("/summary", inventoryController.getInventorySummary);
inventoryRouter.get("/dashboard", inventoryController.getInventoryDashboard);

// Product stock management
inventoryRouter.get("/product/:productId/:category/stock", inventoryController.getProductStock);
inventoryRouter.get("/product/:productId/:category/logs", inventoryController.getProductInventoryLogs);

// Stock adjustments
inventoryRouter.post("/adjust", inventoryController.adjustStock);
inventoryRouter.get("/adjustments", inventoryController.getStockAdjustments);

// Low stock alerts
inventoryRouter.get("/alerts", inventoryController.getLowStockAlerts);

// Stock validation
inventoryRouter.post("/validate", inventoryController.validateStock);
