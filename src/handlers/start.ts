import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getOrCreateProfile, saveProfile } from "../lib/store.js";

registerMainMenuItem({ label: "⏱ Price", data: "price:show", order: 10 });
registerMainMenuItem({ label: "📋 My watchlist", data: "list:show", order: 20 });
registerMainMenuItem({ label: "➕ Add coin", data: "add:show", order: 30 });
registerMainMenuItem({ label: "⚙️ Settings", data: "settings:show", order: 50 });

const WELCOME =
  "👋 Welcome to Crypto Watchlist!\n\n" +
  "Track cryptocurrency prices and get alerts when they hit your targets.\n\n" +
  "Tap a button below to get started.";

const TIMEZONE_OPTIONS = [
  { label: "UTC", data: "tz:UTC" },
  { label: "EST (UTC-5)", data: "tz:America/New_York" },
  { label: "CST (UTC-6)", data: "tz:America/Chicago" },
  { label: "PST (UTC-8)", data: "tz:America/Los_Angeles" },
  { label: "GMT (UTC+0)", data: "tz:Europe/London" },
  { label: "CET (UTC+1)", data: "tz:Europe/Berlin" },
  { label: "IST (UTC+5:30)", data: "tz:Asia/Kolkata" },
  { label: "JST (UTC+9)", data: "tz:Asia/Tokyo" },
  { label: "AEST (UTC+10)", data: "tz:Australia/Sydney" },
  { label: "Skip for now", data: "tz:skip" },
];

const composer = new Composer<Ctx>();

function mainMenuKeyboard() {
  return inlineKeyboard([
    [inlineButton("⏱ Price", "price:show"), inlineButton("📋 My watchlist", "list:show")],
    [inlineButton("➕ Add coin", "add:show"), inlineButton("⚙️ Settings", "settings:show")],
  ]);
}

composer.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    getOrCreateProfile(userId, ctx.from?.first_name ?? "there");
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("tz:skip", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = undefined;
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

for (const opt of TIMEZONE_OPTIONS) {
  if (opt.data === "tz:skip") continue;
  composer.callbackQuery(opt.data, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    const tz = opt.data.split(":")[1];
    if (userId && tz) {
      const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
      profile.timezone = tz;
      saveProfile(profile);
    }
    ctx.session.step = undefined;
    await ctx.editMessageText(
      `✅ Timezone set to ${opt.label}.\n\n${WELCOME}`,
      { reply_markup: mainMenuKeyboard() },
    );
  });
}

export default composer;
