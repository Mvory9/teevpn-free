import WireGuardAPI from "wg-easy-api";
import db from "../db/mongodb.js";
import { sendMessage } from "../bot/telegram.js";
import "dotenv/config";
import { v4 as uuidv4 } from 'uuid';

// Utility to validate server object
function validateServer(server) {
    if (!server || typeof server !== 'object') {
        throw new Error('Неверный объект сервера');
    }
    if (!server.webProtocol || !['http', 'https'].includes(server.webProtocol)) {
        throw new Error('Неверный webProtocol сервера');
    }
    if (!server.ip || !server.ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/)) {
        throw new Error('Неверный IP адрес сервера');
    }
    if (!server.panelPassword || typeof server.panelPassword !== 'string') {
        throw new Error('Неверный пароль панели сервера');
    }
    if (!server.serverLocationName || typeof server.serverLocationName !== 'string' || server.serverLocationName.length > 50) {
        throw new Error('Неверное имя локации сервера');
    }
}

// Utility to sanitize client name
function sanitizeClientName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
}

// Utility to notify user on error
async function notifyUserOnError(telegramId, error, errorId) {
    try {
        await sendMessage(telegramId, 
            `❌ Произошла ошибка. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
            { parse_mode: "html" }
        );
    } catch (notifyError) {
        console.error(`[ERROR][${errorId}][Notify]: Не удалось уведомить пользователя ${telegramId}:`, notifyError);
    }
}

export async function createWireGuardClient(server, telegramId) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!telegramId || !/^\d+$/.test(telegramId)) {
            throw new Error('Неверный Telegram ID');
        }

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const date = Date.now();
        const rawName = `free_${telegramId}_${date}`;
        const name = sanitizeClientName(rawName);

        await wgapi.createClient({ name });

        const configData = await getWireGuardClientDataByName(server, name);
        if (!configData) {
            throw new Error('Не удалось получить данные созданного клиента');
        }

        await db.createConfig({
            telegramId: telegramId,
            configId: configData.id,
            serverLocationName: server.serverLocationName,
            customName: null,
            trafficLimitGB: 1
        });

        return configData;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${telegramId}]: Ошибка при создании WireGuard клиента:`, error);
        await notifyUserOnError(telegramId, error, errorId);
        throw error;
    }
}

export async function getWireGuardClients(server) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();
        if (clientsResponse.status !== "success" || !Array.isArray(clientsResponse.data)) {
            throw new Error('Неверный ответ от WireGuard API');
        }
        return clientsResponse.data;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${server.serverLocationName}]: Ошибка при получении всех WireGuard клиентов:`, error);
        await notifyUserOnError(server.telegramId || 'unknown', error, errorId);
        throw error;
    }
}

export async function getWireGuardFreeConfigs(server) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();
        if (clientsResponse.status !== "success" || !Array.isArray(clientsResponse.data)) {
            throw new Error('Неверный ответ от WireGuard API');
        }
        return clientsResponse.data.filter(client => client.name && client.name.startsWith("free_")) || [];
    } catch (error) {
        console.error(`[ERROR][${errorId}][${server.serverLocationName}]: Ошибка при поиске бесплатных конфигураций:`, error);
        await notifyUserOnError(server.telegramId || 'unknown', error, errorId);
        throw error;
    }
}

export async function getWireGuardClientDataByName(server, name) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!name || typeof name !== 'string' || name.length > 50) {
            throw new Error('Неверное имя клиента');
        }
        const sanitizedName = sanitizeClientName(name);

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();
        if (clientsResponse.status !== "success" || !Array.isArray(clientsResponse.data)) {
            throw new Error('Неверный ответ от WireGuard API');
        }
        return clientsResponse.data.find(client => client.name === sanitizedName) || null;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${server.serverLocationName}]: Ошибка при получении данных клиента с именем ${name}:`, error);
        await notifyUserOnError(server.telegramId || 'unknown', error, errorId);
        throw error;
    }
}

export async function getWireGuardClientDataByConfigId(server, configId) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!configId || !/^[0-9a-f-]{36}$/.test(configId)) {
            throw new Error('Неверный ID конфигурации');
        }

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();
        if (clientsResponse.status !== "success" || !Array.isArray(clientsResponse.data)) {
            throw new Error('Неверный ответ от WireGuard API');
        }
        return clientsResponse.data.find(client => client.id === configId) || null;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${server.serverLocationName}]: Ошибка при получении данных клиента с ID ${configId}:`, error);
        await notifyUserOnError(server.telegramId || 'unknown', error, errorId);
        throw error;
    }
}

export async function wireguardEnableConfig(server, clientId) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!clientId || !/^[0-9a-f-]{36}$/.test(clientId)) {
            throw new Error('Неверный ID клиента');
        }

        const config = await db.getConfig({ configId: clientId });
        const telegramId = config ? config.telegramId : "Неизвестно";

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const result = await wgapi.enableClient({ clientId });
        return result;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${telegramId}]: Ошибка при включении WireGuard клиента с ID ${clientId}:`, error);
        await notifyUserOnError(telegramId, error, errorId);
        throw error;
    }
}

