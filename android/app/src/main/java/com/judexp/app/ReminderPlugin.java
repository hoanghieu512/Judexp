package com.judexp.app;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import androidx.core.app.NotificationManagerCompat;

/** Schedules and cancels reminders; the receivers do the rest while the app is away. */
@CapacitorPlugin(
    name = "Reminder",
    permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class ReminderPlugin extends Plugin {

    @PluginMethod
    public void permission(PluginCall call) {
        resolveGranted(call);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            resolveGranted(call);
            return;
        }
        requestPermissionForAlias("notifications", call, "afterPermission");
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        resolveGranted(call);
    }

    private boolean granted() {
        // Below Android 13 posting needs no runtime permission.
        return Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED;
    }

    private void resolveGranted(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", granted());
        call.resolve(ret);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        Integer notificationId = call.getInt("notificationId");
        long at = call.getData().optLong("at", -1);
        String reminderId = call.getString("reminderId");
        if (notificationId == null || at < 0 || reminderId == null) {
            call.reject("notificationId, reminderId and at are required");
            return;
        }
        ReminderAlarm alarm = new ReminderAlarm(notificationId, reminderId,
            call.getString("kind", ""), call.getString("key", ""), call.getString("label", ""),
            call.getString("lookedUpAt", ""), call.getString("expiresAt", ""), call.getString("khoUri", ""), at);
        // A new lookup of the same entity replaces a reminder already showing.
        NotificationManagerCompat.from(getContext()).cancel(notificationId);
        ReminderAlarmReceiver.schedule(getContext(), alarm);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer notificationId = call.getInt("notificationId");
        if (notificationId == null) {
            call.reject("notificationId required");
            return;
        }
        ReminderAlarmReceiver.cancel(getContext(), notificationId);
        call.resolve();
    }
}
