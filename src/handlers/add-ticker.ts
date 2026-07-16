import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { hasInWatchlist, addToWatchlist } from "../lib/store.js";
import { validateTicker, fetchPrices, formatPrice } from "../lib/coingecko.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("add:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  ctx.session.step = "awaiting_add_ticker";
  await ctx.editMessageText(
    "Which coin do you want to track?\n\nType the ticker symbol (e.g. BTC, ETH, SOL).",
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

composer.command("add", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const text = ctx.message?.text?.trim();
  const parts = text?.split(/\s+/) ?? [];
  const ticker = parts[1]?.toUpperCase();
  if (ticker) {
    if (hasInWatchlist(userId, ticker)) {
      await ctx.reply(`${ticker} is already on your watchlist.`, {
        reply_markup: inlineKeyboard([[inlineButton("📋 View watchlist", "list:show")]]),
      });
      return;
    }
    const result = await validateTicker(ticker);
    if (!result.valid) {
      await ctx.reply(
        `Couldn't find a coin with ticker "${ticker}". Check the spelling and try again.`,
      );
      return;
    }
    const prices = await fetchPrices([ticker]);
    const price = prices[0]?.price_usd;
    addToWatchlist({
      user_id: userId,
      ticker,
      friendly_name: result.name ?? ticker,
      threshold_alerts: [],
      percent_alerts: [],
      enabled: true,
      last_alert_ts: 0,
      reference_price: price ?? 0,
    });
    const priceText = price ? ` at ${formatPrice(price)}` : "";
    await ctx.reply(`✅ Added ${result.name} (${ticker})${priceText} to your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add another", "add:show")],
        [inlineButton("📋 View watchlist", "list:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  ctx.session.step = "awaiting_add_ticker";
  await ctx.reply(
    "Which coin do you want to track?\n\nType the ticker symbol (e.g. BTC, ETH, SOL).",
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_add_ticker") return next();
  const ticker = ctx.message.text.trim().toUpperCase();
  const userId = ctx.from?.id;
  if (!userId) return;
  if (!/^[A-Z0-9]{1,10}$/.test(ticker)) {
    await ctx.reply("Please enter a valid ticker symbol (e.g. BTC, ETH).");
    return;
  }
  if (hasInWatchlist(userId, ticker)) {
    ctx.session.step = undefined;
    await ctx.reply(`${ticker} is already on your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add another", "add:show")],
        [inlineButton("📋 View watchlist", "list:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  const result = await validateTicker(ticker);
  if (!result.valid) {
    await ctx.reply(
      `Couldn't find a coin with ticker "${ticker}". Check the spelling and try again.`,
    );
    return;
  }
  const prices = await fetchPrices([ticker]);
  const price = prices[0]?.price_usd;
  addToWatchlist({
    user_id: userId,
    ticker,
    friendly_name: result.name ?? ticker,
    threshold_alerts: [],
    percent_alerts: [],
    enabled: true,
    last_alert_ts: 0,
    reference_price: price ?? 0,
  });
  ctx.session.step = undefined;
  const priceText = price ? ` at ${formatPrice(price)}` : "";
  await ctx.reply(`✅ Added ${result.name} (${ticker})${priceText} to your watchlist.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add another", "add:show")],
      [inlineButton("📋 View watchlist", "list:show")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
