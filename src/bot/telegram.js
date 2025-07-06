import { Telegram } from "puregram";
import "dotenv/config";

export const telegram = new Telegram({
    token: process.env.TELEGRAM_TOKEN
})

export function startTelegramPolling() {
    telegram.updates.startPolling()
        .then(() => {
            console.log("[INFO] Telegram bot started successfully.");
        })
        .catch((error) => {
            console.error("[INFO] Failed to start Telegram bot:", error);
            process.exit(1);
        });
}

export async function sendMessage(chatId, text, options = {}) {
    if (!chatId || !text) {
        throw new Error("chatId and text are required parameters.");
    }

    const data = {
        chat_id: chatId,
        text,
        ...options
    }

    const result = await telegram.api.sendMessage(data);
}