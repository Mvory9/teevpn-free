import QRCode from "qrcode";
import { sendMessage } from "../bot/telegram.js";
import { v4 as uuidv4 } from 'uuid';

export async function generateQR(text, telegramId = 'unknown') {
    const errorId = uuidv4();
    try {
        if (!text || typeof text !== 'string' || text.length > 10000) {
            throw new Error('Неверный или слишком длинный текст для QR-кода');
        }
        return await QRCode.toDataURL(text);
    } catch (error) {
        console.error(`[ERROR][${errorId}][QRCODE]: Ошибка при генерации QR-кода:`, error);
        if (telegramId !== 'unknown' && /^\d+$/.test(telegramId)) {
            await sendMessage(telegramId, 
                `❌ Ошибка при генерации QR-кода. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                { parse_mode: "html" }
            );
        }
        return false;
    }
}