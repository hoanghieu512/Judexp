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
    /** Opaque to the native side: carried into the answer so the app writes it to the right kho. */
    public final String khoUri;
    public final long atMs;

    public ReminderAlarm(int notificationId, String reminderId, String kind, String key, String label,
                         String lookedUpAt, String expiresAt, String khoUri, long atMs) {
        this.notificationId = notificationId;
        this.reminderId = reminderId;
        this.kind = kind;
        this.key = key;
        this.label = label;
        this.lookedUpAt = lookedUpAt;
        this.expiresAt = expiresAt;
        this.khoUri = khoUri;
        this.atMs = atMs;
    }
}
