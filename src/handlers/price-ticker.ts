import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getWatchlist } from "../lib/store.js";
import { fetchPrices, formatPrice } from "../lib/coingecko.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("price:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nAdd some coins first, then check their prices here.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add coin", "add:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  await ctx.editMessageText("Fetching latest prices…", {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
  const tickers = entries.map((e) => e.ticker);
  const prices = await fetchPrices(tickers);
  if (prices.length === 0) {
    await ctx.editMessageText(
      "Couldn't fetch prices right now. Try again in a moment.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("🔄 Retry", "price:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const priceMap = new Map(prices.map((p) => [p.ticker, p.price_usd]));
  const lines = entries.map((e) => {
    const price = priceMap.get(e.ticker);
    const priceText = price !== undefined ? formatPrice(price) : "N/A";
    return `• ${e.ticker}: ${priceText}`;
  });
  await ctx.editMessageText(
    `💰 Current prices\n\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔄 Refresh", "price:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^price:coin:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const ticker = match[1];
  const prices = await fetchPrices([ticker]);
  const price = prices[0]?.price_usd;
  if (price !== undefined) {
    await ctx.editMessageText(
      `💰 ${ticker}: ${formatPrice(price)}`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("🔄 Refresh", `price:coin:${ticker}`)],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
  } else {
    await ctx.editMessageText(
      `Couldn't fetch the price for ${ticker}. Try again later.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("🔄 Retry", `price:coin:${ticker}`)],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
  }
});

composer.command("price", async (ctx) => {
  const userId = ctx.from?.id;
  const text = ctx.message?.text?.trim();
  const parts = text?.split(/\s+/) ?? [];
  const tickerArg = parts[1]?.toUpperCase();
  if (tickerArg) {
    const prices = await fetchPrices([tickerArg]);
    const price = prices[0]?.price_usd;
    if (price !== undefined) {
      await ctx.reply(`💰 ${tickerArg}: ${formatPrice(price)}`, {
        reply_markup: inlineKeyboard([
          [inlineButton("🔄 Refresh", `price:coin:${tickerArg}`)],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      });
    } else {
      await ctx.reply(`Couldn't fetch the price for ${tickerArg}. Check the ticker and try again.`, {
        reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
      });
    }
    return;
  }
  if (!userId) return;
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.reply(
      "Your watchlist is empty.\n\nAdd some coins first, then check their prices here.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add coin", "add:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const tickers = entries.map((e) => e.ticker);
  const prices = await fetchPrices(tickers);
  const priceMap = new Map(prices.map((p) => [p.ticker, p.price_usd]));
  const lines = entries.map((e) => {
    const price = priceMap.get(e.ticker);
    const priceText = price !== undefined ? formatPrice(price) : "N/A";
    return `• ${e.ticker}: ${priceText}`;
  });
  await ctx.reply(`💰 Current prices\n\n${lines.join("\n")}`, {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "price:show")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
