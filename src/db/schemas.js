import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    telegramId: { 
        type: Number, 
        required: true, 
        match: [/^\d+$/, 'Неверный формат Telegram ID'],
        index: true 
    },
    regDate: { 
        type: Number, 
        default: Date.now, 
        min: [0, 'Дата регистрации не может быть отрицательной'] 
    },
    isAdmin: { 
        type: Boolean, 
        default: false, 
        enum: [true, false] 
    },
    isBanned: { 
        type: Boolean, 
        default: false, 
        enum: [true, false] 
    },
    isAcceptTerms: { 
        type: Boolean, 
        default: false, 
        enum: [true, false] 
    }
}, { timestamps: true });

const configSchema = new mongoose.Schema({
    telegramId: { 
        type: String, 
        required: true, 
        match: [/^\d+$/, 'Неверный формат Telegram ID'] 
    },
    configId: { 
        type: String, 
        required: true, 
        match: [/^[0-9a-f-]{36}$/, 'Неверный формат ID конфигурации'],
        index: true 
    },
    createDate: { 
        type: Number, 
        default: Date.now, 
        min: [0, 'Дата создания не может быть отрицательной'] 
    },
    serverLocationName: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Имя локации сервера слишком длинное'] 
    },
    customName: { 
        type: String, 
        default: null, 
        maxLength: [20, 'Пользовательское имя слишком длинное'] 
    },
    trafficLimitGB: { 
        type: Number, 
        required: true, 
        min: [0, 'Лимит трафика не может быть отрицательным'] 
    }
}, { timestamps: true });

const countrySchema = new mongoose.Schema({
    country: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Название страны слишком длинное'] 
    },
    countryEn: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Английское название страны слишком длинное'],
        index: true 
    },
    city: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Название города слишком длинное'] 
    },
    cityEn: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Английское название города слишком длинное'] 
    },
    flag: { 
        type: String, 
        required: true, 
        match: [/^[\u{1F1E6}-\u{1F1FF}]{2}$/u, 'Неверный формат флага'] 
    }
}, { timestamps: true });

const serverSchema = new mongoose.Schema({
    serverLocationName: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Имя локации сервера слишком длинное'],
        index: true 
    },
    country: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Название страны слишком длинное'] 
    },
    city: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Название города слишком длинное'] 
    },
    webProtocol: { 
        type: String, 
        required: true, 
        enum: ['http', 'https'], 
        default: 'https' 
    },
    typeProtocol: { 
        type: String, 
        required: true, 
        enum: ['wg', 'awg'], 
        default: 'wg' 
    },
    ip: { 
        type: String, 
        required: true, 
        match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[0-9a-fA-F:]+$/, 'Неверный формат IP'] 
    },
    panelPort: { 
        type: Number, 
        required: true, 
        min: [1, 'Порт должен быть положительным'], 
        max: [65535, 'Порт не может превышать 65535'] 
    },
    panelPassword: { 
        type: String, 
        required: true, 
        minLength: [8, 'Пароль панели слишком короткий'] 
    },
    serverCost: { 
        type: Number, 
        required: true, 
        min: [0, 'Стоимость сервера не может быть отрицательной'] 
    },
    hostingProvider: { 
        type: String, 
        required: true, 
        maxLength: [50, 'Название хостинг-провайдера слишком длинное'] 
    },
    configsLimit: { 
        type: Number, 
        required: true, 
        min: [1, 'Лимит конфигураций должен быть положительным'] 
    },
    properties: { 
        type: Object, 
        required: true, 
        validate: {
            validator: v => typeof v === 'object' && v !== null,
            message: 'Свойства сервера должны быть объектом'
        }
    }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
export const Config = mongoose.model('Config', configSchema);
export const Country = mongoose.model('Country', countrySchema);
export const Server = mongoose.model('Server', serverSchema);