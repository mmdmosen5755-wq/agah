# آگاه — سایت، دستیار آنلاین و پنل ادمین

سایت معرفی اپ «آگاه» + دستیار هوشمند فارسی (Cloudflare Workers AI) + پنل ادمین برای بارگذاری و انتشار APK.
آدرس فعلی: https://agah.m-m-zarezade-mehrizi.workers.dev

## ساختار
```
wrangler.jsonc          تنظیمات کلودفلر (استاتیک + AI + KV)
src/worker.js           مسیرها: /api/chat ، /api/latest ، /download/* ، /api/admin/*
src/chat.js             دستیار هوشمند (Workers AI)
src/releases.js         ذخیره و دانلود APK + احراز هویت ادمین (KV)
public/                 خود سایت + پنل ادمین (public/admin/)
public/assets/config.js تنظیمات سایت (لینک دانلود خارجی اختیاری)
```

## ۱) گیت‌هاب و کلودفلر
1. محتوای این پوشه را در ریشه‌ی ریپوی گیت‌هاب آپلود کن (یا `git push`).
2. کلودفلر ← Workers & Pages ← Create ← Import a repository ← ریپو را انتخاب کن. Build command خالی؛ Deploy command: `npx wrangler deploy`.
3. در اولین دیپلوی، فضای ذخیره‌سازی KV (با نام `REL`) خودکار ساخته می‌شود.

> اگر دیپلوی به‌خاطر KV خطا داد: در داشبورد ← Storage & Databases ← KV ← Create namespace، شناسه‌اش را در `wrangler.jsonc` بگذار:
> `"kv_namespaces": [{ "binding": "REL", "id": "شناسه" }]`

## ۲) رمز ادمین (لازم)
Worker ← **Settings ← Variables and Secrets ← Add** ← نوع **Secret**، نام `ADMIN_PASSWORD`، مقدار: یک رمز قوی. بعد از ذخیره، نیازی به دیپلوی دوباره نیست.

## ۳) آپلود APK
1. برو به `/admin/` (مثلاً `https://agah.m-m-zarezade-mehrizi.workers.dev/admin/`) و با رمز وارد شو.
2. فایل APK و شماره‌ی نسخه (مثلاً `1.0.1`) و توضیح کوتاه را بده و «آپلود» را بزن.
3. فایل در تکه‌های ۴ مگابایتی در KV ذخیره و (اگر «منتشر شود» انتخاب باشد) به‌عنوان آخرین نسخه ثبت می‌شود.
4. دکمه‌های «دانلود» سایت خودکار به `/download/latest` وصل‌اند و نسخه و حجم را نشان می‌دهند. اپ هم از «تنظیمات › سایت و بروزرسانی» نسخه‌ی جدید را بررسی می‌کند.

محدودیت‌ها (پلن رایگان): هر ارزش KV حداکثر ۲۵ مگابایت (به همین دلیل تکه‌تکه می‌کنیم)، ۱ گیگابایت فضا، ۱۰۰۰ نوشتن در روز (هر APK حدود ۵ تا ۱۵ نوشتن). حداکثر حجم APK: ۱۰۰ مگابایت. بعد از انتشار ممکن است تا حدود یک دقیقه در بعضی نقاط دنیا دیده نشود.

## ۴) بررسی
- `/api/health` باید `{"ok":true,"ai":true,"store":true,"admin":true}` بدهد.
- نقطه‌ی کنار «دستیار آگاه» در سایت باید سبز باشد.

## ۵) اتصال اپ به سایت
در اپ: تنظیمات ← سایت و بروزرسانی ← آدرس سایت (یا `lib/config.dart` ← `kSiteUrl`). دکمه‌های «باز کردن سایت» و «دستیار آنلاین» و عبارت «دستیار آنلاین» در چت اپ، سایت را با `?from=app` باز می‌کنند.

## نکات
- **سهمیه‌ی AI:** Workers AI سهمیه‌ی رایگان روزانه دارد؛ اگر زود تمام شد در `src/chat.js` مدل را به `@cf/meta/llama-3.1-8b-instruct` تغییر بده.
- **امنیت ادمین:** کوکی HttpOnly/Secure/SameSite=Strict، محدودیت تلاش ورود، و بررسی Origin. رمز را هیچ‌جا در کد نگذار. برای حفاظت بیشتر یک Rate limiting rule روی `/api/*` در WAF بساز.
- **دامنه‌ی دلخواه:** Worker ← Settings ← Domains & Routes.
- **تست محلی:** `npm install` سپس `npx wrangler dev` (برای ADMIN_PASSWORD یک فایل `.dev.vars` با `ADMIN_PASSWORD=...` بساز).
