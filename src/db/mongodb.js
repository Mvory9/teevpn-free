import mongoose from 'mongoose';
import { User, Country, Server, Config } from "./schemas.js";
import { sendMessage } from "../bot/telegram.js";
import "dotenv/config";
import { v4 as uuidv4 } from 'uuid';

class MongoDB {
    constructor(url) {
        if (!url || !url.match(/^mongodb\+srv:\/\/|^mongodb:\/\/.+/)) {
            throw new Error("Неверный URL подключения к MongoDB");
        }
        this.url = url;
    }

    async connect() {
        const errorId = uuidv4();
        try {
            if (mongoose.connection.readyState === 1) {
                console.log('[INFO] MongoDB уже подключена.');
                return;
            }
            await mongoose.connect(this.url, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
            console.log("[INFO] MongoDB подключена успешно.");
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось подключиться к MongoDB:`, error);
            if (process.env.SUPPORT_LINK.includes('t.me')) {
                await sendMessage(process.env.SUPPORT_LINK.split('/').pop(), 
                    `⚠ Ошибка подключения к MongoDB: ${error.message} (Код: ${errorId})`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async disconnect() {
        const errorId = uuidv4();
        try {
            await mongoose.disconnect();
            console.log("[INFO] MongoDB отключена успешно.");
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось отключиться от MongoDB:`, error);
            if (process.env.SUPPORT_LINK.includes('t.me')) {
                await sendMessage(process.env.SUPPORT_LINK.split('/').pop(), 
                    `⚠ Ошибка отключения от MongoDB: ${error.message} (Код: ${errorId})`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getUser(telegramId) {
        const errorId = uuidv4();
        try {
            if (!telegramId || !/^\d+$/.test(telegramId)) {
                throw new Error('Неверный Telegram ID');
            }
            const user = await User.findOne({ telegramId }).exec();
            return user;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить пользователя:`, error);
            if (telegramId && /^\d+$/.test(telegramId)) {
                await sendMessage(telegramId, 
                    `❌ Ошибка при получении данных пользователя. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async regUser(telegramId) {
        const errorId = uuidv4();
        try {
            if (!telegramId || !/^\d+$/.test(telegramId)) {
                throw new Error('Неверный Telegram ID');
            }
            const user = new User({
                telegramId: Number(telegramId)
            });
            await user.save();
            return user;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось зарегистрировать пользователя:`, error);
            if (telegramId && /^\d+$/.test(telegramId)) {
                await sendMessage(telegramId, 
                    `❌ Ошибка при регистрации пользователя. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getCountry(filter) {
        const errorId = uuidv4();
        try {
            if (!filter || typeof filter !== 'object') {
                throw new Error('Неверный фильтр для получения страны');
            }
            const country = await Country.findOne(filter).exec();
            return country;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить страну:`, error);
            if (filter.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при получении данных страны. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getCountries(filter = null) {
        const errorId = uuidv4();
        try {
            if (filter && typeof filter !== 'object') {
                throw new Error('Неверный фильтр для получения стран');
            }
            const countries = await Country.find(filter || {}).exec();
            return countries;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить страны:`, error);
            if (filter?.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при получении списка стран. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getServer(filter = {}) {
        const errorId = uuidv4();
        try {
            if (typeof filter !== 'object') {
                throw new Error('Неверный фильтр для получения сервера');
            }
            const server = await Server.findOne(filter).exec();
            return server;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить сервер:`, error);
            if (filter.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при получении данных сервера. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getServers(filter = {}) {
        const errorId = uuidv4();
        try {
            if (typeof filter !== 'object') {
                throw new Error('Неверный фильтр для получения серверов');
            }
            const servers = await Server.find(filter).exec();
            return servers;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить серверы:`, error);
            if (filter.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при получении списка серверов. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getServersByCountry(countryEn) {
        const errorId = uuidv4();
        try {
            if (!countryEn || typeof countryEn !== 'string' || countryEn.length > 50) {
                throw new Error('Неверное имя страны');
            }
            const country = await this.getCountry({ countryEn });
            if (!country) {
                throw new Error('Страна не найдена');
            }
            const servers = await Server.find({ country: country.country }).exec();
            return servers;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить серверы по стране:`, error);
            if (countryEn.telegramId && /^\d+$/.test(countryEn.telegramId)) {
                await sendMessage(countryEn.telegramId, 
                    `❌ Ошибка при получении серверов по стране. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async createConfig({ telegramId, configId, serverLocationName, customName, trafficLimitGB = 1 }) {
        const errorId = uuidv4();
        try {
            if (!telegramId || !/^\d+$/.test(telegramId)) {
                throw new Error('Неверный Telegram ID');
            }
            if (!configId || !/^[0-9a-f-]{36}$/.test(configId)) {
                throw new Error('Неверный ID конфигурации');
            }
            if (!serverLocationName || typeof serverLocationName !== 'string' || serverLocationName.length > 50) {
                throw new Error('Неверное имя локации сервера');
            }
            if (customName && (typeof customName !== 'string' || customName.length > 20)) {
                throw new Error('Неверное пользовательское имя конфигурации');
            }
            if (typeof trafficLimitGB !== 'number' || trafficLimitGB <= 0) {
                throw new Error('Неверный лимит трафика');
            }

            const config = new Config({
                telegramId,
                configId,
                createDate: Date.now(),
                serverLocationName,
                customName: customName || null,
                trafficLimitGB
            });
            await config.save();
            return config;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось создать конфигурацию:`, error);
            if (telegramId && /^\d+$/.test(telegramId)) {
                await sendMessage(telegramId, 
                    `❌ Ошибка при создании конфигурации. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getConfig(filter) {
        const errorId = uuidv4();
        try {
            if (!filter || typeof filter !== 'object') {
                throw new Error('Неверный фильтр для получения конфигурации');
            }
            const config = await Config.findOne(filter).exec();
            return config;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить конфигурацию:`, error);
            if (filter.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при получении конфигурации. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async getConfigs(filter) {
        const errorId = uuidv4();
        try {
            if (!filter || typeof filter !== 'object') {
                throw new Error('Неверный фильтр для получения конфигураций');
            }
            const configs = await Config.find(filter).exec();
            return configs;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось получить конфигурации:`, error);
            if (filter.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при получении конфигураций. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }

    async setConfig(filter, update) {
        const errorId = uuidv4();
        try {
            if (!filter || typeof filter !== 'object' || !update || typeof update !== 'object') {
                throw new Error('Неверные параметры для обновления конфигурации');
            }
            const config = await Config.updateOne(filter, update).exec();
            return config;
        } catch (error) {
            console.error(`[ERROR][${errorId}]: Не удалось обновить конфигурацию:`, error);
            if (filter.telegramId && /^\d+$/.test(filter.telegramId)) {
                await sendMessage(filter.telegramId, 
                    `❌ Ошибка при обновлении конфигурации. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
            throw error;
        }
    }
}

const db = new MongoDB(process.env.MONGODB_URL);
export default db;