import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getMetrics, updateMetrics } from "../lib/store.js";

const OWNER_ID = process.env.BOT_OWNER_ID ? parseInt(process.env.BOT_OWNER_ID, 10) : 0;

const composer = new Composer<Ctx>();

function buildMetricsText(): string {
  const m = updateMetrics();
  const topTickers = m.top_tickers.length > 0
    ? m.top_tickers.map((t) => `  ${t.ticker}: ${t.count} users`).join("\n")
    : "  No data yet";
  return (
    `📊 Admin Dashboard\n\n` +
    `Total users: ${m.total_users}\n` +
    `Active users (30d): ${m.active_users_30d}\n` +
    `Total alerts: ${m.alert_type_counts.threshold + m.alert_type_counts.percent}\n` +
    `  Threshold: ${m.alert_type_counts.threshold}\n` +
    `  Percent: ${m.alert_type_counts.percent}\n\n` +
    `Top tickers:\n${topTickers}`
  );
}

composer.command("admin", async (ctx) => {
  if (!OWNER_ID || ctx.from?.id !== OWNER_ID) {
    await ctx.reply("This command is restricted to the bot owner.");
    return;
  }
  await ctx.reply(buildMetricsText(), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "admin:refresh")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("admin:refresh", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!OWNER_ID || ctx.from?.id !== OWNER_ID) {
    await ctx.answerCallbackQuery({ text: "Not authorized", show_alert: true });
    return;
  }
  await ctx.editMessageText(buildMetricsText(), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "admin:refresh")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
