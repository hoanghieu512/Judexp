package com.judexp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * AlarmManager drops every alarm on reboot, and an app update can do the
 * same. Set the pending reminders again from the app's pending.json so a
 * reminder still arrives without the app being opened first.
 */
public class ReminderBootReceiver extends BroadcastReceiver {
    private static final String TAG = "JudexpReminder";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        File file = new File(ctx.getFilesDir(), "pending.json");
        if (!file.isFile()) return;
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            int read = 0;
            while (read < bytes.length) {
                int n = in.read(bytes, read, bytes.length - read);
                if (n < 0) break;
                read += n;
            }
            String json = new String(bytes, 0, read, StandardCharsets.UTF_8);
            for (ReminderAlarm alarm : ReminderReschedule.afterBoot(json, System.currentTimeMillis())) {
                ReminderAlarmReceiver.schedule(ctx, alarm);
            }
        } catch (IOException e) {
            Log.w(TAG, "could not read pending.json: " + e.getMessage());
        }
    }
}
