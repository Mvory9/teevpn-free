import mongoose from 'mongoose';
import { User } from "./schemas.js";
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

            if (user) return user;
            else return null;
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
}

const db = new MongoDB(process.env.MONGODB_URL);
export default db;