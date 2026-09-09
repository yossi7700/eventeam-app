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

### 3.4 הפעלת מייל תודה אוטומטי אחרי אירוע (חדש)
בניתי cron job (`send_thank_you_emails`, רץ כל יום ב-10:00) ששולח מייל "תודה" (`thank_you` template) לכל מי שנרשם לאירוע שהסתיים יום קודם — מקביל לפיצ'ר שהיה קיים במערכת הישנה (`sendEmailToRegistrants`) וגם הוא לא היה מחובר לשום דבר במערכת החדשה עד עכשיו.

מטעמי זהירות (לא רציתי לאחסן מפתח סודי אמיתי בפעולה אוטונומית בלי אישור שלך), ה-cron **כרגע במצב "כבוי בבטחה"** — הוא רץ אבל לא עושה כלום, כי הוא מחפש secret בשם `service_role_key` ב-Supabase Vault ולא מוצא אותו.

- [ ] כדי להפעיל בפועל, תריץ פעם אחת ב-SQL Editor של Supabase (או תגיד לי ואני ארוץ אם תרצה):
  ```sql
  select vault.create_secret('<ה-service_role key שלך מ-Project Settings → API>', 'service_role_key');
  ```
- [ ] תוודא שיש לך template פעיל מסוג `thank_you` (אחרת המייל פשוט לא יישלח, בלי שגיאה — יתועד ב-`net._http_response`)

### 3.5 טעינת רשימת ערים מלאה (חדש)
בעקבות הביקורת מול המערכת הישנה, בניתי מחדש את פיצ'ר "חיפוש עיר" (היה קיים בישן דרך קובץ `geo.json` בגודל 16MB, שולט על ~101,000 ערים) — טבלת `cities` חדשה ב-Postgres עם אינדקס לחיפוש מהיר, ומשמשת ב-`/templates` לבחירת מיקום לפני פרסום אירוע מתבנית (נדרש לחישוב שעת שקיעה/הדלקת נרות).

**הבעיה**: אין לי במצב הזה גישת `psql`/`COPY` ישירה למסד הנתונים, ודרך ה-API הזמין טעינת 101,000 שורות תצרוך יותר מדי משאבים בשיחה. **טענתי כרגע רק 18 ערים מרכזיות מאומתות** (ניו יורק, ירושלים, תל אביב, חיפה, טורונטו, לונדון, ועוד) — מספיק כדי שהפיצ'ר יעבוד ויוצג, אבל לא מכסה כל עיר קטנה.

- [ ] אם תרצה את הרשימה המלאה (כל 101,000 הערים כמו במערכת הישנה): הכי פשוט זה שתריץ בעצמך פעם אחת, מהטרמינל שלך (עם `psql` מותקן, או Supabase Studio → SQL Editor → Import), טעינה של `public/geo.json` מהגיבוי הישן לתוך טבלת `public.cities` (`geonameid, city_name, region_name, country_code`) — אני יכול להכין לך את הפקודה/הקובץ המדויק אם תגיד לי שאתה רוצה בכך.

### 4. פריסה ל-Vercel
ה-frontend עדיין לא פרוס בשום מקום — רץ רק מקומית. כדי לפרוס:
- [ ] לחבר את הריפו `yossi7700/eventeam-app` ל-Vercel (חשבון Vercel קיים? צריך ליצור?)
- [ ] להגדיר ב-Vercel את משתני הסביבה מ-`.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] אחרי שתדע את כתובת הדומיין הסופית — לעדכן את `ALLOWED_ORIGINS` (סעיף 1.5) ואת `STRIPE_CONNECT_REDIRECT_URI` (סעיף 1) בהתאם

---

## 🟡 החלטות שרק אתה יכול לקבל

- [ ] **דומיין**: לאיזה דומיין תרצה לחבר את ה-frontend ב-Vercel כשנגיע לפריסה? (eventeam.online שכבר יש לך? domain אחר?)
- [ ] **תוכן תבניות אימייל ברירת מחדל** (platform-wide): צריך תוכן אמיתי לכל 6 הסוגים (אישור הרשמה, תודה, הרשמת חברה, אישור חברה, דחיית חברה, **קוד אימות OTP** — את זה כבר זרעתי עם תוכן זמני שעובד) — אפשר גם שאני אכתוב טיוטה ואתה תאשר/תערוך.
- [x] **מנהל-על ראשון (admin)**: ✅ נוצר עבורך ישירות דרך Supabase Auth Admin API (הדרך התקינה היחידה ליצור חשבון פעיל בלי לעבור תהליך אימות מייל). **שנה את הסיסמה הזמנית** דרך `/settings/security` בהקדם — היא נשלחה בצ'אט.

---

## 🟢 מידע רקע (לא דורש פעולה, רק בשבילך)

- **Supabase project**: `eventeam` (`nauyrqtdlqdqyxgrdlex`), `eu-central-1`, ~$10/חודש
- **GitHub repo**: `yossi7700/eventeam-app`
- **סטטוס**: **כל 7 השלבים הושלמו**, ובנוסף בוצעה ביקורת פערים מלאה מול המערכת הישנה (קובץ-קובץ) ותוקנו הפערים שנמצאו: הגדרות ברירת מחדל לאירועים (מדרג אירוע←חברה←פלטפורמה), עמלת פלטפורמה נפרדת מעמלת אדמין, צבע לסוג כרטיס, שדות עיצוב עמוד ראשי חסרים, תמיכה ביצירת תבניות אדמין (לא הייתה קיימת כלל), עמוד פרטי חברה, סימון תשלום מזומן כ"נגבה" + התראה לחברה, שליחת מייל תודה אוטומטי אחרי אירוע (cron), וחיפוש ערים. שכבת ה-backend/frontend מלאה ונבדקה (build+lint+בדיקות SQL ישירות). מה שנשאר זה בעיקר המפתחות האדומים למעלה + פריסה בפועל ל-Vercel.
- קוד ה-Laravel/MySQL הישן נשאר **ללא שינוי** — לא נגעתי בו כלל, כמבוקש.

---

*הקובץ הזה חי בתוך הריפו (`TODO-FOR-YOSSI.md`) ואני אעדכן אותו בכל פעם שיתווסף פריט חדש.*
