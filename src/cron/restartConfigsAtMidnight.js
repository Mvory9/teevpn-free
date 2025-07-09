import { InlineKeyboardBuilder } from "puregram";
import cron from "node-cron";
import "dotenv/config";
import db from "../db/mongodb.js";
import { sendMessage } from "../bot/telegram.js";
import { getWireGuardClients, wireguardDisableConfig, wireguardEnableConfig } from "../services/wireguard.js";
 
async function restartConfigsAtMidnight() {
    const servers = await db.getServers();
 
    for (const server of servers) {
        const clientsOnServer = await getWireGuardClients(server);
 
        const freeClients = clientsOnServer.filter(client => client.name.startsWith("free_"));
 
        for (const client of freeClients) {
            const text = `🔁 Трафик обнулён. Можете снова пользоваться VPN.`;
            const keyboard = new InlineKeyboardBuilder()
                .urlButton({ text: `📶 Безлимитный VPN`, url: process.env.ORIGINAL_PROJECT });

            await sendMessage(clientTelegramId, text, {
                parse_mode: "html",
                reply_markup: keyboard
            });

            await wireguardDisableConfig(server, client.id);
            await wireguardEnableConfig(server, client.id);
        }
    }
}

export function setupCronRestartConfigsAtMidnight() {
    cron.schedule("0 0 * * *", async () => {
        await restartConfigsAtMidnight();
    }, {
        timezone: "Europe/Moscow"
    });

    console.log("[INFO] Stop configs cron started");
}