export async function wireguardDisableConfig(server, clientId) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!clientId || !/^[0-9a-f-]{36}$/.test(clientId)) {
            throw new Error('Неверный ID клиента');
        }

        const config = await db.getConfig({ configId: clientId });
        const telegramId = config ? config.telegramId : "Неизвестно";

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const result = await wgapi.disableClient({ clientId });
        return result;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${telegramId}]: Ошибка при выключении WireGuard клиента с ID ${clientId}:`, error);
        await notifyUserOnError(telegramId, error, errorId);
        throw error;
    }
}

export async function wireguardDeleteConfig(telegramId, server, clientId) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!telegramId || !/^\d+$/.test(telegramId)) {
            throw new Error('Неверный Telegram ID');
        }
        if (!clientId || !/^[0-9a-f-]{36}$/.test(clientId)) {
            throw new Error('Неверный ID клиента');
        }

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const result = await wgapi.deleteClient({ clientId });
        return result;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${telegramId}]: Ошибка при удалении WireGuard клиента с ID ${clientId}:`, error);
        await notifyUserOnError(telegramId, error, errorId);
        throw error;
    }
}

export async function switchWireGuardConfig(oldServer, newServer, telegramId, oldConfigId) {
    const errorId = uuidv4();
    try {
        validateServer(oldServer);
        validateServer(newServer);
        if (!telegramId || !/^\d+$/.test(telegramId)) {
            throw new Error('Неверный Telegram ID');
        }
        if (!oldConfigId || !/^[0-9a-f-]{36}$/.test(oldConfigId)) {
            throw new Error('Неверный ID старой конфигурации');
        }

        const newConfigData = await createWireGuardClient(newServer, telegramId);
        if (!newConfigData) {
            throw new Error('Не удалось создать новую конфигурацию');
        }

        await wireguardDeleteConfig(telegramId, oldServer, oldConfigId);
        return newConfigData;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${telegramId}]: Ошибка при переключении конфигурации:`, error);
        await notifyUserOnError(telegramId, error, errorId);
        throw error;
    }
}

export async function getWireguardClientConfig(server, clientId) {
    const errorId = uuidv4();
    try {
        validateServer(server);
        if (!clientId || !/^[0-9a-f-]{36}$/.test(clientId)) {
            throw new Error('Неверный ID клиента');
        }

        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const client = await wgapi.getClientConfig({ clientId });
        if (!client || !client.data) {
            throw new Error('Конфигурация клиента не найдена');
        }
        return client;
    } catch (error) {
        console.error(`[ERROR][${errorId}][${server.serverLocationName}]: Ошибка при получении конфигурации WireGuard клиента с ID ${clientId}:`, error);
        await notifyUserOnError(server.telegramId || 'unknown', error, errorId);
        throw error;
    }
}

export function configEdit(configText, protocolLabel) {
    const errorId = uuidv4();
    try {
        if (!configText || typeof configText !== 'string') {
            throw new Error('Неверный текст конфигурации');
        }
        if (!protocolLabel || !['WireGuard', 'AmneziaWG'].includes(protocolLabel)) {
            throw new Error(`Неподдерживаемый протокол: ${protocolLabel}`);
        }

        const protocolInterfaceFields = {
            WireGuard: {
                MTU: '1332',
                DNS: '1.1.1.1'
            },
            AmneziaWG: {
                MTU: '1332',
                DNS: '1.1.1.1',
                Jc: '3',
                Jmin: '40',
                Jmax: '70',
                S1: '0',
                S2: '0',
                H1: '1',
                H2: '2',
                H3: '3',
                H4: '4'
            }
        };

        const actualConfig = configText.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
        const lines = actualConfig.split('\n').map(line => line.trim()).filter(line => line);
        let inInterfaceSection = false;
        let interfaceLines = [];
        let otherLines = [];
        const fieldsToUpdate = protocolInterfaceFields[protocolLabel];
        const updatedFields = new Set();

        for (let line of lines) {
            if (line === '[Interface]') {
                inInterfaceSection = true;
                interfaceLines.push(line);
                continue;
            }
            if (line.startsWith('[') && inInterfaceSection) {
                inInterfaceSection = false;
            }
            if (inInterfaceSection) {
                interfaceLines.push(line);
            } else {
                otherLines.push(line);
            }
        }

        const newInterfaceLines = [];
        for (let line of interfaceLines) {
            if (line === '[Interface]') {
                newInterfaceLines.push(line);
                continue;
            }

            let matched = false;
            for (const [field, value] of Object.entries(fieldsToUpdate)) {
                if (line.startsWith(`${field} =`)) {
                    newInterfaceLines.push(`${field} = ${value}`);
                    updatedFields.add(field);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                newInterfaceLines.push(line);
            }
        }

        for (const [field, value] of Object.entries(fieldsToUpdate)) {
            if (!updatedFields.has(field)) {
                newInterfaceLines.push(`${field} = ${value}`);
            }
        }

        const resultLines = [...newInterfaceLines, '', ...otherLines];
        return resultLines.join('\n');
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Ошибка при редактировании конфигурации:`, error);
        throw error; // Handled by caller
    }
}

export function formatBytes(bytes) {
    const errorId = uuidv4();
    try {
        if (typeof bytes !== 'number' || bytes < 0) {
            throw new Error('Неверное значение байтов');
        }
        if (bytes === 0) return "0б";
        const units = ["б", "КБ", "МБ", "ГБ", "ТБ", "ПБ", "ЭБ", "ЗБ", "ЙБ"];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1000 && unitIndex < units.length - 1) {
            value /= 1000;
            unitIndex++;
        }
        return value ? `${value.toFixed(2)}${units[unitIndex]}` : "0б";
    } catch (error) {
        console.error(`[ERROR][${errorId}]: Ошибка при форматировании байтов:`, error);
        return "0б";
    }
}