import QRCode from "qrcode";

export async function generateQR(text) {
    try {
        return await QRCode.toDataURL(text);
    } catch (error) {
        console.log(`[ERROR]:[QRCODE] Ошибка при генерации QR-кода:`, error);
        return false;
    }
}