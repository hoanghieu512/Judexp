package com.judexp.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.List;
import org.junit.Test;

public class ReminderRescheduleTest {
    /** 2026-10-18T12:00:00.000Z */
    private static final long NOW = 1792324800000L;

    private static String pending(String dueAt, String expiresAt) {
        return "{\"version\":1,\"reminders\":[{\"id\":\"driver:59H123456\",\"notificationId\":4242,"
            + "\"kind\":\"driver\",\"key\":\"59H123456\",\"label\":\"59H1-234.56\","
            + "\"lookedUpAt\":\"2026-10-18T11:00:00.000Z\",\"dueAt\":\"" + dueAt + "\",\"expiresAt\":\"" + expiresAt + "\",\"khoUri\":\"content://kho\"}]}";
    }

    @Test
    public void keepsAFutureDueTime() {
        List<ReminderAlarm> alarms = ReminderReschedule.afterBoot(pending("2026-10-18T12:30:00.000Z", "2026-10-20T11:00:00.000Z"), NOW);
        assertEquals(1, alarms.size());
        ReminderAlarm a = alarms.get(0);
        assertEquals(NOW + 30 * 60_000L, a.atMs);
        assertEquals("driver:59H123456", a.reminderId);
        assertEquals(4242, a.notificationId);
        assertEquals("59H1-234.56", a.label);
        assertEquals("2026-10-18T11:00:00.000Z", a.lookedUpAt);
        assertEquals("2026-10-20T11:00:00.000Z", a.expiresAt);
        assertEquals("content://kho", a.khoUri);
    }

    @Test
    public void firesSoonWhenTheDueTimePassedWhileOff() {
        List<ReminderAlarm> alarms = ReminderReschedule.afterBoot(pending("2026-10-18T11:30:00Z", "2026-10-20T11:00:00Z"), NOW);
        assertEquals(1, alarms.size());
        assertEquals(NOW + 60_000L, alarms.get(0).atMs);
    }

    @Test
    public void dropsExpiredReminders() {
        assertTrue(ReminderReschedule.afterBoot(pending("2026-10-16T12:30:00.000Z", "2026-10-18T12:00:00.000Z"), NOW).isEmpty());
    }

    @Test
    public void ignoresMalformedJson() {
        assertTrue(ReminderReschedule.afterBoot("{oops", NOW).isEmpty());
    }

    @Test
    public void ignoresAnUnknownVersion() {
        String v2 = pending("2026-10-18T12:30:00.000Z", "2026-10-20T11:00:00.000Z").replace("\"version\":1", "\"version\":2");
        assertTrue(ReminderReschedule.afterBoot(v2, NOW).isEmpty());
    }
}
