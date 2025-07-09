import { startTelegramPolling } from "./bot/telegram.js";
import { initHandlers } from "./bot/handlers.js";
import db from "./db/mongodb.js";
import "dotenv/config";
import { initCallbacks } from "./bot/callbacks.js";
import { setupCronStopConfigs } from "./cron/stopConfigs.js";

async function main() {
    try {
        // Check environment variables
        if (!process.env.TELEGRAM_TOKEN) {
            throw new Error("TELEGRAM_TOKEN is not set in the environment variables.");
        }

        if (!process.env.MONGODB_URL) {
            throw new Error("MONGODB_URL is not set in the environment variables.");
        }

        if (!process.env.PROJECT_NAME) {
            throw new Error("PROJECT_NAME is not set in the environment variables.");
        }

        if (!process.env.ORIGINAL_PROJECT) {
            throw new Error("ORIGINAL_PROJECT is not set in the environment variables.");
        }

        if (!process.env.ORIGINAL_PROJECT_NAME) {
            throw new Error("ORIGINAL_PROJECT_NAME is not set in the environment variables.");
        }

        if (!process.env.SUPPORT_LINK) {
            throw new Error("SUPPORT_LINK is not set in the environment variables.");
        }

        // DB connection
        await db.connect();

        // Telegram bot start
        startTelegramPolling();
        initHandlers();
        initCallbacks();

        // Cron
        setupCronStopConfigs();
    } catch (error) {
        console.error("[ERROR] Start was failed:", error);
        process.exit(1);
    }
}

main();