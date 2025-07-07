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

        if (context.text.toLowerCase() === "/help") {
            const text = `<b>🌟 Справка по боту ${process.env.PROJECT_NAME} 🌟</b>\n\n` +
                `📋 <b>Команды бота:</b>\n` +
                `  • <code>/start</code> — Запустить бота и открыть главное меню\n` +
                `  • <code>/help</code> — Показать вспомогательное сообщение\n` +
                `  • <code>/id</code> — Узнать ваш Telegram ID\n\n` +
                `🔗 <b>Полезные ссылки:</b>\n` +
                `  • <a href="${process.env.CHANNEL_LINK}">📢 Наш телеграм канал</a>\n` +
                `  • <a href="${process.env.SUPPORT_LINK}">💬 Техническая поддержка</a>\n\n` +
                `📲 <b>Установка WireGuard:</b>\n` +
                `  • <b>Windows:</b> Скачайте <a href="https://download.wireguard.com/windows-client/wireguard-installer.exe">WireGuard</a> с официального сайта, установите, импортируйте .conf файл.\n` +
                `  • <b>macOS:</b> Установите <a href="https://apps.apple.com/ru/app/wireguard/id1441195209">WireGuard</a> из App Store, добавьте конфигурацию через .conf файл или QR-код.\n` +
                `  • <b>Android:</b> Установите приложение <a href="https://play.google.com/store/apps/details?id=com.wireguard.android">WireGuard</a> из Google Play, импортируйте конфигурацию.\n` +
                `  • <b>iOS:</b> Загрузите <a href="https://apps.apple.com/ru/app/wireguard/id1441195209">WireGuard</a> из App Store, добавьте конфигурацию через QR-код или файл.\n` +
                `  • <b>Linux:</b> Установите <a href="https://www.wireguard.com/install/">WireGuard</a> через пакетный менеджер дистрибутива, импортируйте .conf.\n\n` +
                `🔐 <b>Установка AmneziaWG:</b>\n` +
                `  • <b>Windows:</b> Скачайте <a href="https://github.com/amnezia-vpn/amneziawg-windows-client/releases/download/1.0.0/amneziawg-amd64-1.0.0.msi">AmneziaWG</a> клиент, установите, импортируйте конфигурацию.\n` +
                `  • <b>macOS:</b> Установите <a href="https://apps.apple.com/ru/app/amneziawg/id6478942365">AmneziaWG</a>, добавьте .conf файл или отсканируйте QR-код.\n` +
                `  • <b>Android:</b> Загрузите <a href="https://play.google.com/store/apps/details?id=org.amnezia.awg">AmneziaWG</a> из Google Play, импортируйте конфигурацию.\n` +
                `  • <b>iOS:</b> Установите <a href="https://apps.apple.com/ru/app/amneziawg/id6478942365">AmneziaWG</a> из App Store, добавьте конфигурацию через файл или QR.\n` +
                `  • <b>Linux:</b> Установите <a href="https://amneziavpn.org/ru/documentation/installing-app-on-linux/">AmneziaWG</a>, следуя инструкциям на сайте, импортируйте .conf.\n\n` +
                `💡 <b>Нужна помощь?</b>\n` +
                `Если у вас есть вопросы или проблемы с настройкой, наша <a href="${process.env.SUPPORT_LINK}">техподдержка</a> всегда готова помочь! 🚀`;

            const keyboard = new InlineKeyboardBuilder()
                .urlButton({ text: "💬 Техническая поддержка", url: process.env.SUPPORT_LINK });

            await sendMessage(context.from.id, text, { parse_mode: "html", reply_markup: keyboard });
        }

        if (context.text.toLowerCase() === "/id") {
            const text = `🆔 Ваш Telegram ID: <code>${context.from.id}</code>`;
            await sendMessage(context.from.id, text, { parse_mode: "html" });
            return;
        }
    });
}