package com.judexp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Set;

/**
 * AlarmManager drops every alarm on reboot, and an app update can do the
 * same. Set the pending reminders again from the app's pending.json so a
 * reminder still arrives without the app being opened first.
 */
public class ReminderBootReceiver extends BroadcastReceiver {
    private static final String TAG = "JudexpReminder";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String json = readPending(ctx);
        if (json == null) return;
        SharedPreferences prefs = ctx.getSharedPreferences(ReminderReschedule.SHOWN_PREFS, Context.MODE_PRIVATE);
        Set<String> shown = prefs.getStringSet(ReminderReschedule.SHOWN_KEY, Collections.emptySet());
        for (ReminderAlarm alarm : ReminderReschedule.afterBoot(json, System.currentTimeMillis(), shown)) {
            ReminderAlarmReceiver.schedule(ctx, alarm);
        }
    }

    /** The app's pending.json, or null when there is none or it cannot be read. */
    static String readPending(Context ctx) {
        File file = new File(ctx.getFilesDir(), "pending.json");
        if (!file.isFile()) return null;
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            int read = 0;
            while (read < bytes.length) {
                int n = in.read(bytes, read, bytes.length - read);
                if (n < 0) break;
                read += n;
            }
            return new String(bytes, 0, read, StandardCharsets.UTF_8);
        } catch (IOException e) {
            Log.w(TAG, "could not read pending.json: " + e.getMessage());
            return null;
        }
    }
}
