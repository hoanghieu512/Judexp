package com.judexp.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationManagerCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * A notification button was pressed. Record the answer as one file in the
 * app's own storage and dismiss the notification; the app writes the event
 * into the kho the next time it opens. Nothing here opens an activity.
 */
public class ReminderActionReceiver extends BroadcastReceiver {
    private static final String TAG = "JudexpReminder";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        ReminderAlarm alarm = ReminderAlarmReceiver.fromExtras(intent);
        String answer = intent.getStringExtra(ReminderAlarmReceiver.EXTRA_ANSWER);
        String answerId = UUID.randomUUID().toString();
        try {
            String json = ReminderAnswer.toJson(answerId, alarm, answer, System.currentTimeMillis());
            File dir = new File(ctx.getFilesDir(), ReminderAnswer.DIR);
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("cannot create " + dir);
            // Write then rename, so the app never reads half an answer.
            File tmp = new File(dir, answerId + ".json.tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            }
            if (!tmp.renameTo(new File(dir, answerId + ".json"))) throw new IllegalStateException("rename failed");
            NotificationManagerCompat.from(ctx).cancel(alarm.notificationId);
        } catch (Exception e) {
            // Keep the notification: dismissing it would lose the answer silently,
            // while leaving it lets huynh tap again or open the app.
            Log.w(TAG, "could not record answer: " + e.getMessage());
        }
    }
}
