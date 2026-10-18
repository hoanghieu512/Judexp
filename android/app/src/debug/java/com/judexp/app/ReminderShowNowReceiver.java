package com.judexp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import java.util.Collections;

/**
 * Debug builds only (src/debug): shows a pending reminder's notification now,
 * through the very code its alarm runs. A reminder's alarm has a ten-minute
 * window, which is too slow for the e2e smoke tests. The manifest entry
 * requires DUMP, so only adb can send it:
 *
 *   adb shell am broadcast -n com.judexp.app/.ReminderShowNowReceiver --es reminderId driver:00E000003
 */
public class ReminderShowNowReceiver extends BroadcastReceiver {
    private static final String TAG = "JudexpReminder";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String id = intent.getStringExtra("reminderId");
        String json = ReminderBootReceiver.readPending(ctx);
        if (id == null || json == null) {
            Log.w(TAG, "show now: no reminder id, or no pending.json");
            return;
        }
        // Nothing counts as shown here: the point is to show it again on demand.
        for (ReminderAlarm alarm : ReminderReschedule.afterBoot(json, System.currentTimeMillis(), Collections.emptySet())) {
            if (!id.equals(alarm.reminderId)) continue;
            Intent due = new Intent(ctx, ReminderAlarmReceiver.class);
            ReminderAlarmReceiver.putExtras(due, alarm);
            new ReminderAlarmReceiver().onReceive(ctx, due);
            return;
        }
        Log.w(TAG, "show now: no pending reminder " + id);
    }
}
