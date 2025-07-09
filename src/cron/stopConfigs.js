import { InlineKeyboardBuilder } from "puregram";
import cron from "node-cron";
import "dotenv/config";
import db from "../db/mongodb.js";
import { sendMessage } from "../bot/telegram.js";
import { getWireGuardClients, wireguardDisableConfig } from "../services/wireguard.js";

async function stopConfigs() {
    const servers = await db.getServers();

    for (const server of servers) {
        const clientsOnServer = await getWireGuardClients(server);

        const freeClients = clientsOnServer.filter(client => client.name.startsWith("free_"));

        for (const client of freeClients) {
            const [_, clientTelegramId, __] = client.name.split("_");
            const sumOfTraffic = client.transferRx + client.transferTx;

            if (sumOfTraffic >= 1000000000 && client.enabled) {
                const text = `⚠ Вы использовали более 1ГБ трафика за сегодня. Ваша конфигурация отключена до 00:00 по МСК.`
                const keyboard = new InlineKeyboardBuilder()
                    .urlButton({ text: `📶 Продолжить пользоваться VPN`, url: process.env.ORIGINAL_PROJECT });

                await sendMessage(clientTelegramId, text, {
                    parse_mode: "html",
                    reply_markup: keyboard
                });

                await wireguardDisableConfig(server, client.id);
            }
        }
    }
}

export function setupCronStopConfigs() {
    cron.schedule("*/30 * * * * *", async () => {
        await stopConfigs();
    }, {
        timezone: "Europe/Moscow"
    });

    console.log("[INFO] Stop configs cron started");
}