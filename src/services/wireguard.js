import WireGuardAPI from "wg-easy-api";
import { initializeModels } from "../models/index.js";
import { telegram } from "../bot/telegram.js";

export async function createWireGuardClient(server, telegramId) {
    try {
        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const date = Date.now();
        const name = `free_${telegramId}_${date}`;

        await wgapi.createClient({ name });

        const configData = await getWireGuardClientDataByName(server, name);

        if (configData) return configData;
        else return null;
    } catch (error) {
        console.error(`[ERROR]:[${telegramId}] Ошибка при создании WireGuard клиента:`, error);
        throw new Error(error.message);
    }
}

export async function getWireGuardClients(server) {
    try {
        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") return clientsResponse.data;
        else return null;
    } catch (error) {
        console.error(`[ERROR]:[${server.serverName}] Ошибка при получении всех WireGuard клиентов:`, error);
        throw new Error(error.message);
    }
}

export async function getWireGuardFreeConfigs(server, name) {
    try {
        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") return clientsResponse.data.find((client) => client.name.startsWith("free_"));
        else return null;
        } catch (error) {
            console.error(`[ERROR]:[${server.serverName}] Ошибка при поиске бесплатных конфигураций:`, error);
            throw new Error(error.message);
        }
}

export async function getWireGuardClientDataByConfigId(server, configId) {
    try {
        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") {
            const result = clientsResponse.data.find((client) => client.id === configId);
            return result || null;
        } else return null;
    } catch (error) {
        console.error(`[ERROR]:[${server.serverName}] Ошибка при получении данных клиента с ID ${configId} на сервере ${server.serverName}`, error);
        throw new Error(error.message);
    }
}

export async function wireguardEnableConfig(server, clientId) {
    const { Config } = await initializeModels();
    const config = await Config.findOne({ configId: clientId }).exec();
    const telegramId = config ? config.telegramId : "Неизвестно";

    try {
        let userInfo = {};
        if (telegramId !== "Неизвестно") {
            try {
                userInfo = await telegram.api.getChat({ chat_id: parseInt(telegramId) });
            } catch (error) {
                console.log(`[ERROR]:[${telegramId}] Ошибка при получении информации о пользователе:`, error);
                throw new Error(error.message)
            }
        }

        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const result = await wgapi.enableClient({ clientId });

        return result;
    } catch (error) {
        console.log(`[ERROR]:[${telegramId}] Ошибка при включении WireGuard клиента с ID ${clientId} на сервере ${server.serverName}:`, error);
        throw new Error(error.message);
    }
}

export async function wireguardDisableConfig(server, clientId) {
    const { Config } = await initializeModels();
    const config = await Config.findOne({ configId: clientId }).exec();
    const telegramId = config ? config.telegramId : "Неизвестно";

    try {
        let userInfo = {};
        if (telegramId !== "Неизвестно") {
            try {
                userInfo = await telegram.api.getChat({ chat_id: parseInt(telegramId) });
            } catch (error) {
                console.log(`[ERROR]:[${telegramId}] Ошибка при получении информации о пользователе:`, error);
                throw new Error(error.message)
            }
        }

        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const result = await wgapi.disableClient({ clientId });

        return result;
    } catch (error) {
        console.log(`[ERROR]:[${telegramId}] Ошибка при выключении WireGuard клиента с ID ${clientId} на сервере ${server.serverName}:`, error);
        throw new Error(error.message);
    }
}

export async function wireguardDeleteConfig(telegramId, server, clientId) {
     try {
        let userInfo = {};
        if (telegramId !== "Неизвестно") {
            try {
                userInfo = await telegram.api.getChat({ chat_id: parseInt(telegramId) });
            } catch (error) {
                console.log(`[ERROR]:[${telegramId}] Ошибка при получении информации о пользователе:`, error);
                throw new Error(error.message)
            }
        }

        const wgapi = new WireGuardAPI(server.protocol, server.ip, server.port || 51821, server.password);
        await wgapi.initSession({ password: server.password });

        const result = await wgapi.deleteClient({ clientId });

        return result;
    } catch (error) {
        console.log(`[ERROR]:[${telegramId}] Ошибка при удалении WireGuard клиента с ID ${clientId} на сервере ${server.serverName}:`, error);
        throw new Error(error.message);
    }
}

export async function switchWireGuardConfig(oldServer, newServer, telegramId, oldConfigId) {
    try {
        const newConfigData = await createWireGuardClient(newServer, telegramId, false, "Переключение страны");
        if (!newConfigData) {
            throw new Error("Не удалось создать новую конфигурацию");
        }

        await wireguardDeleteConfig(telegramId, oldServer, oldConfigId, "Переключение на другой сервер");

        return newConfigData;
    } catch (error) {
        console.error(`[ERROR]:[${telegramId}] Ошибка при переключении конфигурации с ${oldServer.serverName} (${oldConfigId}) на ${newServer.serverName}:`, error);
        throw new Error(error.message);
    }
}

export function formatBytes(bytes) {
    if (bytes === 0) return "0б";
    const units = ["б", "КБ", "МБ", "ГБ", "ТБ", "ПБ", "ЭБ", "ЗБ", "ЙБ"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1000 && unitIndex < units.length - 1) {
        value /= 1000;
        unitIndex++;
    }

    if (value) return `${value.toFixed(2)}${units[unitIndex]}`;
    else return "0б";
}