import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getOrCreateProfile, saveProfile } from "../lib/store.js";

const TIMEZONE_OPTIONS = [
  { label: "UTC", data: "stz:UTC" },
  { label: "EST (UTC-5)", data: "stz:America/New_York" },
  { label: "CST (UTC-6)", data: "stz:America/Chicago" },
  { label: "PST (UTC-8)", data: "stz:America/Los_Angeles" },
  { label: "GMT (UTC+0)", data: "stz:Europe/London" },
  { label: "CET (UTC+1)", data: "stz:Europe/Berlin" },
  { label: "IST (UTC+5:30)", data: "stz:Asia/Kolkata" },
  { label: "JST (UTC+9)", data: "stz:Asia/Tokyo" },
  { label: "AEST (UTC+10)", data: "stz:Australia/Sydney" },
];

const COOLDOWN_OPTIONS = [
  { label: "15 min", data: "cd:15" },
  { label: "30 min", data: "cd:30" },
  { label: "1 hour", data: "cd:60" },
  { label: "2 hours", data: "cd:120" },
  { label: "4 hours", data: "cd:240" },
];

const composer = new Composer<Ctx>();

function buildSettingsText(userId: number): string {
  const profile = getOrCreateProfile(userId, "User");
  const qhStart = String(profile.quiet_hours_start).padStart(2, "0") + ":00";
  const qhEnd = String(profile.quiet_hours_end).padStart(2, "0") + ":00";
  const cdMin = profile.cooldown_length;
  const cdText = cdMin >= 60 ? `${cdMin / 60} hour${cdMin > 60 ? "s" : ""}` : `${cdMin} min`;
  return (
    `⚙️ Settings\n\n` +
    `Timezone: ${profile.timezone}\n` +
    `Quiet hours: ${qhStart}–${qhEnd}\n` +
    `Summary time: ${profile.summary_time}\n` +
    `Cooldown: ${cdText}\n` +
    `Percent alerts: ${profile.percent_alert_enabled ? "On" : "Off"}\n` +
    `Threshold alerts: ${profile.threshold_alert_enabled ? "On" : "Off"}`
  );
}

