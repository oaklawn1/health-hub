#!/usr/bin/env python3
"""Health Hub sync: pulls your Garmin and Hevy data into the app.

Where the data goes:
  * If SUPABASE_URL + SUPABASE_SERVICE_KEY are set -> your Supabase cloud database.
  * Otherwise -> ../data/sync.json (device-only mode on this Mac).

Settings are read from environment variables or from a ".env" file next to this script:
  SUPABASE_URL, SUPABASE_SERVICE_KEY   cloud database (optional)
  HEVY_API_KEY                         Hevy Pro API key (optional)
  GARMIN_EMAIL, GARMIN_PASSWORD        only needed if no saved Garmin login exists (optional)
  TIMEZONE                             default Asia/Kolkata

Usage:
  python sync.py --login --days 30     first time: sign in to Garmin (asks for password + code)
  python sync.py                       normal run: last 3 days
Needs Python 3.12+ (required by the garminconnect library).
"""
import argparse
import datetime as dt
import getpass
import json
import os
import pathlib
import re
import sys
from zoneinfo import ZoneInfo

import requests

HERE = pathlib.Path(__file__).resolve().parent
ENV_FILE = HERE / ".env"
LOCAL_OUT = HERE.parent / "data" / "sync.json"
HEVY = "https://api.hevyapp.com/v1"


def load_env():
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def save_env(key, value):
    lines = ENV_FILE.read_text().splitlines() if ENV_FILE.exists() else []
    lines = [l for l in lines if not l.startswith(key + "=")] + [f"{key}={value}"]
    ENV_FILE.write_text("\n".join(lines) + "\n")
    ENV_FILE.chmod(0o600)
    os.environ[key] = value


