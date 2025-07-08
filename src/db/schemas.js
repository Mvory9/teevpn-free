import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    telegramId: { type: String }, // 112233445
    regDate: { type: Number, default: Date.now }, // 1744588800000 (timestamp with ms)
    isAdmin: { type: Boolean, default: false, enum: [true, false] }, // true/false
    isBanned: { type: Boolean, default: false, enum: [true, false] }, // true/false
    isAcceptTerms: { type: Boolean, default: false, enum: [true, false] } // true/false
});

const configSchema = new mongoose.Schema({
    telegramId: { type: String, required: true }, // 112233445
    configId: { type: String, required: true }, // 3d8bbfde-0c62-474c-a84c-0368c02cd90d
    createDate: { type: Date, default: Date.now }, // 1744588800000 (timestamp with ms)
    serverLocationName: { type: String, required: true }, // "FR-PA-01", "DE-FR-01" etc.
    customName: { type: String, required: true }, // "for phone", "pc in my room", "on tv", "for my mother" etc.
});

const countrySchema = new mongoose.Schema({
    country: { type: String, required: true }, // "France", "Germany", etc.
    city: { type: String, required: true }, // "Paris", "Frankfurt", etc.
    flag: { type: String, required: true }, // "🇫🇷", "🇩🇪", etc.
});

const serverSchema = new mongoose.Schema({
    serverLocationName: { type: String, required: true }, // "FR-PA-01", "DE-FR-01" etc.
    city: { type: String, required: true }, // "Paris", "Frankfurt", etc.
    webProtocol: { type: String, required: true }, // "http", "https", etc.
    typeProtocol: { type: String, required: true }, // "wg", "awg", etc.
    ip: { type: String, required: true }, // 69.228.228.228
    panelPort: { type: Number, required: true }, // 51821
    panelPassword: { type: String, required: true }, // "password123"
    serverCost: { type: Number, required: true }, // 420.0
    hostingProvider: { type: String, required: true }, // "Hetzner", "OVH", etc.
    configsLimit: { type: Number, required: true }, // 500
    properties: { type: Object, required: true }, // { "gemini": false, "youtubeNoAds": true, "monthlyIpChange": false }
});

export const User = mongoose.model('User', userSchema);
export const Config = mongoose.model('Config', configSchema);
export const Country = mongoose.model('Country', countrySchema);
export const Server = mongoose.model('Server', serverSchema);