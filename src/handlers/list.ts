import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getWatchlist } from "../lib/store.js";
import { fetchPrices, formatPrice } from "../lib/coingecko.js";

const PAGE_SIZE = 5;

function buildListMessage(entries: Array<{ ticker: string; friendly_name: string; reference_price: number }>, page: number): string {
  if (entries.length === 0) {
    return "Your watchlist is empty.\n\nTap ➕ Add coin to track your first one.";
  }
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageEntries = entries.slice(start, start + PAGE_SIZE);
  const lines = pageEntries.map((e) => {
    const priceText = e.reference_price > 0 ? ` — ${formatPrice(e.reference_price)}` : "";
    return `• ${e.ticker} (${e.friendly_name})${priceText}`;
  });
  let msg = `📋 Watchlist (${entries.length} coins)\n\n${lines.join("\n")}`;
  if (totalPages > 1) msg += `\n\nPage ${page + 1}/${totalPages}`;
  return msg;
}

const composer = new Composer<Ctx>();

composer.callbackQuery("list:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nTap ➕ Add coin to track your first one.",
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
  const enriched = entries.map((e) => ({
    ...e,
    reference_price: priceMap.get(e.ticker) ?? e.reference_price,
  }));
  const page = 0;
  const totalPages = Math.ceil(enriched.length / PAGE_SIZE);
  const rows = enriched.slice(0, PAGE_SIZE).map((e) => [
    inlineButton(`${e.ticker} — ${formatPrice(e.reference_price)}`, `price:coin:${e.ticker}`),
  ]);
  if (totalPages > 1) {
    rows.push([inlineButton("Next »", "list:page:1")]);
  }
  rows.push([inlineButton("➕ Add coin", "add:show")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText(buildListMessage(enriched, page), {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^list:page:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const page = parseInt(match[1], 10);
  const userId = ctx.from?.id;
  if (!userId) return;
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nTap ➕ Add coin to track your first one.",
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
  const enriched = entries.map((e) => ({
    ...e,
    reference_price: priceMap.get(e.ticker) ?? e.reference_price,
  }));
  const totalPages = Math.ceil(enriched.length / PAGE_SIZE);
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageEntries = enriched.slice(start, start + PAGE_SIZE);
  const rows = pageEntries.map((e) => [
    inlineButton(`${e.ticker} — ${formatPrice(e.reference_price)}`, `price:coin:${e.ticker}`),
  ]);
  const controls: Array<Array<{ text: string; callback_data: string }>> = [];
  if (safePage > 0) controls.push([inlineButton("« Prev", `list:page:${safePage - 1}`)]);
  if (safePage < totalPages - 1) controls.push([inlineButton("Next »", `list:page:${safePage + 1}`)]);
  rows.push(...controls);
  rows.push([inlineButton("➕ Add coin", "add:show")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText(buildListMessage(enriched, safePage), {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.command("list", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.reply(
      "Your watchlist is empty.\n\nTap ➕ Add coin to track your first one.",
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
  const enriched = entries.map((e) => ({
    ...e,
    reference_price: priceMap.get(e.ticker) ?? e.reference_price,
  }));
  const lines = enriched.map((e) => {
    const priceText = e.reference_price > 0 ? ` — ${formatPrice(e.reference_price)}` : "";
    return `• ${e.ticker} (${e.friendly_name})${priceText}`;
  });
  await ctx.reply(`📋 Watchlist (${enriched.length} coins)\n\n${lines.join("\n")}`, {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add coin", "add:show")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