composer.callbackQuery("settings:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.editMessageText(buildSettingsText(userId), {
    reply_markup: inlineKeyboard([
      [inlineButton("🌍 Timezone", "settings:tz"), inlineButton("🌙 Quiet hours", "settings:qh")],
      [inlineButton("🔔 Summary time", "settings:summary"), inlineButton("⏱ Cooldown", "settings:cd")],
      [inlineButton("📊 Percent alerts", "settings:pct"), inlineButton("📈 Threshold alerts", "settings:thresh")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.command("settings", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.reply(buildSettingsText(userId), {
    reply_markup: inlineKeyboard([
      [inlineButton("🌍 Timezone", "settings:tz"), inlineButton("🌙 Quiet hours", "settings:qh")],
      [inlineButton("🔔 Summary time", "settings:summary"), inlineButton("⏱ Cooldown", "settings:cd")],
      [inlineButton("📊 Percent alerts", "settings:pct"), inlineButton("📈 Threshold alerts", "settings:thresh")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

// --- Timezone ---

composer.callbackQuery("settings:tz", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_tz_setting";
  await ctx.editMessageText("Select your timezone:", {
    reply_markup: inlineKeyboard([
      ...TIMEZONE_OPTIONS.map((o) => [inlineButton(o.label, o.data)]),
      [inlineButton("⬅️ Back to settings", "settings:show")],
    ]),
  });
});

for (const opt of TIMEZONE_OPTIONS) {
  composer.callbackQuery(opt.data, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    const tz = opt.data.split(":").slice(1).join(":");
    const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
    profile.timezone = tz;
    saveProfile(profile);
    ctx.session.step = undefined;
    await ctx.editMessageText(
      `✅ Timezone set to ${opt.label}.\n\n${buildSettingsText(userId)}`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("🌍 Timezone", "settings:tz"), inlineButton("🌙 Quiet hours", "settings:qh")],
          [inlineButton("🔔 Summary time", "settings:summary"), inlineButton("⏱ Cooldown", "settings:cd")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
  });
}

// --- Quiet hours ---

composer.callbackQuery("settings:qh", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const profile = getOrCreateProfile(userId, "User");
  const start = String(profile.quiet_hours_start).padStart(2, "0") + ":00";
  const end = String(profile.quiet_hours_end).padStart(2, "0") + ":00";
  await ctx.editMessageText(
    `Quiet hours: ${start}–${end}\n\nAlerts won't be sent during quiet hours. Choose new hours:`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("22:00–07:00", "qh:22:7"), inlineButton("23:00–07:00", "qh:23:7")],
        [inlineButton("00:00–08:00", "qh:0:8"), inlineButton("21:00–06:00", "qh:21:6")],
        [inlineButton("No quiet hours", "qh:off")],
        [inlineButton("⬅️ Back to settings", "settings:show")],
      ]),
    },
  );
});

composer.callbackQuery(/^qh:(\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const userId = ctx.from?.id;
  if (!userId) return;
  const start = parseInt(match[1], 10);
  const end = parseInt(match[2], 10);
  const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
  profile.quiet_hours_start = start;
  profile.quiet_hours_end = end;
  saveProfile(profile);
  const startStr = String(start).padStart(2, "0") + ":00";
  const endStr = String(end).padStart(2, "0") + ":00";
  await ctx.editMessageText(
    `✅ Quiet hours set to ${startStr}–${endStr}.\n\n${buildSettingsText(userId)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to settings", "settings:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("qh:off", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
  profile.quiet_hours_start = 0;
  profile.quiet_hours_end = 0;
  saveProfile(profile);
  await ctx.editMessageText(
    `✅ Quiet hours disabled.\n\n${buildSettingsText(userId)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to settings", "settings:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

// --- Summary time ---

composer.callbackQuery("settings:summary", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_summary_time";
  await ctx.editMessageText(
    "When should the daily summary be sent?\n\nType a time in HH:MM format (e.g. 08:00, 18:30).",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("08:00", "summary:08:00"), inlineButton("09:00", "summary:09:00")],
        [inlineButton("18:00", "summary:18:00"), inlineButton("20:00", "summary:20:00")],
        [inlineButton("⬅️ Back to settings", "settings:show")],
      ]),
    },
  );
});

composer.callbackQuery(/^summary:(\d{2}):(\d{2})$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.match;
  if (!match) return;
  const userId = ctx.from?.id;
  if (!userId) return;
  const time = `${match[1]}:${match[2]}`;
  const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
  profile.summary_time = time;
  saveProfile(profile);
  await ctx.editMessageText(
    `✅ Daily summary set for ${time}.\n\n${buildSettingsText(userId)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to settings", "settings:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_summary_time") return next();
  const text = ctx.message.text.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) {
    await ctx.reply("Please enter a valid time in HH:MM format (e.g. 08:00).");
    return;
  }
  const hour = parseInt(match[1], 10);
  const minute = match[2];
  if (hour < 0 || hour > 23) {
    await ctx.reply("Hour must be between 0 and 23. Try again.");
    return;
  }
  const userId = ctx.from?.id;
  if (!userId) return;
  const time = `${String(hour).padStart(2, "0")}:${minute}`;
  const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
  profile.summary_time = time;
  saveProfile(profile);
  ctx.session.step = undefined;
  await ctx.reply(`✅ Daily summary set for ${time}.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to settings", "settings:show")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

// --- Cooldown ---

composer.callbackQuery("settings:cd", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Alert cooldown — minimum time between alerts for the same coin.\n\nPick a duration:",
    {
      reply_markup: inlineKeyboard([
        ...COOLDOWN_OPTIONS.map((o) => [inlineButton(o.label, o.data)]),
        [inlineButton("⬅️ Back to settings", "settings:show")],
      ]),
    },
  );
});

for (const opt of COOLDOWN_OPTIONS) {
  composer.callbackQuery(opt.data, async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    const minutes = parseInt(opt.data.split(":")[1], 10);
    const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
    profile.cooldown_length = minutes;
    saveProfile(profile);
    const cdText = minutes >= 60 ? `${minutes / 60} hour${minutes > 60 ? "s" : ""}` : `${minutes} min`;
    await ctx.editMessageText(
      `✅ Cooldown set to ${cdText}.\n\n${buildSettingsText(userId)}`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("⬅️ Back to settings", "settings:show")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
  });
}

// --- Alert toggles ---

composer.callbackQuery("settings:pct", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
  profile.percent_alert_enabled = !profile.percent_alert_enabled;
  saveProfile(profile);
  const status = profile.percent_alert_enabled ? "enabled" : "disabled";
  await ctx.editMessageText(
    `✅ Percent alerts ${status}.\n\n${buildSettingsText(userId)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to settings", "settings:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("settings:thresh", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  const profile = getOrCreateProfile(userId, ctx.from?.first_name ?? "User");
  profile.threshold_alert_enabled = !profile.threshold_alert_enabled;
  saveProfile(profile);
  const status = profile.threshold_alert_enabled ? "enabled" : "disabled";
  await ctx.editMessageText(
    `✅ Threshold alerts ${status}.\n\n${buildSettingsText(userId)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("⬅️ Back to settings", "settings:show")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

export default composer;
