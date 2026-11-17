# Health Hub – setup guide

Your personal health dashboard: Garmin + Hevy + food log + body & medical log, with automatic analysis.
Everything used here is free: no subscriptions, no running costs.

## How it is built (plain English)

| Piece | What it does | Cost |
|---|---|---|
| The app (this folder) | The screens you see – works on phone and laptop | Free |
| Supabase | Your private online database, behind your own login | Free tier |
| GitHub | Hosts the app at a web address and runs the Garmin/Hevy sync 4× a day | Free |
| Open Food Facts + built-in Indian food list | Nutrition data | Free |

The app works in two modes:

- **This device only** (how it starts): data is kept in the browser on this Mac. Good for trying it out.
- **Cloud** (recommended): data lives in your Supabase database, so your phone and laptop show the same thing and Garmin/Hevy sync by themselves.

---

## Step 1 – Try it on this Mac (already working)

Ask Claude to "open Health Hub", or in Terminal run `python3 -m http.server 5180` inside this folder and open http://localhost:5180.
Tap **Load sample data** to see everything filled in; **Remove sample data** when done.

## Step 2 – Create your free cloud database (about 10 minutes)

1. Go to https://supabase.com → **Start your project** → sign up (free plan).
2. **New project** → name it `health-hub`, pick a database password (save it somewhere), region **Mumbai** (or nearest).
3. Left menu → **SQL Editor** → paste everything from `supabase/schema.sql` → **Run**.
4. Left menu → **Authentication → Users → Add user → Create new user**: your email + a password of your choice, tick **Auto Confirm User**. This is your app login.
5. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up". (Important: this makes sure nobody else can ever create a login to your data.)
6. **Project Settings → API Keys** (and **Data API** for the URL). You need three things:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - **Publishable key** (older name: "anon public") – safe to be public
   - **Secret key** (older name: "service_role") – keep private, never share
7. Open `js/config.js` and paste the Project URL and the **publishable** key between the quotes.
8. Create a file `sync/.env` containing these two lines (with your values):
   ```
   SUPABASE_URL=https://abcdxyz.supabase.co
   SUPABASE_SERVICE_KEY=your-secret-key
   ```

## Step 3 – Connect Garmin (and Hevy)

Double-click **Connect Garmin.command** in this folder. (First time, macOS may ask you to right-click → Open.)

- It asks for your Garmin email, password and the security code Garmin emails you. Your password goes straight to Garmin and is not stored – only a login token is kept.
- It asks for a **Hevy API key**. This needs Hevy Pro: get it at https://hevy.com/settings?developer. No Pro? Press Enter to skip and instead use **Settings → Import Hevy CSV** in the app (Hevy app → Profile → Settings → Export & Import Data → Export Workouts).
- It then pulls your last 30 days.

Later, double-click **Sync now.command** any time you want fresh data straight away.

> Garmin has no official free API for individuals, so this uses the same login the Garmin phone app uses (through the open-source `garminconnect` library). It works well, but if Garmin changes something it can break until the library is updated – re-running **Connect Garmin.command** fixes most problems.

## Step 4 – Put it online + automatic sync (about 10 minutes)

1. Create a free account at https://github.com and a **new public repository** called `health-hub`.
   (Public is fine: the repository holds only the app's code. Your health data is in Supabase behind your login, and `.gitignore` keeps `sync/.env` and local data out.)
2. Upload this folder to it (Claude can do this for you).
3. Repository **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`, folder `/ (root)` → Save.
   After a minute your app is live at `https://YOUR-USERNAME.github.io/health-hub/`.
4. Repository **Settings → Secrets and variables → Actions → New repository secret**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (the **secret** key)
   - `HEVY_API_KEY` (only if you have Hevy Pro)
5. **Actions** tab → enable workflows → **Sync Garmin and Hevy → Run workflow** to test. After that it runs by itself at 6 am, 12 noon, 6 pm and 11 pm India time. GitHub emails you if a sync fails.

## Step 5 – Put it on your phone

Open your app's web address on the phone, sign in, then:
- **iPhone (Safari):** Share → **Add to Home Screen**
- **Android (Chrome):** ⋮ menu → **Add to Home screen**

It now opens like a normal app.

---

## Good to know

- **Calories burned** come from Garmin (resting + active). Strength exercises come from Hevy, so nothing is counted twice.
- **Today's balance is a running total** – Garmin's burn figure keeps climbing until midnight and only updates when a sync runs.
- **Food values are estimates** for typical home-style portions (source: IFCT 2017 / standard recipes). If your katori is bigger or your cooking uses more ghee, add a custom food or adjust the quantity.
- **Insights are not medical advice.** They are rule-based observations from your own numbers.
- **Backup:** Settings → Download backup saves everything as one file.
- Supabase pauses free projects after a week with no activity – the automatic sync keeps yours awake.
