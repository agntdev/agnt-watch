import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getWatchlist, removeFromWatchlist } from "../lib/store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("remove:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty — nothing to remove.\n\nTap ➕ Add coin to track your first one.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add coin", "add:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const rows = entries.map((e) => [
    inlineButton(`🗑 Remove ${e.ticker}`, `remove:confirm:${e.ticker}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Select a coin to remove from your watchlist:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.command("remove", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const text = ctx.message?.text?.trim();
  const parts = text?.split(/\s+/) ?? [];
  const ticker = parts[1]?.toUpperCase();
  if (ticker) {
    const removed = removeFromWatchlist(userId, ticker);
    if (removed) {
      await ctx.reply(`✅ Removed ${ticker} from your watchlist.`, {
        reply_markup: inlineKeyboard([
          [inlineButton("📋 View watchlist", "list:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      });
    } else {
      await ctx.reply(`${ticker} isn't on your watchlist.`, {
        reply_markup: inlineKeyboard([
          [inlineButton("📋 View watchlist", "list:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      });
    }
    return;
  }
  const entries = getWatchlist(userId);
  if (entries.length === 0) {
    await ctx.reply(
      "Your watchlist is empty — nothing to remove.\n\nTap ➕ Add coin to track your first one.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add coin", "add:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const rows = entries.map((e) => [
    inlineButton(`🗑 Remove ${e.ticker}`, `remove:confirm:${e.ticker}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply("Select a coin to remove from your watchlist:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^remove:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const ticker = match[1];
  const userId = ctx.from?.id;
  if (!userId || !ticker) return;
  const removed = removeFromWatchlist(userId, ticker);
  if (removed) {
    await ctx.editMessageText(`✅ Removed ${ticker} from your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("📋 View watchlist", "list:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  } else {
    await ctx.editMessageText(`${ticker} isn't on your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("📋 View watchlist", "list:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
  }
});

export default composer;
