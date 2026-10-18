package com.judexp.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Fires when a reminder is due and shows it with four buttons. Each button is
 * a broadcast to ReminderActionReceiver, never an activity, which is what lets
 * an answer be given without opening the app (spike S5).
 */
public class ReminderAlarmReceiver extends BroadcastReceiver {
    static final String CHANNEL = "reminders";
    static final String[] BUTTONS = { "Tốt", "Ổn", "Xấu", "Không đi" };
    static final String[] ANSWERS = { "good", "ok", "bad", "skip" };
    static final String EXTRA_ANSWER = "answer";
    /** The shortest window Android 12+ allows without the exact-alarm permission. */
    static final long WINDOW_MS = 10 * 60_000L;
    private static final String TAG = "JudexpReminder";

    /**
     * The one place an alarm is set. PendingIntent identity ignores extras, so
     * the request code is the notification id: scheduling the same reminder
     * again replaces its alarm instead of adding a second one.
     *
     * A window alarm, not setAndAllowWhileIdle: that one may arrive up to 75%
     * of the wait late, capped at an hour, so a 90-minute reminder could come
     * two and a half hours after the lookup. Ten minutes needs no permission.
     */
    public static void schedule(Context ctx, ReminderAlarm alarm) {
        Intent intent = new Intent(ctx, ReminderAlarmReceiver.class);
        putExtras(intent, alarm);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, alarm.notificationId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        alarms.setWindow(AlarmManager.RTC_WAKEUP, alarm.atMs, WINDOW_MS, pi);
    }

    public static void cancel(Context ctx, int notificationId) {
        Intent intent = new Intent(ctx, ReminderAlarmReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, notificationId, intent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) {
            ((AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE)).cancel(pi);
            pi.cancel();
        }
        NotificationManagerCompat.from(ctx).cancel(notificationId);
    }

    static void putExtras(Intent intent, ReminderAlarm a) {
        intent.putExtra("notificationId", a.notificationId);
        intent.putExtra("reminderId", a.reminderId);
        intent.putExtra("kind", a.kind);
        intent.putExtra("key", a.key);
        intent.putExtra("label", a.label);
        intent.putExtra("lookedUpAt", a.lookedUpAt);
        intent.putExtra("expiresAt", a.expiresAt);
        intent.putExtra("khoUri", a.khoUri);
        intent.putExtra("atMs", a.atMs);
    }

    static ReminderAlarm fromExtras(Intent intent) {
        return new ReminderAlarm(
            intent.getIntExtra("notificationId", 0),
            intent.getStringExtra("reminderId"),
            intent.getStringExtra("kind"),
            intent.getStringExtra("key"),
            intent.getStringExtra("label"),
            intent.getStringExtra("lookedUpAt"),
            intent.getStringExtra("expiresAt"),
            intent.getStringExtra("khoUri"),
            intent.getLongExtra("atMs", 0L));
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        ReminderAlarm a = fromExtras(intent);
        long now = System.currentTimeMillis();
        long expires = ReminderAnswer.parseIso(a.expiresAt);
        if (expires > 0 && expires <= now) return;
        if (Build.VERSION.SDK_INT >= 33
            && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "notifications not allowed, reminder stays in Chờ chấm only");
            return;
        }
        ensureChannel(ctx);

        String title = "driver".equals(a.kind) ? "Chấm chuyến " + a.label + "?" : "Chấm " + a.label + "?";
        String body = "Tra lúc " + localTime(a.lookedUpAt) + ". Chạm một nút là xong.";

        Intent open = new Intent(ctx, MainActivity.class)
            .setData(Uri.parse("judexp://reminder/" + a.notificationId))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openApp = PendingIntent.getActivity(ctx, a.notificationId, open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(openApp);
        if (expires > 0) builder.setTimeoutAfter(expires - now);

        for (int i = 0; i < ANSWERS.length; i += 1) {
            Intent answer = new Intent(ctx, ReminderActionReceiver.class)
                // Extras do not make a PendingIntent distinct; the data URI does,
                // so no button of one reminder can overwrite another's.
                .setData(Uri.parse("judexp://reminder/" + a.notificationId + "/" + ANSWERS[i]));
            putExtras(answer, a);
            answer.putExtra(EXTRA_ANSWER, ANSWERS[i]);
            PendingIntent pi = PendingIntent.getBroadcast(ctx, i, answer,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            builder.addAction(0, BUTTONS[i], pi);
        }

        try {
            NotificationManagerCompat.from(ctx).notify(a.notificationId, builder.build());
        } catch (SecurityException e) {
            Log.w(TAG, "could not show reminder: " + e.getMessage());
        }
    }

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager.getNotificationChannel(CHANNEL) != null) return;
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Nhắc chấm", NotificationManager.IMPORTANCE_HIGH));
    }

    private static String localTime(String iso) {
        long ms = ReminderAnswer.parseIso(iso);
        if (ms < 0) return "?";
        return new SimpleDateFormat("HH:mm", Locale.US).format(new Date(ms));
    }
}
