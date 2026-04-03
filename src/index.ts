import "reflect-metadata";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { useExpressServer } from "routing-controllers";
import { AppDataSource } from "./data-source";
import fileUpload from "express-fileupload";

import { seedDefaultAdmin } from "./seed/admin";
import { seedDefaultModules } from "./seed/modules";
import { offerCronService } from "./services/offer-cron.service";



AppDataSource.initialize()
  .then(async () => {

    console.log("✅ Database connected");

    await seedDefaultAdmin();
    await seedDefaultModules();

    // Initialize offer cron service (runs daily at 10 AM)
    await offerCronService.initialize();

    // Also run an immediate check on startup to update any expired offers
    offerCronService.runManually().catch(console.error);

    const app = express();



    app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Origin", "Content-Type", "Authorization"],
        credentials: true
      })
    );

    app.use(
      fileUpload({
        limits: { fileSize: 10 * 1024 * 1024 },
        abortOnLimit: true,
        useTempFiles: false
      })
    );
    app.use("/public", express.static("public"));

    const isProd = process.env.NODE_ENV === "prod";
    useExpressServer(app, {
      routePrefix: "/api",
      controllers: [
        isProd
          ? __dirname + "/controllers/**/*.js"
          : __dirname + "/controllers/**/*.ts"
      ],
      middlewares: [
        isProd
          ? __dirname + "/middlewares/**/*.js"
          : __dirname + "/middlewares/**/*.ts"
      ],
      defaultErrorHandler: false,
      validation: true,
      classTransformer: true,

    });

    app.get("/", (_req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        database: AppDataSource.isInitialized ? "connected" : "disconnected",
        nodeVersion: process.version,
        uptime: process.uptime()
      });
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);
      res.status(err.httpCode || 500).json({
        message: err.message,
        errors: err.errors || null
      });
    });

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  })
  .catch((error) => {
    console.error("❌ DB Error:", error);
  });
