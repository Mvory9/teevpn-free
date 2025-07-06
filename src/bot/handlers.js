import { InlineKeyboardBuilder } from "puregram";
import { sendMessage, telegram } from "./telegram.js";
import db from "../db/mongodb.js";

export function initHandlers() {
    telegram.updates.on("message", async (context) => {
        if (!context.text) return; // Ignore non-text messages

        let user = await db.getUser(context.from.id);
        if (!user) await db.regUser(context.from.id);
        user = await db.getUser(context.from.id);

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

        if (context.text.toLowerCase() === "/start") {
            // await context.send("Привет! Я бот для управления бесплатным VPN от @teevpn_bot. Используйте клавиутуру для взаимодействия со мной.");

            
        }
    });
}