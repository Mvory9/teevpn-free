import WireGuardAPI from "wg-easy-api";
import db from "../db/mongodb.js";
import "dotenv/config";

export async function createWireGuardClient(server, telegramId) {
    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const date = Date.now();
        const name = `free_${telegramId}_${date}`;

        await wgapi.createClient({ name });

        const configData = await getWireGuardClientDataByName(server, name);

        await db.createConfig({
            telegramId: telegramId,
            configId: configData.id,
            serverLocationName: server.serverLocationName,
            customName: null,
            trafficLimitGB: 1 // 1 GB for free clients
        });

        if (configData) return configData;
        else return null;
    } catch (error) {
        console.error(`[ERROR]:[${telegramId}] Ошибка при создании WireGuard клиента:`, error);
        throw new Error(error.message);
    }
}

export async function getWireGuardClients(server) {
    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") return clientsResponse.data;
        else return null;
    } catch (error) {
        console.error(`[ERROR]:[${serverLocationName}] Ошибка при получении всех WireGuard клиентов:`, error);
        throw new Error(error.message);
    }
}

export async function getWireGuardFreeConfigs(server) {
    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") return clientsResponse.data.find((client) => client.name.startsWith("free_"));
        else return null;
        } catch (error) {
            console.error(`[ERROR]:[${serverLocationName}] Ошибка при поиске бесплатных конфигураций:`, error);
            throw new Error(error.message);
        }
}

export async function getWireGuardClientDataByName(server, name) {
    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") {
            return clientsResponse.data.find((client) => client.name === name);
        }

        return null;
    } catch (error) {
        console.error(`[ERROR]:[${server.serverLocationName}] Ошибка при получении данных клиента с именем ${name}:`, error);
        throw new Error(error.message);
    }
}

export async function getWireGuardClientDataByConfigId(server, configId) {
    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const clientsResponse = await wgapi.getClients();

        if (clientsResponse.status === "success") {
            const result = clientsResponse.data.find((client) => client.id === configId);
            return result || null;
        } else return null;
    } catch (error) {
        console.error(`[ERROR]:[${serverLocationName}] Ошибка при получении данных клиента с ID ${configId} на сервере ${serverLocationName}`, error);
        throw new Error(error.message);
    }
}

export async function wireguardEnableConfig(server, clientId) {
    const config = await db.getConfig({ configId: clientId });
    const telegramId = config ? config.telegramId : "Неизвестно";

    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const result = await wgapi.enableClient({ clientId });

        return result;
    } catch (error) {
        console.log(`[ERROR]:[${telegramId}] Ошибка при включении WireGuard клиента с ID ${clientId} на сервере ${serverLocationName}:`, error);
        throw new Error(error.message);
    }
}

export async function wireguardDisableConfig(server, clientId) {
    const config = await db.getConfig({ configId: clientId });
    const telegramId = config ? config.telegramId : "Неизвестно";

    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const result = await wgapi.disableClient({ clientId });

        return result;
    } catch (error) {
        console.log(`[ERROR]:[${telegramId}] Ошибка при выключении WireGuard клиента с ID ${clientId} на сервере ${serverLocationName}:`, error);
        throw new Error(error.message);
    }
}

export async function wireguardDeleteConfig(telegramId, server, clientId) {
     try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const result = await wgapi.deleteClient({ clientId });

        return result;
    } catch (error) {
        console.log(`[ERROR]:[${telegramId}] Ошибка при удалении WireGuard клиента с ID ${clientId} на сервере ${serverLocationName}:`, error);
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
        console.error(`[ERROR]:[${telegramId}] Ошибка при переключении конфигурации с ${oldserverLocationName} (${oldConfigId}) на ${newserverLocationName}:`, error);
        throw new Error(error.message);
    }
}

export async function getWireguardClientConfig(server, clientId) {
    try {
        const wgapi = new WireGuardAPI(server.webProtocol, server.ip, server.panelPort || 51821, server.panelPassword);
        await wgapi.initSession({ password: server.panelPassword });

        const client = await wgapi.getClientConfig({ clientId });
        return client;
    } catch (error) {
        console.log(`[ERROR]:[${server.serverLocationName}] Ошибка при получении конфигурации WireGuard клиента с ID ${clientId} на сервере ${server.serverLocationName}:`, error);
        throw new Error(error.message);
    }
}

export function configEdit(configText, protocolLabel) {
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

    // Validate protocolLabel
    if (!protocolInterfaceFields[protocolLabel]) {
        throw new Error(`Unsupported protocol: ${protocolLabel}`);
    }

    // Unescape newlines in the config text
    const actualConfig = configText.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

    // Split configText into lines
    const lines = actualConfig.split('\n').map(line => line.trim()).filter(line => line);
    let inInterfaceSection = false;
    let interfaceLines = [];
    let otherLines = [];
    const fieldsToUpdate = protocolInterfaceFields[protocolLabel];
    const updatedFields = new Set();

    // Parse lines and separate [Interface] section
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

    // Process [Interface] lines
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

    // Add any missing fields
    for (const [field, value] of Object.entries(fieldsToUpdate)) {
        if (!updatedFields.has(field)) {
            newInterfaceLines.push(`${field} = ${value}`);
        }
    }

    // Combine all lines with proper formatting
    const resultLines = [...newInterfaceLines, '', ...otherLines];
    return resultLines.join('\n');
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