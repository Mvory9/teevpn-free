import mongoose from 'mongoose';
import { User, Country, Server, Config } from "./schemas.js";
import "dotenv/config";

class MongoDB {
    constructor(url) {
        if (!url) throw new Error("MongoDB connection URL is required.");

        this.url = url;
    }

    async connect() {
        try {
            if (mongoose.connection.readyState === 1) {
                console.log('[INFO] MongoDB already connected.');
                return;
            }
            await mongoose.connect(this.url);
            console.log("[INFO] MongoDB connected successfully.");
        } catch (error) {
            console.error("[ERROR] Failed to connect to MongoDB:", error);
            process.exit(1);
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            console.log("[INFO] MongoDB disconnected successfully.");
        } catch (error) {
            console.error("[ERROR] Failed to disconnect from MongoDB:", error);
        }
    }

    async getUser(telegramId) {
        try {
            const user = await User.findOne({ telegramId });
            return user;
        } catch (error) {
            console.error("[ERROR] Failed to getUser() in MongoDB:", error);
        }
    }

    async regUser(telegramId) {
        try {
            const user = new User({
                telegramId
            });
            await user.save();
            return user;
        } catch (error) {
            console.error("[ERROR] Failed to regUser() in MongoDB:", error);
        }
    }

    async getCountry(filter) {
        try {
            const country = await Country.findOne(filter).exec();
            return country;
        } catch (error) {
            console.error("[ERROR] Failed to getCountries() in MongoDB:", error);
        }
    }

    async getCountries(filter = null) {
        try {
            const countries = await Country.find(filter).exec();
            return countries;
        } catch (error) {
            console.error("[ERROR] Failed to getCountries() in MongoDB:", error);
        }
    }

    async getServer(filter) {
        try {
            const server = await Server.findOne(filter).exec();
            return server;
        } catch (error) {
            console.error("[ERROR] Failed to getServer() in MongoDB:", error);
        }
    }

    async getServersByCountry(countryEn) {
        try {
            const countries = await this.getCountry({ countryEn });
            const servers = await Server.find({ country: countries.country }).exec();
            return servers;
        } catch (error) {
            console.error("[ERROR] Failed to getServersByCountry() in MongoDB:", error);
        }
    }

    async createConfig({ telegramId, configId, serverLocationName, customName, trafficLimitGB = 1 }) {
        try {
            const config = new Config({
                telegramId: telegramId,
                configId,
                createDate: Date.now(),
                serverLocationName,
                customName: null,
                trafficLimitGB // 1 GB for free clients
            }).save();

            return config;
        } catch (error) {
            console.error("[ERROR] Failed to createConfig() in MongoDB:", error);
        }
    }

    async getConfig(filter) {
        try {
            const config = await Config.findOne(filter).exec();
            return config;
        } catch (error) {
            console.error("[ERROR] Failed to getConfig() in MongoDB:", error);
        }
    }

    async getConfigs(filter) {
        try {
            const configs = await Config.find(filter).exec();
            return configs;
        } catch (error) {
            console.error("[ERROR] Failed to getConfigs() in MongoDB:", error);
        }
    }

    async setConfig(filter, update) {
        try {
            const config = await Config.updateOne(filter, update).exec();
            return config;
        } catch (error) {
            console.error("[ERROR] Failed to setConfig() in MongoDB:", error);
        }
    }
}

const db = new MongoDB(process.env.MONGODB_URL);
export default db;