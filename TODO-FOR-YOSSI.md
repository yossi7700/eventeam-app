# פעולות נדרשות ממך — EvenTeam Rebuild

קובץ זה מתעדכן באופן שוטף עם כל דבר שאני לא יכול להשלים בעצמי — בעיקר מפתחות/סודות, החלטות עסקיות, ואישורים חיצוניים. עדכון אחרון: **כל 7 השלבים בתוכנית הושלמו**.

---

## 🔴 חוסם — נדרש כדי שהמערכת תעבוד באמת

### 1. Stripe (תשלומים)
כרגע כל תשלום בכרטיס אשראי נכשל בצורה מבוקרת ("not configured") כי אין מפתחות אמיתיים.

- [ ] ליצור חשבון Stripe (אם עוד אין) ולהפעיל **test mode**
- [ ] להביא: `STRIPE_SECRET_KEY` (sk_test_...), `STRIPE_CONNECT_CLIENT_ID` (ca_...) — מוגדר תחת Stripe Connect settings
- [ ] להגדיר Webhook endpoint ב-Stripe Dashboard שמצביע ל: `https://nauyrqtdlqdqyxgrdlex.supabase.co/functions/v1/stripe-webhook`
  ולקבל ממנו את `STRIPE_WEBHOOK_SECRET` (whsec_...)
- [ ] לקבוע את `STRIPE_CONNECT_REDIRECT_URI` (כתובת ב-frontend שתקבל את חזרת ה-OAuth, למשל `https://<your-domain>/settings/payment`)
- [ ] להריץ בטרמינל (או לבקש ממני להריץ כשתהיה לי גישת CLI מחוברת לפרויקט):
  ```
  supabase secrets set STRIPE_SECRET_KEY=sk_test_...
  supabase secrets set STRIPE_CONNECT_CLIENT_ID=ca_...
  supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
  supabase secrets set STRIPE_CONNECT_REDIRECT_URI=https://...
  ```
- [ ] להביא לי את **מפתח ה-publishable** (pk_test_...) כדי לעדכן ב-`.env.local` את `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (וב-Vercel כשנפרוס)

### 1.5 CORS — דומיין הפרודקשן (חדש ב-Phase 7)
תיקנתי באג אמיתי: כל ה-Edge Functions לא טיפלו כלל ב-preflight requests (OPTIONS) — כלומר **כל קריאה מהדפדפן הייתה נכשלת** (לא רק מ-origin לא מורשה — מכל origin, כולל שלנו). זה תוקן עם רשימת origins מורשים מפורשת (במקום ה-`*` הפתוח של המערכת הישנה). כרגע `localhost` בפיתוח עובד אוטומטית.
- [ ] כשיהיה לך דומיין production (Vercel/eventeam.online), תגיד לי ואני ארוץ:
  `supabase secrets set ALLOWED_ORIGINS=https://your-domain.com,https://your-app.vercel.app`

### 2. Resend (שליחת אימיילים)
כרגע כל שליחת מייל נכשלת בצורה מבוקרת ("not configured").

- [ ] ליצור חשבון ב-[resend.com](https://resend.com) (יש תוכנית חינמית)
- [ ] לאמת דומיין שלך (או להשתמש בדומיין הבדיקה של Resend זמנית)
- [ ] להביא `RESEND_API_KEY` (re_...)
- [ ] להריץ: `supabase secrets set RESEND_API_KEY=re_...`
- [ ] להחליט מה תהיה כתובת השולח (`EMAIL_FROM_ADDRESS`, למשל `noreply@youreventeam.com`) ולהריץ:
  `supabase secrets set EMAIL_FROM_ADDRESS=noreply@...`

### 3. ~~גישת Supabase CLI~~ ✅ הושלם
ה-CLI כבר היה מחובר אצלך (`supabase login` בוצע בעבר), רק חיברתי (`link`) אותו לפרויקט הזה. אני יכול להריץ migrations/secrets/deploy ישירות מהטרמינל בלי תלות ב-MCP tool מעכשיו.

### 4. פריסה ל-Vercel
ה-frontend עדיין לא פרוס בשום מקום — רץ רק מקומית. כדי לפרוס:
- [ ] לחבר את הריפו `yossi7700/eventeam-app` ל-Vercel (חשבון Vercel קיים? צריך ליצור?)
- [ ] להגדיר ב-Vercel את משתני הסביבה מ-`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] אחרי שתדע את כתובת הדומיין הסופית — לעדכן את `ALLOWED_ORIGINS` (סעיף 1.5) ואת `STRIPE_CONNECT_REDIRECT_URI` (סעיף 1) בהתאם

---

## 🟡 החלטות שרק אתה יכול לקבל

- [ ] **דומיין**: לאיזה דומיין תרצה לחבר את ה-frontend ב-Vercel כשנגיע לפריסה? (eventeam.online שכבר יש לך? domain אחר?)
- [ ] **תוכן תבניות אימייל ברירת מחדל** (platform-wide): צריך תוכן אמיתי לכל 6 הסוגים (אישור הרשמה, תודה, הרשמת חברה, אישור חברה, דחיית חברה, **קוד אימות OTP** — את זה כבר זרעתי עם תוכן זמני שעובד) — אפשר גם שאני אכתוב טיוטה ואתה תאשר/תערוך.
- [ ] **מנהל-על ראשון (admin)**: איך תרצה שהחשבון הניהולי הראשון ייווצר? (אין הרשמה ציבורית ל-admin בכוונה — צריך ליצור ידנית)

---

## 🟢 מידע רקע (לא דורש פעולה, רק בשבילך)

- **Supabase project**: `eventeam` (`nauyrqtdlqdqyxgrdlex`), `eu-central-1`, ~$10/חודש
- **GitHub repo**: `yossi7700/eventeam-app`
- **סטטוס**: **כל 7 השלבים הושלמו.** שכבת ה-backend/frontend מלאה ונבדקה. מה שנשאר זה בעיקר המפתחות האדומים למעלה + פריסה בפועל ל-Vercel.
- קוד ה-Laravel/MySQL הישן נשאר **ללא שינוי** — לא נגעתי בו כלל, כמבוקש.

---

*הקובץ הזה חי בתוך הריפו (`TODO-FOR-YOSSI.md`) ואני אעדכן אותו בכל פעם שיתווסף פריט חדש.*
