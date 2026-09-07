# פעולות נדרשות ממך — EvenTeam Rebuild

קובץ זה מתעדכן באופן שוטף עם כל דבר שאני לא יכול להשלים בעצמי — בעיקר מפתחות/סודות, החלטות עסקיות, ואישורים חיצוניים. עדכון אחרון: תחילת Phase 6.

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

### 2. Resend (שליחת אימיילים)
כרגע כל שליחת מייל נכשלת בצורה מבוקרת ("not configured").

- [ ] ליצור חשבון ב-[resend.com](https://resend.com) (יש תוכנית חינמית)
- [ ] לאמת דומיין שלך (או להשתמש בדומיין הבדיקה של Resend זמנית)
- [ ] להביא `RESEND_API_KEY` (re_...)
- [ ] להריץ: `supabase secrets set RESEND_API_KEY=re_...`
- [ ] להחליט מה תהיה כתובת השולח (`EMAIL_FROM_ADDRESS`, למשל `noreply@youreventeam.com`) ולהריץ:
  `supabase secrets set EMAIL_FROM_ADDRESS=noreply@...`

### 3. גישת Supabase CLI (כדי שאוכל להריץ secrets/migrations ישירות)
כרגע אני עובד מול הפרויקט דרך MCP tool שהתנתק באמצע העבודה. כדי שאוכל להמשיך להריץ פקודות `supabase` ישירות מהטרמינל בלי תלות ב-MCP:
- [ ] להריץ פעם אחת אצלך: `supabase login` (ייפתח דפדפן לאישור)
- [ ] להריץ: `supabase link --project-ref nauyrqtdlqdqyxgrdlex` בתוך תיקיית הפרויקט

---

## 🟡 החלטות שרק אתה יכול לקבל

- [ ] **דומיין**: לאיזה דומיין תרצה לחבר את ה-frontend ב-Vercel כשנגיע לפריסה? (eventeam.online שכבר יש לך? domain אחר?)
- [ ] **תוכן תבניות אימייל ברירת מחדל** (platform-wide): כרגע יצרתי רק תבנית בדיקה זמנית שנמחקה. תצטרך למלא תוכן אמיתי לכל 5 הסוגים (אישור הרשמה, תודה, הרשמת חברה, אישור חברה, דחיית חברה) — אפשר גם שאני אכתוב טיוטה ואתה תאשר/תערוך.
- [ ] **מנהל-על ראשון (admin)**: איך תרצה שהחשבון הניהולי הראשון ייווצר? (אין הרשמה ציבורית ל-admin בכוונה — צריך ליצור ידנית)

---

## 🟢 מידע רקע (לא דורש פעולה, רק בשבילך)

- **Supabase project**: `eventeam` (`nauyrqtdlqdqyxgrdlex`), `eu-central-1`, ~$10/חודש
- **GitHub repo**: `yossi7700/eventeam-app`
- **סטטוס**: Phase 5 מתוך 7 הושלם. Phase 6 (הגדרות + OTP) מתחיל עכשיו.
- קוד ה-Laravel/MySQL הישן נשאר **ללא שינוי** — לא נגעתי בו כלל, כמבוקש.

---

*הקובץ הזה חי בתוך הריפו (`TODO-FOR-YOSSI.md`) ואני אעדכן אותו בכל פעם שיתווסף פריט חדש.*
