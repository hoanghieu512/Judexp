package com.judexp.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Debug builds only (src/debug): fires a reminder's alarm now instead of
 * within its ten-minute window, which is too slow for the e2e smoke tests.
 *
 * It replays the very PendingIntent that ReminderPlugin.schedule set, found
 * by its request code (the notification id), so the notification shows with
 * schedule's own extras, and a test fails when schedule set nothing or set it
 * wrong. The alarm is cancelled, so it does not ring again later. The
 * manifest entry requires DUMP, which the adb shell holds:
 *
 *   adb shell am broadcast -n com.judexp.app/.ReminderShowNowReceiver --ei notificationId 1113385910
 *
 * Result code SHOWN, or NOTHING_SCHEDULED when no alarm is set for that id.
 */
public class ReminderShowNowReceiver extends BroadcastReceiver {
    static final int SHOWN = 1;
    static final int NOTHING_SCHEDULED = 2;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        int notificationId = intent.getIntExtra("notificationId", 0);
        // PendingIntents match on request code and intent, not extras: this is the one schedule set.
        PendingIntent alarm = PendingIntent.getBroadcast(ctx, notificationId, new Intent(ctx, ReminderAlarmReceiver.class),
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (alarm == null) {
            setResultCode(NOTHING_SCHEDULED);
            return;
        }
        ((AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE)).cancel(alarm);
        try {
            alarm.send();
        } catch (PendingIntent.CanceledException e) {
            setResultCode(NOTHING_SCHEDULED);
            return;
        }
        setResultCode(SHOWN);
    }
}
