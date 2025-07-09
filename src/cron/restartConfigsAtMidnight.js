import { InlineKeyboardBuilder } from "puregram";
import cron from "node-cron";
import "dotenv/config";
import db from "../db/mongodb.js";
import { sendMessage } from "../bot/telegram.js";
import { getWireGuardClients, wireguardDisableConfig, wireguardEnableConfig } from "../services/wireguard.js";
import { v4 as uuidv4 } from 'uuid';

async function restartConfigsAtMidnight() {
    const errorId = uuidv4();
    try {
        if (!process.env.ORIGINAL_PROJECT) {
            throw new Error('Отсутствует ORIGINAL_PROJECT в переменных окружения');
        }

        const servers = await db.getServers();
        if (!servers || !Array.isArray(servers)) {
            throw new Error('Не удалось получить список серверов');
        }

        const MAX_CLIENTS_PER_RUN = 100;
        for (const server of servers) {
            const clientsOnServer = await getWireGuardClients(server);
            if (!clientsOnServer || !Array.isArray(clientsOnServer)) {
                console.warn(`[WARN][${errorId}][${server.serverLocationName}]: Не удалось получить клиентов`);
                continue;
            }

            const freeClients = clientsOnServer.filter(client => client.name && client.name.startsWith("free_"));
            for (const client of freeClients.slice(0, MAX_CLIENTS_PER_RUN)) {
                const [_, clientTelegramId] = client.name.split("_");
                if (!clientTelegramId || !/^\d+$/.test(clientTelegramId)) {
                    console.warn(`[WARN][${errorId}]: Неверный Telegram ID в имени клиента ${client.name}`);
                    continue;
                }

                try {
                    const text = `🔁 Трафик обнулён. Можете снова пользоваться VPN.`;
                    const keyboard = new InlineKeyboardBuilder()
                        .urlButton({ text: `📶 Безлимитный VPN`, url: process.env.ORIGINAL_PROJECT });

                    await sendMessage(clientTelegramId, text, {
                        parse_mode: "html",
                        reply_markup: keyboard
                    });

                    await wireguardDisableConfig(server, client.id);
                    await wireguardEnableConfig(server, client.id);
                } catch (clientError) {
                    console.error(`[ERROR][${errorId}][${clientTelegramId}]: Ошибка при обработке клиента ${client.id}:`, clientError);
                    await sendMessage(clientTelegramId, 
                        `❌ Ошибка при сбросе трафика. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                        { parse_mode: "html" }
                    );
                }
            }
        }
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Ошибка при сбросе конфигураций:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await sendMessage(process.env.ADMIN_ID, 
                `⚠ Ошибка при сбросе конфигураций: ${error.message} (Код: ${errorId})`, 
                { parse_mode: "html" }
            );
        }
    }
}

export async function setupCronRestartConfigsAtMidnight() {
    const errorId = uuidv4();
    try {
        cron.schedule("0 0 * * *", async () => {
            await restartConfigsAtMidnight();
        }, {
            timezone: "Europe/Moscow"
        });
        console.log("[INFO] Cron для сброса конфигураций запущен");
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Не удалось настроить cron для сброса конфигураций:`, error);
        if (process.env.SUPPORT_LINK.includes('t.me')) {
            await sendMessage(process.env.ADMIN_ID, 
                `⚠ Ошибка настройки cron: ${error.message} (Код: ${errorId})`, 
                { parse_mode: "html" }
            );
        }
        throw error;
    }
}