class Cloud:
    """Tiny Supabase (PostgREST) client."""

    def __init__(self, url, key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.h = {"apikey": key, "Authorization": "Bearer " + key, "Content-Type": "application/json"}

    def _post(self, table, rows, conflict):
        r = requests.post(f"{self.base}/{table}?on_conflict={conflict}", json=rows, timeout=60,
                          headers={**self.h, "Prefer": "resolution=merge-duplicates,return=minimal"})
        if r.status_code >= 300:
            raise RuntimeError(f"Supabase write to {table} failed ({r.status_code}): {r.text[:300]}")

    def put_records(self, collection, rows):
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        payload = [{"collection": collection, "id": str(r["id"]), "date": r.get("date"),
                    "data": {k: v for k, v in r.items() if k not in ("id", "date")}, "updated_at": now} for r in rows]
        for i in range(0, len(payload), 500):
            self._post("records", payload[i:i + 500], "collection,id")

    def get_state(self, key):
        r = requests.get(f"{self.base}/sync_state?key=eq.{key}&select=value", headers=self.h, timeout=30)
        r.raise_for_status()
        rows = r.json()
        return rows[0]["value"] if rows else None

    def set_state(self, key, value):
        self._post("sync_state", [{"key": key, "value": value, "updated_at": dt.datetime.now(dt.timezone.utc).isoformat()}], "key")


def write_local(collections):
    data = {}
    if LOCAL_OUT.exists():
        try:
            data = json.loads(LOCAL_OUT.read_text() or "{}")
        except json.JSONDecodeError:
            data = {}
    for coll, rows in collections.items():
        merged = {str(r["id"]): r for r in data.get(coll, [])}
        merged.update({str(r["id"]): r for r in rows})
        data[coll] = list(merged.values())
    LOCAL_OUT.parent.mkdir(exist_ok=True)
    LOCAL_OUT.write_text(json.dumps(data))


# ----------------------------------------------------------------- Garmin
def garmin_client(cloud, tokendir, interactive):
    from garminconnect import Garmin  # imported here so Hevy-only use works without it

    tokendir.mkdir(parents=True, exist_ok=True)
    tokenfile = tokendir / "garmin_tokens.json"
    # The cloud copy is the source of truth, so scheduled runs on GitHub and runs on this Mac share one login.
    if cloud and not interactive:
        saved = cloud.get_state("garmin_tokens")
        if saved:
            tokenfile.write_text(saved["raw"] if isinstance(saved, dict) and set(saved) == {"raw"} else json.dumps(saved))
            tokenfile.chmod(0o600)

    email, password = os.environ.get("GARMIN_EMAIL"), os.environ.get("GARMIN_PASSWORD")
    if tokenfile.exists() and not interactive:
        client = Garmin()
        client.login(str(tokendir))
        return client
    if interactive:
        print("\nSign in to Garmin Connect. Your password goes straight to Garmin and is never stored;")
        print("only a login token is saved so the app can keep syncing.\n")
        email = email or input("Garmin email: ").strip()
        password = getpass.getpass("Garmin password (typing is hidden): ")
        client = Garmin(email, password, prompt_mfa=lambda: input("Code from Garmin (email / authenticator app): ").strip())
        client.login(str(tokendir))
        return client
    if email and password:
        client = Garmin(email, password)
        client.login(str(tokendir))
        return client
    raise RuntimeError("No saved Garmin login. Run 'Connect Garmin.command' on your Mac first.")


def save_garmin_tokens(cloud, tokendir):
    tokenfile = tokendir / "garmin_tokens.json"
    if cloud and tokenfile.exists():
        text = tokenfile.read_text()
        try:
            cloud.set_state("garmin_tokens", json.loads(text))
        except json.JSONDecodeError:
            cloud.set_state("garmin_tokens", {"raw": text})


def dig(obj, *path):
    for p in path:
        if isinstance(obj, dict):
            obj = obj.get(p)
        elif isinstance(obj, list) and isinstance(p, int) and len(obj) > p:
            obj = obj[p]
        else:
            return None
    return obj


def garmin_day(c, day):
    def call(fn, *a):
        try:
            return fn(*a)
        except Exception as e:  # a missing metric (older watch, no data) must not stop the sync
            print(f"   - {fn.__name__} {day}: {str(e)[:80]}")
            return None

    row = {}
    s = call(c.get_stats, day) or {}
    row.update(
        steps=s.get("totalSteps"), step_goal=s.get("dailyStepGoal"), distance_m=s.get("totalDistanceMeters"),
        calories_total=s.get("totalKilocalories"), calories_active=s.get("activeKilocalories"), calories_bmr=s.get("bmrKilocalories"),
        resting_hr=s.get("restingHeartRate"), min_hr=s.get("minHeartRate"), max_hr=s.get("maxHeartRate"),
        stress_avg=s.get("averageStressLevel"), stress_max=s.get("maxStressLevel"),
        body_battery_high=s.get("bodyBatteryHighestValue"), body_battery_low=s.get("bodyBatteryLowestValue"),
        body_battery_now=s.get("bodyBatteryMostRecentValue"), floors=s.get("floorsAscended"),
    )
    mod, vig = s.get("moderateIntensityMinutes"), s.get("vigorousIntensityMinutes")
    if mod is not None or vig is not None:
        row["intensity_minutes"] = (mod or 0) + 2 * (vig or 0)
    if isinstance(row.get("stress_avg"), (int, float)) and row["stress_avg"] < 0:
        row["stress_avg"] = None  # Garmin uses -1 / -2 for "no reading"

    sl = call(c.get_sleep_data, day) or {}
    dto = sl.get("dailySleepDTO") or {}
    row.update(
        sleep_seconds=dto.get("sleepTimeSeconds"), deep_seconds=dto.get("deepSleepSeconds"), light_seconds=dto.get("lightSleepSeconds"),
        rem_seconds=dto.get("remSleepSeconds"), awake_seconds=dto.get("awakeSleepSeconds"),
        sleep_score=dig(dto, "sleepScores", "overall", "value"),
    )
    hrv = dig(call(c.get_hrv_data, day), "hrvSummary") or {}
    row.update(hrv=hrv.get("lastNightAvg") or sl.get("avgOvernightHrv"), hrv_weekly=hrv.get("weeklyAvg"), hrv_status=hrv.get("status"))

    tr = call(c.get_training_readiness, day)
    tr = tr[0] if isinstance(tr, list) and tr else tr if isinstance(tr, dict) else {}
    row.update(training_readiness=tr.get("score"), training_readiness_level=tr.get("level"))

    ts = call(c.get_training_status, day) or {}
    latest = dig(ts, "mostRecentTrainingStatus", "latestTrainingStatusData") or {}
    first = next(iter(latest.values()), {}) if isinstance(latest, dict) else {}
    phrase = first.get("trainingStatusFeedbackPhrase")
    if phrase:
        row["training_status"] = re.sub(r"_\d+$", "", phrase).replace("_", " ").capitalize()
    row["vo2max"] = dig(ts, "mostRecentVO2Max", "generic", "vo2MaxValue")

    row = {k: v for k, v in row.items() if v is not None}
    if not row or not (row.get("steps") or row.get("calories_total") or row.get("sleep_seconds")):
        return None
    return {"id": day, "date": day, **row}


def garmin_activities(c, start, end):
    out = []
    for a in c.get_activities_by_date(start, end) or []:
        when = a.get("startTimeLocal") or ""
        out.append({k: v for k, v in {
            "id": str(a.get("activityId")), "date": when[:10], "start": when.replace(" ", "T"), "name": a.get("activityName"),
            "type": dig(a, "activityType", "typeKey"), "duration_s": a.get("duration"), "distance_m": a.get("distance"),
            "calories": a.get("calories"), "avg_hr": a.get("averageHR"), "max_hr": a.get("maxHR"),
        }.items() if v is not None})
    return [a for a in out if a.get("date")]


# ----------------------------------------------------------------- Hevy
def hevy_get(key, path, **params):
    r = requests.get(HEVY + path, params=params, headers={"api-key": key, "accept": "application/json"}, timeout=30)
    if r.status_code in (401, 403):
        raise RuntimeError("Hevy rejected the API key (the Hevy API needs a Hevy Pro subscription).")
    r.raise_for_status()
    return r.json()


def hevy_workouts(key, since, tz):
    templates, page = {}, 1
    while True:
        j = hevy_get(key, "/exercise_templates", page=page, pageSize=100)
        for t in j.get("exercise_templates", []):
            templates[t.get("id")] = (t.get("primary_muscle_group"), t.get("secondary_muscle_groups") or [])
        if page >= (j.get("page_count") or 1):
            break
        page += 1

    out, page = [], 1
    while True:
        j = hevy_get(key, "/workouts", page=page, pageSize=10)
        ws = j.get("workouts", [])
        for w in ws:
            start = dt.datetime.fromisoformat(str(w["start_time"]).replace("Z", "+00:00")).astimezone(tz)
            end = dt.datetime.fromisoformat(str(w["end_time"]).replace("Z", "+00:00")).astimezone(tz) if w.get("end_time") else None
            if start.date() < since:
                return out
            exercises = []
            for ex in w.get("exercises", []):
                primary, secondary = templates.get(ex.get("exercise_template_id"), (None, []))
                exercises.append({
                    "name": ex.get("title"), "muscle": primary or "other", "secondary": secondary,
                    "sets": [{k: v for k, v in {
                        "type": s.get("type") or "normal", "kg": s.get("weight_kg"), "reps": s.get("reps"),
                        "dur": s.get("duration_seconds"), "dist": (s.get("distance_meters") or 0) / 1000 or None, "rpe": s.get("rpe"),
                    }.items() if v is not None} for s in ex.get("sets", [])],
                })
            out.append({
                "id": str(w["id"]), "date": start.date().isoformat(), "title": w.get("title"), "start": start.isoformat(),
                "duration_min": round((end - start).total_seconds() / 60) if end else None, "exercises": exercises, "source": "api",
            })
        if not ws or page >= (j.get("page_count") or 1):
            return out
        page += 1


# ----------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="Sync Garmin + Hevy into Health Hub")
    ap.add_argument("--days", type=int, default=3, help="how many days back to fetch (default 3)")
    ap.add_argument("--login", action="store_true", help="sign in to Garmin interactively (first-time setup)")
    ap.add_argument("--hevy", action="store_true", help="connect Hevy: asks for your API key, then syncs Hevy only")
    ap.add_argument("--setup-cloud", metavar="URL", help="save the Supabase project URL and ask for its secret key")
    args = ap.parse_args()
    load_env()

    if args.setup_cloud:
        print("\nSupabase secret key: in the Supabase dashboard open Project Settings -> API Keys,")
        print("and under 'Secret keys' click the copy icon next to the 'default' key.")
        k = getpass.getpass("Paste the secret key here and press Enter (it stays hidden): ").strip()
        if not k.startswith(("sb_secret_", "eyJ")):
            sys.exit("That does not look like a Supabase secret key (it should start with sb_secret_). Nothing saved.")
        save_env("SUPABASE_URL", args.setup_cloud)
        save_env("SUPABASE_SERVICE_KEY", k)
        try:
            Cloud(args.setup_cloud, k).get_state("garmin_tokens")
        except Exception as e:
            sys.exit(f"Saved, but the database did not accept the key: {e}")
        print("Saved and checked: the key works.\n")

    tz = ZoneInfo(os.environ.get("TIMEZONE", "Asia/Kolkata"))
    today = dt.datetime.now(tz).date()
    days = [(today - dt.timedelta(days=i)).isoformat() for i in range(args.days - 1, -1, -1)]
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    cloud = Cloud(url, key) if url and key else None
    print("Saving to:", "Supabase cloud database" if cloud else f"this Mac only ({LOCAL_OUT})")

    if args.hevy or (args.login and "HEVY_API_KEY" not in os.environ):
        print("\nHevy: if you have Hevy Pro, create an API key at https://hevy.com/settings?developer")
        k = getpass.getpass("Paste your Hevy API key, then press Enter (it stays hidden; just Enter to skip): ").strip()
        save_env("HEVY_API_KEY", k)

    collections, status, failed = {}, {}, False
    tokendir = pathlib.Path(os.environ.get("GARMINTOKENS", "~/.garminconnect")).expanduser()

    try:
        if args.hevy:
            raise StopIteration
        client = garmin_client(cloud, tokendir, args.login)
        print(f"Garmin: signed in. Fetching {len(days)} day(s)...")
        daily = []
        for d in days:
            row = garmin_day(client, d)
            if row:
                daily.append(row)
                print(f"   {d}: steps {row.get('steps')}, sleep {round((row.get('sleep_seconds') or 0) / 3600, 1)}h, kcal {row.get('calories_total')}")
        collections["garmin_daily"] = daily
        collections["garmin_activity"] = garmin_activities(client, days[0], days[-1])
        save_garmin_tokens(cloud, tokendir)
        status["garmin"] = "ok"
    except StopIteration:
        pass  # Hevy-only run
    except Exception as e:
        failed = True
        status["garmin"] = "failed: " + str(e)[:150]
        print("Garmin FAILED:", e)

    hevy_key = os.environ.get("HEVY_API_KEY")
    if hevy_key:
        try:
            ws = hevy_workouts(hevy_key, today - dt.timedelta(days=max(args.days, 14)), tz)
            collections["hevy_workout"] = ws
            status["hevy"] = "ok"
            print(f"Hevy: {len(ws)} workout(s)")
        except Exception as e:
            failed = True
            status["hevy"] = "failed: " + str(e)[:150]
            print("Hevy FAILED:", e)
    else:
        status["hevy"] = "not connected (use CSV import)"

    if not args.hevy:
        collections["meta"] = [{"id": "sync", "date": today.isoformat(), "at": dt.datetime.now(dt.timezone.utc).isoformat(), **status}]
    for coll, rows in collections.items():
        if rows and cloud:
            cloud.put_records(coll, rows)
    if not cloud:
        write_local(collections)
    print("Done." if not failed else "Finished with errors (see above).")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
