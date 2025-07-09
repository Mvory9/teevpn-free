import { startTelegramPolling } from "./bot/telegram.js";
import { initHandlers } from "./bot/handlers.js";
import db from "./db/mongodb.js";
import "dotenv/config";
import { initCallbacks } from "./bot/callbacks.js";
import { setupCronStopConfigs } from "./cron/stopConfigs.js";
import { setupCronRestartConfigsAtMidnight } from "./cron/restartConfigsAtMidnight.js";

// Environment variable validation schema
const requiredEnvVars = [
    'TELEGRAM_TOKEN',
    'MONGODB_URL',
    'PROJECT_NAME',
    'ORIGINAL_PROJECT',
    'ORIGINAL_PROJECT_NAME',
    'SUPPORT_LINK'
];

function validateEnvVars() {
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        throw new Error(`Отсутствуют обязательные переменные окружения: ${missingVars.join(', ')}`);
    }
    // Additional format validation
    if (!process.env.TELEGRAM_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
        throw new Error('Неверный формат TELEGRAM_TOKEN');
    }
    if (!process.env.MONGODB_URL.match(/^mongodb\+srv:\/\/|^mongodb:\/\/.+/)) {
        throw new Error('Неверный формат MONGODB_URL');
    }
    if (!process.env.SUPPORT_LINK.match(/^https:\/\/t\.me\/.+$/)) {
        throw new Error('Неверный формат SUPPORT_LINK');
    }
}

async function main() {
    try {
        // Validate environment variables
        validateEnvVars();

        // DB connection with retry logic
        let retries = 3;
        while (retries > 0) {
            try {
                await db.connect();
                break;
            } catch (dbError) {
                console.error(`[ERROR][MongoDB][Attempt ${4 - retries}/3]: Не удалось подключиться:`, dbError);
                retries--;
                if (retries === 0) {
                    throw new Error(`Не удалось подключиться к Mongo distinguishing after retries: ${dbError.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
            }
        }

        // Telegram bot start
        try {
            await startTelegramPolling();
        } catch (telegramError) {
            throw new Error(`Не удалось запустить Telegram бот: ${telegramError.message}`);
        }

        // Initialize handlers and callbacks
        try {
            initHandlers();
            initCallbacks();
        } catch (initError) {
            throw new Error(`Не удалось инициализировать обработчики или коллбэки: ${initError.message}`);
        }

        // Cron setup
        try {
            setupCronStopConfigs();
            setupCronRestartConfigsAtMidnight();
        } catch (cronError) {
            throw new Error(`Не удалось настроить cron задачи: ${cronError.message}`);
        }

    } catch (error) {
        console.error("[ERROR][Startup]: Не удалось запустить приложение:", error);
        console.error(`Обратитесь в техподдержку: ${process.env.SUPPORT_LINK}`);
        process.exit(1);
    }
}

main();