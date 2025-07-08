import { InlineKeyboardBuilder } from "puregram";
import { createWireGuardClient, formatBytes } from "../services/wireguard.js";
import { sendMessage, telegram } from "./telegram.js";
import db from "../db/mongodb.js";

export function initCallbacks() {
    telegram.updates.on("callback_query", async (context) => {
        if (!context.queryPayload) return;

        console.log(context.queryPayload);

        let user = await db.getUser(context.from.id);
        if (!user) await db.regUser(context.from.id);
        user = await db.getUser(context.from.id);

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
                .text({ text: "Начать", payload: "start" });

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
                .text({ text: "✅ Принять условия и начать", payload: "accept_terms" });

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
            const page = context.queryPayload.split("_")[3] || 1;
            const maxConfigsOnPage = 6;

            const text = `🌍 Выберите локацию сервера для получения конфигурации:`;

            const keyboard = new InlineKeyboardBuilder();

            const countries = (await db.getCountries()).slice((page - 1) * maxConfigsOnPage, page * maxConfigsOnPage);

            const pages = Math.ceil(countries.length/maxConfigsOnPage);

            for (const country of countries) {
                keyboard.textButton({
                    text: `${country.flag} ${country.country}`,
                    payload: `country_${country.countryEn}_1`
                })
                .row();
            }

            keyboard
                .textButton({
                    text: "<",
                    payload: `get_free_configs_${Math.max(1, parseInt(page) - 1)}`
                })
                .textButton({
                    text: `${page}/${pages}`,
                    payload: "none"
                })
                .textButton({
                    text: ">",
                    payload: `get_free_configs_${Math.min(pages, parseInt(page) + 1)}`
                })
                .row()
                .textButton({
                    text: "◀️ Назад",
                    payload: "start"
                });

            await sendMessage(context.from.id, text, {
                parse_mode: "html",
                reply_markup: keyboard
            })
        }

        if (context.queryPayload.startsWith("country_")) {
            const countryEn = context.queryPayload.split("_")[1];
            const page = context.queryPayload.split("_")[2] || 1;
            const maxCountriesOnPage = 6;

            const text = `🌍 Выберите сервер для получения конфигурации:`;

            const keyboard = new InlineKeyboardBuilder();
            
            const servers = (await db.getServersByCountry(countryEn)).slice((page - 1) * maxCountriesOnPage, page * maxCountriesOnPage);

            const pages = Math.ceil(servers.length / maxCountriesOnPage);

            for (const server of servers) {
                const country = await db.getCountry({ country: server.country });

                keyboard.textButton({
                    text: `${country.flag} ${server.country} (${server.city})`,
                    payload: `server_${server.serverLocationName}`
                })
                .row();
            }

            keyboard
                .textButton({
                    text: "<",
                    payload: `country_${countryEn}_${Math.max(1, parseInt(page) - 1)}`
                })
                .textButton({
                    text: `${page}/${pages}`,
                    payload: "none"
                })
                .textButton({
                    text: ">",
                    payload: `country_${countryEn}_${Math.min(pages, parseInt(page) + 1)}`
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

            const server = await db.getServer({ serverLocationName });
            const userConfigs = await db.getConfigs({ telegramId: context.from.id, serverLocationName });

            if (userConfigs > 0) {
                await sendMessage(context.from.id, `❗️ У вас уже есть конфигурация. Вы можете использовать её или удалить, чтобы получить новую.`);
                return;
            }

            if (!server) {
                const keyboard = new InlineKeyboardBuilder()
                    .urlButton({
                        text: "💬 Техническая поддержка",
                        url: process.env.SUPPORT_LINK
                    })
                    .row()
                    .textButton({
                        text: "◀️ Назад",
                        payload: "get_free_configs_1"
                    })

                await sendMessage(context.from.id, "❌ Сервер не найден. Пожалуйста, попробуйте позже или обратитесь в техническую поддержку.", {
                    parse_mode: "html",
                    reply_markup: keyboard
                });
                return;
            }

            const text = `🛠 Получение конфигурации для сервера ${server.country} (${server.city})...`;

            await sendMessage(context.from.id, text);

            try {
                const configData = await createWireGuardClient(server, context.from.id);
                if (!configData) {
                    throw new Error("Не удалось создать WireGuard клиента");
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
                console.error(`[ERROR]:[${context.from.id}] Ошибка при получении конфигурации для сервера ${server.serverLocationName}:`, error);
                await sendMessage(context.from.id, "❌ Произошла ошибка при получении конфигурации. Пожалуйста, попробуйте позже.");
            }
        }

        if (context.queryPayload.startsWith("my_configs_")) {
            let page = parseInt(context.queryPayload.split("_")[2], 10);
            if (isNaN(page) || page < 1) page = 1;
            const maxConfigsOnPage = 6;

            const allConfigs = await db.getConfigs({ telegramId: context.from.id });
            const configs = allConfigs.slice((page - 1) * maxConfigsOnPage, page * maxConfigsOnPage);

            const pages = Math.max(1, Math.ceil(allConfigs.length / maxConfigsOnPage));

            const text = allConfigs.length === 0
                ? "У вас пока нет конфигураций. Получите первую через меню!"
                : `📂 Ваши конфигурации:`;

            const keyboard = new InlineKeyboardBuilder();

            if (allConfigs.length > 0) {
                for (const config of configs) {
                    const server = await db.getServer({ serverLocationName: config.serverLocationName });
                    const country = await db.getCountry({ country: server.country });

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
            const config = await db.getConfig({ configId, telegramId: context.from.id });

            if (!config) {
                await sendMessage(context.from.id, "❌ Конфигурация не найдена. Пожалуйста, попробуйте позже или обратитесь в техническую поддержку.");
                return;
            }

            const configData = await getWireGuardClientDataByConfigId(server, configId);
            const server = await db.getServer({ serverLocationName: config.serverLocationName });
            const country = await db.getCountry({ country: server.country });

            const protocolLabel = server.type === "wg" ? "WireGuard" : "AmneziaWG";

            const text = `<b>🔐 VPN: ${country.flag} ${server.serverName} (${protocolLabel})${config.customName ? ` (${config.customName})` : ""}</b>\n\n` +
                `🌍 ${country.city} (${server.serverName})\n` +
                `📡 Протокол: <b>${protocolLabel}</b>\n` +
                `🤝 Последнее соединение: ${configData.latestHandshakeAt || 'Никогда'}\n` +
                `📶 Трафик за последнее время:\n` +
                `  ↗️ Отправлено: ${formatBytes(configData.transferTx || 0)}\n` +
                `  ↙️ Принято: ${formatBytes(configData.transferRx || 0)}` +
                featuresText + 
                `\n\n📢 <b>Сообщить о проблеме</b>: ${reportStatus}\n\n` +
                `<b>✏️ Как изменить название?</b>\n` +
                `<code>/rename ${config.configId} [название]</code>\n` +
                `📝 Название до 20 символов.\n` +
                `🔄 Для сброса: <code>/rename ${config.configId} сброс</code>\n\n`;

            const keyboard = new InlineKeyboardBuilder()
                .textButton({
                    text: `📂 ${protocolLabel} .conf`,
                    payload: `${server.type}_${server.serverName}_${configId}`
                })
                .textButton({ text:
                    `🔐 ${protocolLabel} QR`,
                    payload: `qr_${server.type}_${server.serverName}_${configId}`
                })
                .row()
                .textButton({ 
                    text: configData.enabled ? "🚫 Отключить" : "✅ Включить", 
                    payload: configData.enabled ? `disable_${serverName}_${configId}` : `enable_${serverName}_${configId}` 
                })
                .textButton({ text: "🗑️ Удалить", payload: `delete_${serverName}_${configId}` })
                .row()
                .textButton({ 
                    text: "🌍 Переключить страну", 
                    payload: `${SWITCH_COUNTRY}_start_${configId}` 
                }).row();

            if (!config.isTrial) {
                keyboard.textButton({ text: "💸 Оплатить и продлить", payload: `pay_config_${serverName}_${configId}` }).row();
            }
            keyboard
                .urlButton({ text: "📢 Сообщить о проблеме", url: process.env.SUPPORT_LINK }).row()
                .textButton({ text: "🔙 Назад", payload: `vpn_page_1` });

            await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
        }
    });
}