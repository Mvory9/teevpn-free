import { InlineKeyboardBuilder } from "puregram";
import cron from "node-cron";
import "dotenv/config";
import db from "../db/mongodb.js";
import { sendMessage } from "../bot/telegram.js";
import { getWireGuardClients, wireguardDisableConfig } from "../services/wireguard.js";
import { v4 as uuidv4 } from 'uuid';

async function stopConfigs() {
    const errorId = uuidv4();
    try {
        if (!process.env.ORIGINAL_PROJECT) {
            throw new Error('Отсутствует ORIGINAL_PROJECT в переменных окружения');
        }

        const servers = await db.getServers();
        if (!servers || !Array.isArray(servers)) {
            throw new Error('Не удалось получить список серверов');
        }

        const configs = await db.getConfigs();

        for (const server of servers) {
            const clientsOnServer = await getWireGuardClients(server);
            if (!clientsOnServer || !Array.isArray(clientsOnServer)) {
                console.warn(`[WARN][${errorId}][${server.serverLocationName}]: Не удалось получить клиентов`);
                continue;
            }

            const freeClients = clientsOnServer.filter(client => client.name && client.name.startsWith("free_"));
            for (const client of freeClients) {
                const [_, clientTelegramId] = client.name.split("_");
                if (!clientTelegramId || !/^\d+$/.test(clientTelegramId)) {
                    console.warn(`[WARN][${errorId}]: Неверный Telegram ID в имени клиента ${client.name}`);
                    continue;
                }

                const sumOfTraffic = (client.transferRx || 0) + (client.transferTx || 0);
                const userConfigs = configs.find(user => user.telegramId === clientTelegramId);
                const userTraffic = userConfigs.traffigLimitGB * 1000000000;
                if (sumOfTraffic >= userTraffic && client.enabled) {
                    try {
                        const text = `⚠ Вы использовали более 1ГБ трафика за сегодня. Ваша конфигурация отключена до 00:00 по МСК.`;
                        const keyboard = new InlineKeyboardBuilder()
                            .urlButton({ text: `📶 Продолжить пользоваться VPN`, url: process.env.ORIGINAL_PROJECT });

                        await sendMessage(clientTelegramId, text, {
                            parse_mode: "html",
                            reply_markup: keyboard
                        });

                        await wireguardDisableConfig(server, client.id);
                    } catch (clientError) {
                        console.error(`[ERROR][${errorId}][${clientTelegramId}]: Ошибка при отключении клиента ${client.id}:`, clientError);
                        await sendMessage(clientTelegramId, 
                            `❌ Ошибка при отключении конфигурации. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                            { parse_mode: "html" }
                        );
                    }
                }
            }
        }
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Ошибка при остановке конфигураций:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await sendMessage(process.env.SUPPORT_LINK.split('/').pop(), 
                `⚠ Ошибка при остановке конфигураций: ${error.message} (Код: ${errorId})`, 
                { parse_mode: "html" }
            );
        }
    }
}

export async function setupCronStopConfigs() {
    const errorId = uuidv4();
    try {
        cron.schedule("1 * * * * *", async () => {
            await stopConfigs();
        }, {
            timezone: "Europe/Moscow"
        });
        console.log("[INFO] Cron для остановки конфигураций запущен");
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Не удалось настроить cron для остановки конфигураций:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await sendMessage(process.env.SUPPORT_LINK.split('/').pop(), 
                `⚠ Ошибка настройки cron: ${error.message} (Код: ${errorId})`, 
                { parse_mode: "html" }
            );
        }
        throw error;
    }
}