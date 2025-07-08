import { Telegram, MediaSource } from "puregram";
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

export async function sendPhoto(chatId, base64Data, caption, options = {}) {
    try {
        const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, "base64");
        const photo = MediaSource.buffer(buffer, { filename: "image.png" });
        await telegram.api.sendPhoto({
            chat_id: chatId,
            photo,
            caption,
            ...options
        });
    } catch (error) {
        console.log(`[ERROR]:[${chatId}] Ошибка при отправке фото:`, error);
        throw new Error(`Ошибка при отправке фото: ${error.message}`);
    }
}