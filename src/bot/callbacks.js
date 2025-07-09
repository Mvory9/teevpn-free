import { InlineKeyboardBuilder, MediaSource } from "puregram";
import { createWireGuardClient, getWireGuardClientDataByConfigId, getWireguardClientConfig, configEdit, formatBytes } from "../services/wireguard.js";
import { telegram, sendMessage, sendPhoto, sendDocument } from "./telegram.js";
import { generateQR } from "../services/qrcode.js";
import db from "../db/mongodb.js";
import { v4 as uuidv4 } from 'uuid';

export function initCallbacks() {
    telegram.updates.on("callback_query", async (context) => {
        const errorId = uuidv4();
        try {
            if (!context.queryPayload || typeof context.queryPayload !== 'string' || context.queryPayload.length > 100) {
                throw new Error('Неверный payload коллбэка');
            }
            if (!context.from || !context.from.id || !/^\d+$/.test(context.from.id)) {
                throw new Error('Неверный Telegram ID пользователя');
            }

            console.log(`[INFO][${context.from.id}]: Callback received: ${context.queryPayload}`);

            let user = await db.getUser(context.from.id);
            if (!user) {
                user = await db.regUser(context.from.id);
                if (!user) {
                    throw new Error('Не удалось зарегистрировать пользователя');
                }
            }

            if (context.queryPayload === `accept_terms`) {
                if (user.isAcceptTerms) {
                    const text = `Ты уже принял условия использования. Можешь пользоваться бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>.`;
                    await sendMessage(context.from.id, text, { parse_mode: "html" });
                    return;
                }

                user.isAcceptTerms = true;
                await user.save();

                const { firstName, lastName } = context.from;
                const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Пользователь";

                const text = `Спасибо, <b>${fullName}</b>! 🎉\n\n` +
                    `Ты успешно принял условия использования. Теперь ты можешь пользоваться бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>.\n` +
                    `Тебе доступно <b>1 ГБ ежедневного трафика</b>, который сбрасывается каждый день в полночь. 🌙\n\n` +
                    `Если у тебя есть вопросы или нужна помощь, просто напиши мне!`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({ text: "Начать", payload: "start" });

                await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
                return;
            }

            if (!user.isAcceptTerms) {
                const { firstName, lastName } = context.from;
                const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Пользователь";

                const text =
                    `Привет, <b>${fullName}</b>! 👋\n\n` +
                    `Я бот для управления бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>.\n` +
                    `Ты получишь <b>1 ГБ ежедневного трафика</b>, который сбрасывается каждый день в полночь. 🌙\n\n` +
                    `Чтобы начать, пожалуйста, прими наши условия использования:\n\n` +
                    `<b>Условия использования:</b>\n` +
                    `1. VPN бесплатный и предназначен только для личного использования.\n` +
                    `2. Запрещено использование для любых незаконных действий.\n` +
                    `3. Мы не несем ответственности за последствия использования сервиса.\n\n` +
                    `<b>Почему VPN бесплатный?</b> 🤔\n` +
                    `Мы предлагаем бесплатный доступ, чтобы ты мог оценить качество нашего сервиса.\n` +
                    `Если понравится, ты можешь перейти на платную версию с безлимитным трафиком и приоритетной поддержкой.\n\n` +
                    `Согласен с условиями? Нажми кнопку ниже, чтобы начать пользоваться VPN! 🚀\n`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({ text: "✅ Принять условия и начать", payload: "accept_terms" });

                await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
                return;
            }

            if (context.queryPayload === "start") {
                const { firstName, lastName } = context.from;
                const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Пользователь";

                const text =
                    `Привет, <b>${fullName}</b>! 👋\n\n` +
                    `Я бот для управления бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>.\n` +
                    `Ты можешь использовать бесплатный VPN с <b>1 ГБ ежедневного трафика</b>, который сбрасывается каждый день в полночь. 🌙\n\n` +
                    `Помощь можно получить по команде /help либо у технической поддержки.\n\n` +
                    `Чтобы начать, просто используй кнопки ниже! 🚀\n`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({ text: "🛒 Получить конфигурацию", payload: "get_free_configs_1" })
                    .textButton({ text: "💼 Мои конфигурации", payload: "my_configs_1" })
                    .row()
                    .textButton({ text: "🖥 Сервера", payload: "servers" })
                    .row()
                    .urlButton({ text: "💬 Техническая поддержка", url: process.env.SUPPORT_LINK });

                await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
            }

            if (context.queryPayload.startsWith(`get_free_configs_`)) {
                const page = parseInt(context.queryPayload.split("_")[3] || 1, 10);
                if (isNaN(page) || page < 1) {
                    throw new Error('Неверный номер страницы');
                }
                const maxConfigsOnPage = 6;

                const text = `🌍 Выберите локацию сервера для получения конфигурации:`;

                const keyboard = new InlineKeyboardBuilder();
                const countries = (await db.getCountries()).slice((page - 1) * maxConfigsOnPage, page * maxConfigsOnPage);
                if (!countries || !Array.isArray(countries)) {
                    throw new Error('Не удалось получить список стран');
                }

                const pages = Math.ceil(countries.length / maxConfigsOnPage);
                for (const country of countries) {
                    if (!country.countryEn || typeof country.countryEn !== 'string' || country.countryEn.length > 50) {
                        continue;
                    }
                    keyboard.textButton({
                        text: `${country.flag} ${country.country}`,
                        payload: `country_${country.countryEn}_1`
                    })
                    .row();
                }

                keyboard
                    .textButton({
                        text: "<",
                        payload: `get_free_configs_${Math.max(1, page - 1)}`
                    })
                    .textButton({
                        text: `${page}/${pages}`,
                        payload: "none"
                    })
                    .textButton({
                        text: ">",
                        payload: `get_free_configs_${Math.min(pages, page + 1)}`
                    })
                    .row()
                    .textButton({
                        text: "◀️ Назад",
                        payload: "start"
                    });

                await sendMessage(context.from.id, text, {
                    parse_mode: "html",
                    reply_markup: keyboard
                });
            }

            if (context.queryPayload.startsWith("country_")) {
                const countryEn = context.queryPayload.split("_")[1];
                const page = parseInt(context.queryPayload.split("_")[2] || 1, 10);
                if (!countryEn || typeof countryEn !== 'string' || countryEn.length > 50 || isNaN(page) || page < 1) {
                    throw new Error('Неверные параметры страны или страницы');
                }
                const maxCountriesOnPage = 6;

                const text = `🌍 Выберите сервер для получения конфигурации:`;

                const keyboard = new InlineKeyboardBuilder();
                const servers = (await db.getServersByCountry(countryEn)).slice((page - 1) * maxCountriesOnPage, page * maxCountriesOnPage);
                if (!servers || !Array.isArray(servers)) {
                    throw new Error('Не удалось получить список серверов');
                }

                const pages = Math.ceil(servers.length / maxCountriesOnPage);
                for (const server of servers) {
                    const country = await db.getCountry({ country: server.country });
                    if (!country) {
                        continue;
                    }
                    keyboard.textButton({
                        text: `${country.flag} ${server.country} (${server.city})`,
                        payload: `server_${server.serverLocationName}`
                    })
                    .row();
                }

                keyboard
                    .textButton({
                        text: "<",
                        payload: `country_${countryEn}_${Math.max(1, page - 1)}`
                    })
                    .textButton({
                        text: `${page}/${pages}`,
                        payload: "none"
                    })
                    .textButton({
                        text: ">",
                        payload: `country_${countryEn}_${Math.min(pages, page + 1)}`
                    })
                    .row()
                    .textButton({
                        text: "◀️ Назад",
                        payload: "get_free_configs_1"
                    });

                await sendMessage(context.from.id, text, {
                    parse_mode: "html",
                    reply_markup: keyboard
                });
            }

            if (context.queryPayload.startsWith("server_")) {
                const serverLocationName = context.queryPayload.split("_")[1];
                if (!serverLocationName || typeof serverLocationName !== 'string' || serverLocationName.length > 50) {
                    throw new Error('Неверное имя локации сервера');
                }

                const server = await db.getServer({ serverLocationName });
                if (!server) {
                    throw new Error('Сервер не найден');
                }

                const userConfigs = await db.getConfigs({ telegramId: context.from.id, serverLocationName });
                if (!Array.isArray(userConfigs)) {
                    throw new Error('Не удалось получить конфигурации пользователя');
                }
                if (userConfigs.length > 0) {
                    await sendMessage(context.from.id, `❗️ У вас уже есть конфигурация. Вы можете использовать её или удалить, чтобы получить новую.`);
                    return;
                }

                const text = `🛠 Получение конфигурации для сервера ${server.country} (${server.city})...`;
                await sendMessage(context.from.id, text);

                try {
                    const configData = await createWireGuardClient(server, context.from.id);
                    if (!configData) {
                        throw new Error('Не удалось создать WireGuard клиента');
                    }

                    const text = `✅ Конфигурация успешно создана!\n\n` +
                        `📍 <b>Страна:</b> ${server.country}\n` +
                        `🌆 <b>Город:</b> ${server.city}\n` +
                        `🖥 <b>Сервер:</b> ${server.serverLocationName}\n` +
                        `🔑 <b>ID клиента:</b> ${configData.id}\n\n` +
                        `📥 <b>Скачайте конфигурацию в Ваших VPN:</b>\n`;

                    const keyboard = new InlineKeyboardBuilder()
                        .textButton({
                            text: "Мои VPN",
                            payload: `my_configs_1`
                        });

                    await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
                } catch (error) {
                    console.error(`[ERROR][${errorId}][${context.from.id}]: Ошибка при получении конфигурации для сервера ${serverLocationName}:`, error);
                    await sendMessage(context.from.id, 
                        `❌ Ошибка при получении конфигурации. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                        { parse_mode: "html" }
                    );
                }
            }

            if (context.queryPayload.startsWith("my_configs_")) {
                let page = parseInt(context.queryPayload.split("_")[2], 10);
                if (isNaN(page) || page < 1) {
                    page = 1;
                }
                const maxConfigsOnPage = 6;

                const allConfigs = await db.getConfigs({ telegramId: context.from.id });
                if (!Array.isArray(allConfigs)) {
                    throw new Error('Не удалось получить конфигурации пользователя');
                }
                const configs = allConfigs.slice((page - 1) * maxConfigsOnPage, page * maxConfigsOnPage);

                const pages = Math.max(1, Math.ceil(allConfigs.length / maxConfigsOnPage));

                const text = allConfigs.length === 0
                    ? "У вас пока нет конфигураций. Получите первую через меню!"
                    : `📂 Ваши конфигурации:`;

                const keyboard = new InlineKeyboardBuilder();
                if (allConfigs.length > 0) {
                    for (const config of configs) {
                        const server = await db.getServer({ serverLocationName: config.serverLocationName });
                        if (!server) {
                            continue;
                        }
                        const country = await db.getCountry({ country: server.country });
                        if (!country) {
                            continue;
                        }
                        keyboard.textButton({
                            text: `${country.flag} ${server.country} (${server.city})${config.customName ? ` - ${config.customName}` : ""}`,
                            payload: `config_${config.configId}`
                        })
                        .row();
                    }

                    keyboard
                        .textButton({
                            text: "<",
                            payload: `my_configs_${Math.max(1, page - 1)}`
                        })
                        .textButton({
                            text: `${page}/${pages}`,
                            payload: "none"
                        })
                        .textButton({
                            text: ">",
                            payload: `my_configs_${Math.min(pages, page + 1)}`
                        })
                        .row();
                }

                keyboard.textButton({
                    text: "◀️ Назад",
                    payload: "start"
                });

                await sendMessage(context.from.id, text, {
                    parse_mode: "html",
                    reply_markup: keyboard
                });
            }

            if (context.queryPayload.startsWith("config_")) {
                const configId = context.queryPayload.split("_")[1];
                if (!configId || !/^[0-9a-f-]{36}$/.test(configId)) {
                    throw new Error('Неверный ID конфигурации');
                }

                const config = await db.getConfig({ configId, telegramId: context.from.id });
                if (!config) {
                    await sendMessage(context.from.id, 
                        `❌ Конфигурация не найдена. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                        { parse_mode: "html" }
                    );
                    return;
                }

                const server = await db.getServer({ serverLocationName: config.serverLocationName });
                if (!server) {
                    throw new Error('Сервер не найден');
                }
                const country = await db.getCountry({ country: server.country });
                if (!country) {
                    throw new Error('Страна не найдена');
                }
                const configData = await getWireGuardClientDataByConfigId(server, configId);
                if (!configData) {
                    throw new Error('Данные конфигурации не найдены');
                }

                const protocolLabel = server.type === "wg" ? "WireGuard" : "AmneziaWG";

                const features = [];
                if (server.properties.youtubeNoAds) features.push("📺 YouTube без рекламы");
                if (server.properties.gemini) features.push("🤖 Доступ к Gemini");
                if (server.properties.monthlyIpChange) features.push("🔄 IP меняется ежемесячно");

                const featuresText = features.length ? 
                    `\n\n✨ <b>Особенности сервера:</b>\n${features.join("\n")}` : 
                    "\n\n✨ <b>Особенности:</b> Базовые";

                const text = `<b>🔐 VPN: ${country.flag} ${server.country} (${protocolLabel}) ${config.customName ? `- ${config.customName}` : ""}</b>\n\n` +
                    `🌍 ${country.city} (${server.country})\n` +
                    `📡 Протокол: <b>${protocolLabel}</b>\n` +
                    `🤝 Последнее соединение: ${configData.latestHandshakeAt || 'Никогда'}\n` +
                    `📶 Трафик за последнее время:\n` +
                    `  ↗️ Отправлено: ${formatBytes(configData.transferTx || 0)}\n` +
                    `  ↙️ Принято: ${formatBytes(configData.transferRx || 0)}` +
                    featuresText + 
                    `\n\n<b>✏️ Как изменить название?</b>\n` +
                    `<code>/rename ${config.configId} [название]</code>\n` +
                    `📝 Название до 20 символов.\n` +
                    `🔄 Для сброса: <code>/rename ${config.configId} сброс</code>\n\n`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({
                        text: `📂 ${protocolLabel} .conf`,
                        payload: `conf_${server.serverLocationName}_${configId}`
                    })
                    .textButton({
                        text: `🔐 ${protocolLabel} QR`,
                        payload: `qr_${server.serverLocationName}_${configId}`
                    })
                    .row()
                    .textButton({ 
                        text: "🗑️ Удалить", 
                        payload: `delete_${server.serverLocationName}_${configId}` 
                    })
                    .row()
                    .textButton({ 
                        text: "🔙 Назад", 
                        payload: `my_configs_1` 
                    });

                await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
            }

            if (context.queryPayload.startsWith("conf_")) {
                const serverLocationName = context.queryPayload.split("_")[1];
                const configId = context.queryPayload.split("_")[2];
                if (!serverLocationName || !configId || !/^[0-9a-f-]{36}$/.test(configId)) {
                    throw new Error('Неверные параметры конфигурации');
                }

                const server = await db.getServer({ serverLocationName });
                if (!server) {
                    throw new Error('Сервер не найден');
                }
                const country = await db.getCountry({ country: server.country });
                if (!country) {
                    throw new Error('Страна не найдена');
                }
                const configData = await getWireguardClientConfig(server, configId);
                if (!configData) {
                    throw new Error('Конфигурация не найдена');
                }

                const protocolLabel = server.type === "wg" ? "WireGuard" : "AmneziaWG";

                const modifiedConfig = configEdit(JSON.stringify(configData.data), protocolLabel).replaceAll(server.ip, `${serverLocationName.replaceAll("-", "").toLowerCase()}.${process.env.DOMAIN}`);
                const text = `📄 Файл конфигурации ${protocolLabel} для ${serverLocationName} (${country.flag} ${country.city}, ${country.country})`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({
                        text: "🔙 Назад",
                        payload: `config_${configId}`
                    });

                const document = MediaSource.buffer(Buffer.from(modifiedConfig, "utf-8"), {
                    filename: `${serverLocationName.replaceAll("-", "").slice(0, 4)}${context.from.id}.conf`
                });

                await sendDocument(context.from.id, document, {
                    reply_markup: keyboard,
                    parse_mode: "html",
                    caption: text,
                });
            }

            if (context.queryPayload.startsWith("qr_")) {
                const serverLocationName = context.queryPayload.split("_")[1];
                const configId = context.queryPayload.split("_")[2];
                if (!serverLocationName || !configId || !/^[0-9a-f-]{36}$/.test(configId)) {
                    throw new Error('Неверные параметры QR-кода');
                }

                const server = await db.getServer({ serverLocationName });
                if (!server) {
                    throw new Error('Сервер не найден');
                }
                const country = await db.getCountry({ country: server.country });
                if (!country) {
                    throw new Error('Страна не найдена');
                }
                const configData = await getWireguardClientConfig(server, configId);
                if (!configData) {
                    throw new Error('Конфигурация не найдена');
                }

                const protocolLabel = server.type === "wg" ? "WireGuard" : "AmneziaWG";

                const modifiedConfig = configEdit(JSON.stringify(configData.data), protocolLabel).replaceAll(server.ip, `${serverLocationName.replaceAll("-", "").toLowerCase()}.${process.env.DOMAIN}`);
                const qrCode = await generateQR(modifiedConfig, context.from.id);
                if (!qrCode) {
                    throw new Error('Не удалось сгенерировать QR-код');
                }

                const text = `🔐 QR-код ${protocolLabel} для ${serverLocationName} (${country.flag} ${country.city}, ${country.country})`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({
                        text: "🔙 Назад",
                        payload: `config_${configId}`
                    });

                await sendPhoto(context.from.id, MediaSource.data(qrCode), {
                    caption: text,
                    parse_mode: "html",
                    reply_markup: keyboard
                });
            }

            if (context.queryPayload.startsWith("delete_")) {
                const serverLocationName = context.queryPayload.split("_")[1];
                const configId = context.queryPayload.split("_")[2];
                if (!serverLocationName || !configId || !/^[0-9a-f-]{36}$/.test(configId)) {
                    throw new Error('Неверные параметры для удаления конфигурации');
                }

                const server = await db.getServer({ serverLocationName });
                if (!server) {
                    throw new Error('Сервер не найден');
                }
                const country = await db.getCountry({ country: server.country });
                if (!country) {
                    throw new Error('Страна не найдена');
                }

                await db.setConfig({ configId, telegramId: context.from.id }, { $set: { deleted: true } });
                await wireguardDeleteConfig(context.from.id, server, configId);

                const text = `🗑️ Конфигурация ${country.flag} ${server.country} (${server.city}) успешно удалена!`;
                const keyboard = new InlineKeyboardBuilder()
                    .textButton({
                        text: "🔙 Назад",
                        payload: `my_configs_1`
                    });

                await sendMessage(context.from.id, text, {
                    parse_mode: "html",
                    reply_markup: keyboard
                });
            }

        } catch (error) {
            console.error(`[ERROR][${errorId}][${context.from?.id || 'unknown'}]: Ошибка при обработке коллбэка:`, error);
            if (context.from?.id && /^\d+$/.test(context.from.id)) {
                await sendMessage(context.from.id, 
                    `❌ Произошла ошибка. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
        }
    });
}