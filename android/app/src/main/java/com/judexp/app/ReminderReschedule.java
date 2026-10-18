package com.judexp.app;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Which alarms to set again after a reboot, from the pending.json the app
 * keeps (AlarmManager forgets every alarm when the phone restarts). Pure, so
 * it runs in JVM unit tests.
 */
public final class ReminderReschedule {
    /** A reminder that fell due while the phone was off fires shortly after boot. */
    static final long LATE_DELAY_MS = 60_000L;
    /** SharedPreferences file and key holding the marks of reminders already shown. */
    static final String SHOWN_PREFS = "judexp.reminders";
    static final String SHOWN_KEY = "shown";

    private ReminderReschedule() {}

    /**
     * Record that a reminder was shown. A mark is "<expiresAtMs>|<reminderId>|<lookedUpAt>",
     * so marks past their reminder's 48 hours are dropped here and the set stays small.
     */
    public static Set<String> markShown(Set<String> marks, ReminderAlarm alarm, long nowMs) {
        Set<String> next = new HashSet<>();
        for (String mark : marks) {
            int bar = mark.indexOf('|');
            try {
                if (bar > 0 && Long.parseLong(mark.substring(0, bar)) > nowMs) next.add(mark);
            } catch (NumberFormatException ignored) {
                // A mark that cannot be read is dropped.
            }
        }
        long expires = ReminderAnswer.parseIso(alarm.expiresAt);
        next.add(Math.max(expires, nowMs) + "|" + alarm.reminderId + "|" + alarm.lookedUpAt);
        return next;
    }

    private static boolean wasShown(Set<String> marks, String reminderId, String lookedUpAt) {
        String suffix = "|" + reminderId + "|" + lookedUpAt;
        for (String mark : marks) if (mark.endsWith(suffix)) return true;
        return false;
    }

    /**
     * Alarms to set again. A reminder already shown is skipped: whether it was
     * answered, swiped away or is still in the tray, showing it again after a
     * reboot would only repeat it, and Chờ chấm still has it.
     */
    public static List<ReminderAlarm> afterBoot(String pendingJson, long nowMs, Set<String> shown) {
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
                if (wasShown(shown, r.optString("id"), r.optString("lookedUpAt"))) continue;
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
