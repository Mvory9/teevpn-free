import { Telegram } from "puregram";
import "dotenv/config";
import { v4 as uuidv4 } from 'uuid';

// Validate environment variables
if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
    throw new Error('Неверный или отсутствующий TELEGRAM_TOKEN');
}
if (!process.env.SUPPORT_LINK || !process.env.SUPPORT_LINK.match(/^https:\/\/t\.me\/.+$/)) {
    throw new Error('Неверный или отсутствующий SUPPORT_LINK');
}

export const telegram = new Telegram({
    token: process.env.TELEGRAM_TOKEN
});

export async function startTelegramPolling() {
    const errorId = uuidv4();
    try {
        await telegram.updates.startPolling();
        console.log("[INFO] Telegram polling started");
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Не удалось запустить Telegram polling:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await telegram.api.sendMessage({
                chat_id: process.env.SUPPORT_LINK.split('/').pop(),
                text: `⚠ Ошибка при запуске Telegram polling: ${error.message} (Код: ${errorId})`,
                parse_mode: "html"
            });
        }
        throw error;
    }
}

export async function sendMessage(chatId, text, params = {}) {
    const errorId = uuidv4();
    try {
        if (!chatId || !/^\d+$/.test(chatId)) {
            throw new Error('Неверный Telegram chat ID');
        }
        if (!text || typeof text !== 'string' || text.length > 4096) {
            throw new Error('Неверный или слишком длинный текст сообщения');
        }
        if (params.reply_markup && typeof params.reply_markup !== 'object') {
            throw new Error('Неверный формат reply_markup');
        }

        await telegram.api.sendMessage({
            chat_id: chatId,
            text,
            parse_mode: params.parse_mode || "html",
            reply_markup: params.reply_markup
        });
    } catch (error) {
        console.error(`[ERROR][${errorId}][${chatId}]: Не удалось отправить сообщение:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await telegram.api.sendMessage({
                chat_id: process.env.SUPPORT_LINK.split('/').pop(),
                text: `⚠ Ошибка при отправке сообщения пользователю ${chatId}: ${error.message} (Код: ${errorId})`,
                parse_mode: "html"
            }).catch(notifyError => {
                console.error(`[ERROR][${errorId}][Notify]: Не удалось уведомить техподдержку:`, notifyError);
            });
        }
        throw error;
    }
}

export async function sendPhoto(chatId, photo, params = {}) {
    const errorId = uuidv4();
    try {
        if (!chatId || !/^\d+$/.test(chatId)) {
            throw new Error('Неверный Telegram chat ID');
        }
        if (!photo || !(photo instanceof Buffer) && typeof photo !== 'string') {
            throw new Error('Неверный формат изображения');
        }
        if (params.caption && (typeof params.caption !== 'string' || params.caption.length > 1024)) {
            throw new Error('Неверный или слишком длинный заголовок изображения');
        }
        if (params.reply_markup && typeof params.reply_markup !== 'object') {
            throw new Error('Неверный формат reply_markup');
        }

        await telegram.api.sendPhoto({
            chat_id: chatId,
            photo,
            caption: params.caption,
            parse_mode: params.parse_mode || "html",
            reply_markup: params.reply_markup
        });
    } catch (error) {
        console.error(`[ERROR][${errorId}][${chatId}]: Не удалось отправить фото:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await telegram.api.sendMessage({
                chat_id: process.env.SUPPORT_LINK.split('/').pop(),
                text: `⚠ Ошибка при отправке фото пользователю ${chatId}: ${error.message} (Код: ${errorId})`,
                parse_mode: "html"
            }).catch(notifyError => {
                console.error(`[ERROR][${errorId}][Notify]: Не удалось уведомить техподдержку:`, notifyError);
            });
        }
        throw error;
    }
}

export async function sendDocument(chatId, document, params = {}) {
    const errorId = uuidv4();
    try {
        if (!chatId || !/^\d+$/.test(chatId)) {
            throw new Error('Неверный Telegram chat ID');
        }
        if (!document || !(document instanceof Buffer) && typeof document !== 'string') {
            throw new Error('Неверный формат документа');
        }
        if (params.caption && (typeof params.caption !== 'string' || params.caption.length > 1024)) {
            throw new Error('Неверный или слишком длинный заголовок документа');
        }
        if (params.reply_markup && typeof params.reply_markup !== 'object') {
            throw new Error('Неверный формат reply_markup');
        }

        await telegram.api.sendDocument({
            chat_id: chatId,
            document,
            caption: params.caption,
            parse_mode: params.parse_mode || "html",
            reply_markup: params.reply_markup
        });
    } catch (error) {
        console.error(`[ERROR][${errorId}][${chatId}]: Не удалось отправить документ:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await telegram.api.sendMessage({
                chat_id: process.env.SUPPORT_LINK.split('/').pop(),
                text: `⚠ Ошибка при отправке документа пользователю ${chatId}: ${error.message} (Код: ${errorId})`,
                parse_mode: "html"
            }).catch(notifyError => {
                console.error(`[ERROR][${errorId}][Notify]: Не удалось уведомить техподдержку:`, notifyError);
            });
        }
        throw error;
    }
}