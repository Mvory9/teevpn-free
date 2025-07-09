import { telegram, sendMessage } from "./telegram.js";
import db from "../db/mongodb.js";
import { InlineKeyboardBuilder } from "puregram";
import { getWireGuardClients } from "../services/wireguard.js";
import { v4 as uuidv4 } from 'uuid';

// Utility to sanitize custom name
function sanitizeCustomName(name) {
    return name ? name.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '').slice(0, 20) : null;
}

export function initHandlers() {
    telegram.updates.on("message", async (context) => {
        const errorId = uuidv4();
        try {
            if (!context.from || !context.from.id || !/^\d+$/.test(context.from.id)) {
                throw new Error('Неверный Telegram ID пользователя');
            }
            if (!context.text || typeof context.text !== 'string') {
                throw new Error('Неверный формат сообщения');
            }

            const telegramId = Number(context.from.id);
            console.log(`[INFO][${telegramId}]: Message received: ${context.text}`);

            let user = await db.getUser(telegramId);
            if (!user) {
                user = await db.regUser(telegramId);
                if (!user) {
                    throw new Error('Не удалось зарегистрировать пользователя');
                }
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

                await sendMessage(telegramId, text, { parse_mode: "html", reply_markup: keyboard });
                return;
            }

            const args = context.text.split(/\s+/);
            const command = args[0].toLowerCase();

            if (command === "/start") {
                const { firstName, lastName } = context.from;
                const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Пользователь";

                const text =
                    `Привет, <b>${fullName}</b>! 👋\n\n` +
                    `Я бот для управления бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>.\n` +
                    `Ты можешь использовать бесплатный VPN с <b>1 ГБ ежедневного трафика</b>, который сбрасывается каждый день в полночь. 🌙\n\n` +
                    `Помощь можно получить по команде /help либо у технической поддержки.\n\n` +
                    `🔁 Безлимитый VPN: <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>\n` +
                    `💬 Если возникли вопросы, пиши в <a href="${process.env.SUPPORT_LINK}">техподдержку</a>.\n` +
                    `👩‍💻 Гитхаб проекта: <a href="https://github.com/Mvory9/teevpn-free">https://github.com/Mvory9/teevpn-free</a>\n\n` +
                    `Чтобы начать, просто используй кнопки ниже! 🚀\n`;

                const keyboard = new InlineKeyboardBuilder()
                    .textButton({ text: "🛒 Получить конфигурацию", payload: "get_free_configs_1" })
                    .textButton({ text: "💼 Мои конфигурации", payload: "my_configs_1" })
                    .row()
                    .textButton({ text: "🖥 Сервера", payload: "online" })
                    .row()
                    .urlButton({ text: "💬 Техническая поддержка", url: process.env.SUPPORT_LINK });

                await sendMessage(telegramId, text, { parse_mode: "html", reply_markup: keyboard });
                return;
            }

            if (command === "/help") {
                const text =
                    `📚 <b>Помощь по использованию бота</b>\n\n` +
                    `Я бот для управления бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>. Вот что я умею:\n\n` +
                    `🔹 <b>/start</b> — Начать работу с ботом и открыть главное меню.\n` +
                    `🔹 <b>/help</b> — Показать это сообщение с инструкциями.\n` +
                    `🔹 <b>/online</b> — Онлайн, статистика и описание серверов.\n` +
                    `🔹 <b>/rename [ID конфигурации] [новое название]</b> — Изменить название конфигурации (до 20 символов).\n` +
                    `   Пример: <code>/rename 123e4567-e89b-12d3-a456-426614174000 Дом</code>\n` +
                    `   Для сброса названия: <code>/rename 123e4567-e89b-12d3-a456-426614174000 сброс</code>\n\n` +
                    `📌 <b>Как получить конфигурацию?</b>\n` +
                    `1. Нажми "Получить конфигурацию" в меню.\n` +
                    `2. Выбери страну и сервер.\n` +
                    `3. Получи файл .conf или QR-код для подключения.\n\n` +
                    `📌 <b>Как использовать конфигурацию?</b>\n` +
                    `1. Установи приложение AmneziaWG.\n` +
                    `2. Импортируй .conf файл или отсканируй QR-код.\n` +
                    `3. Активируй VPN и наслаждайся! 🚀\n\n` +
                    `📌 <b>Ограничения:</b>\n` +
                    `— Бесплатный доступ: 1 ГБ трафика в день.\n` +
                    `— Трафик сбрасывается ежедневно в 00:00 по МСК.\n\n` +
                    `💬 Если возникли вопросы, пиши в <a href="${process.env.SUPPORT_LINK}">техподдержку</a>.\n` +
                    `👩‍💻 Гитхаб проекта: <a href="https://github.com/Mvory9/teevpn-free">https://github.com/Mvory9/teevpn-free</a>`;

                await sendMessage(telegramId, text, { parse_mode: "html" });
                return;
            }

            if (command === "/rename") {
                if (args.length < 3) {
                    await sendMessage(telegramId, 
                        `❗ Неверный формат команды. Используй: <code>/rename [ID конфигурации] [новое название]</code>\n` +
                        `Пример: <code>/rename 123e4567-e89b-12d3-a456-426614174000 Дом</code>`, 
                        { parse_mode: "html" }
                    );
                    return;
                }

                const configId = args[1];
                const customName = args.slice(2).join(" ");
                if (!configId || !/^[0-9a-f-]{36}$/.test(configId)) {
                    throw new Error('Неверный ID конфигурации');
                }
                if (customName.length > 20) {
                    throw new Error('Название конфигурации слишком длинное (максимум 20 символов)');
                }

                const config = await db.getConfig({ telegramId, configId });
                if (!config) {
                    await sendMessage(telegramId, 
                        `❌ Конфигурация не найдена. Проверьте ID конфигурации или обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                        { parse_mode: "html" }
                    );
                    return;
                }

                const sanitizedName = customName.toLowerCase() === "сброс" ? null : sanitizeCustomName(customName);
                await db.setConfig({ telegramId, configId }, { $set: { customName: sanitizedName } });

                const text = sanitizedName 
                    ? `✅ Название конфигурации успешно изменено на "${sanitizedName}"!`
                    : `✅ Название конфигурации сброшено!`;

                await sendMessage(telegramId, text, { parse_mode: "html" });
                return;
            }

            if (context.text === "/online") {
                const errorId = uuidv4();
                try {
                    const servers = await db.getServers();
                    if (!servers || !Array.isArray(servers)) {
                        throw new Error('Не удалось получить список серверов');
                    }

                    let text = `<b>🖥️ Статус серверов</b>\n\n`;
                    const keyboard = new InlineKeyboardBuilder();

                    if (servers.length === 0) {
                        text += `😔 У проекта пока что нет серверов.\n`;
                    } else {
                        let totalOnline = 0;

                        for (const server of servers) {
                            const clientsOnServer = await getWireGuardClients(server);
                            if (!clientsOnServer || !Array.isArray(clientsOnServer)) {
                                console.warn(`[WARN][${errorId}][${server.serverLocationName}]: Не удалось получить клиентов`);
                                continue;
                            }

                            const fiveMinWithMs = 5 * 60 * 1000;
                            const timestamp = Date.now();
                            const onlineClients = clientsOnServer.filter(client => 
                                client.latestHandshakeAt && 
                                timestamp - new Date(client.latestHandshakeAt).getTime() < fiveMinWithMs
                            );
                            const onlineOnServer = onlineClients.length || 0;
                            totalOnline += onlineOnServer;

                            text += `🌐 <b>${server.serverLocationName}</b> │ ${server.city}\n` +
                                `├ 👥 <b>Онлайн:</b> <code>${onlineOnServer}</code>\n` +
                                /*`${user.isAdmin ? `├ 📊 <b>Всего конфигураций:</b> <code>${totalCount}</code>\n` : ""}` +*/
                                `├ 🔗 <b>Протокол:</b> ${server.type === "wg" ? "WireGuard" : "AmneziaWG"}\n` +
                                `├ 🧠 <b>Нейросеть Gemini:</b> ${server.properties.gemini ? "✅" : "❌"}\n` +
                                `└ 📺 <b>YouTube без рекламы:</b> ${server.properties.youtubeNoAds ? "✅" : "❌"}\n\n`;
                        }

                        text += `<b>🕸 Общий онлайн:</b> <code>${totalOnline}</code> человек.`;
                    }

                    keyboard.textButton({ text: "🔙 Назад", payload: "start" });

                    await sendMessage(context.from.id, text, {
                        parse_mode: "html",
                        reply_markup: keyboard
                    });
                } catch (error) {
                    console.error(`[ERROR][${errorId}][${context.from.id}]: Ошибка при обработке online:`, error);
                    await sendMessage(context.from.id, 
                        `❌ Произошла ошибка при получении информации о серверах. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                        { parse_mode: "html" }
                    );
                    // Уведомление админа
                    if (process.env.SUPPORT_LINK.includes('t.me')) {
                        await sendMessage(process.env.ADMIN_ID, 
                            `⚠ Ошибка при получении статуса серверов для пользователя ${context.from.id}: ${error.message} (Код: ${errorId})`, 
                            { parse_mode: "html" }
                        ).catch(notifyError => {
                            console.error(`[ERROR][${errorId}][Notify]: Не удалось уведомить техподдержку:`, notifyError);
                        });
                    }
                }
                return;
            }

            await sendMessage(telegramId, 
                `❗ Неизвестная команда. Используй /help для списка доступных команд или обратись в <a href="${process.env.SUPPORT_LINK}">техподдержку</a>.`, 
                { parse_mode: "html" }
            );

        } catch (error) {
            console.error(`[ERROR][${errorId}][${context.from?.id || 'unknown'}]: Ошибка при обработке сообщения:`, error);
            if (context.from?.id && /^\d+$/.test(context.from.id)) {
                await sendMessage(context.from.id, 
                    `❌ Произошла ошибка. Обратитесь в техподдержку (${process.env.SUPPORT_LINK}) с кодом ошибки ${errorId}`, 
                    { parse_mode: "html" }
                );
            }
        }
    });
}