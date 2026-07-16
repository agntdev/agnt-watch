import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "ℹ️ Crypto Watchlist bot\n\n" +
  "Track crypto prices and get alerts when they hit your targets.\n\n" +
  "How it works:\n" +
  "• Tap ⏱ Price to see current prices\n" +
  "• Tap 📋 My watchlist to manage tracked coins\n" +
  "• Tap ➕ Add coin to start tracking a new one\n" +
  "• Tap ⚙️ Settings to configure alerts and quiet hours\n\n" +
  "Commands:\n" +
  "/start — Open the main menu\n" +
  "/help — Show this message\n" +
  "/add BTC — Quick-add a coin\n" +
  "/remove BTC — Quick-remove a coin\n" +
  "/list — View your watchlist\n" +
  "/price — Check current prices";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
