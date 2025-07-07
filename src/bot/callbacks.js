import { InlineKeyboardBuilder } from "puregram";
import { sendMessage, telegram } from "./telegram.js";
import db from "../db/mongodb.js";

export function initCallbacks() {
    telegram.updates.on("callback_query", async (context) => {
        if (!context.queryPayload) return;

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

        if (context.text.toLowerCase() === "/start") {
            const { firstName, lastName } = context.from;
            const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Пользователь";

            const text =
                `Привет, <b>${fullName}</b>! 👋\n\n` +
                `Я бот для управления бесплатным VPN от <a href="${process.env.ORIGINAL_PROJECT}">${process.env.ORIGINAL_PROJECT_NAME}</a>.\n` +
                `Ты можешь использовать бесплатный VPN с <b>1 ГБ ежедневного трафика</b>, который сбрасывается каждый день в полночь. 🌙\n\n` +
                `Помощь можно получить по команде /help либо у технической поддержки.\n\n` +
                `Чтобы начать, просто используй кнопки ниже! 🚀\n`;

            const keyboard = new InlineKeyboardBuilder()
                .textButton({ text: "🛒 Получить конфигурацию", payload: "get_config" })
                .textButton({ text: "Мои конфигурации", payload: "my_config" })
                .row()
                .urlButton({ text: "💬 Техническая поддержка", url: process.env.SUPPORT_LINK });

            await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
        }

        
    });
}