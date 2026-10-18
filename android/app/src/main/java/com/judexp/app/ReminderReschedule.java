package com.judexp.app;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Which alarms to set again after a reboot, from the pending.json the app
 * keeps (AlarmManager forgets every alarm when the phone restarts). Pure, so
 * it runs in JVM unit tests.
 */
public final class ReminderReschedule {
    /** A reminder that fell due while the phone was off fires shortly after boot. */
    static final long LATE_DELAY_MS = 60_000L;

    private ReminderReschedule() {}

    public static List<ReminderAlarm> afterBoot(String pendingJson, long nowMs) {
        try {
            JSONObject root = new JSONObject(pendingJson);
            if (root.optInt("version", -1) != 1) return Collections.emptyList();
            JSONArray reminders = root.optJSONArray("reminders");
            if (reminders == null) return Collections.emptyList();

            List<ReminderAlarm> alarms = new ArrayList<>();
            for (int i = 0; i < reminders.length(); i += 1) {
                JSONObject r = reminders.optJSONObject(i);
                if (r == null) continue;
                long due = ReminderAnswer.parseIso(r.optString("dueAt", null));
                long expires = ReminderAnswer.parseIso(r.optString("expiresAt", null));
                if (due < 0 || expires < 0 || expires <= nowMs) continue;
                alarms.add(new ReminderAlarm(
                    r.optInt("notificationId"),
                    // pending.json calls it id; the alarm and the answer call it reminderId.
                    r.optString("id"),
                    r.optString("kind"),
                    r.optString("key"),
                    r.optString("label"),
                    r.optString("lookedUpAt"),
                    r.optString("expiresAt"),
                    r.optString("khoUri"),
                    Math.max(due, nowMs + LATE_DELAY_MS)));
            }
            return alarms;
        } catch (JSONException e) {
            return Collections.emptyList();
        }
    }
}
