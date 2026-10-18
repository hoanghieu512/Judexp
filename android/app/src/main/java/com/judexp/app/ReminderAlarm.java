package com.judexp.app;

/**
 * One scheduled reminder, as the native side needs it. Plain values only, no
 * Android types, so it can be built and checked in JVM unit tests.
 */
public final class ReminderAlarm {
    public final int notificationId;
    public final String reminderId;
    public final String kind;
    public final String key;
    public final String label;
    public final String lookedUpAt;
    public final String expiresAt;
    public final long atMs;

    public ReminderAlarm(int notificationId, String reminderId, String kind, String key, String label,
                         String lookedUpAt, String expiresAt, long atMs) {
        this.notificationId = notificationId;
        this.reminderId = reminderId;
        this.kind = kind;
        this.key = key;
        this.label = label;
        this.lookedUpAt = lookedUpAt;
        this.expiresAt = expiresAt;
        this.atMs = atMs;
    }
}
