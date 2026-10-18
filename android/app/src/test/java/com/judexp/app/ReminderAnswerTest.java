package com.judexp.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import org.json.JSONObject;
import org.junit.Test;

public class ReminderAnswerTest {
    private static ReminderAlarm alarm(String label) {
        return new ReminderAlarm(
            4242, "driver:59H123456", "driver", "59H123456", label,
            "2026-10-16T08:40:00.000Z", "2026-10-18T08:40:00.000Z", "content://kho", 1792145633374L);
    }

    @Test
    public void toJsonCarriesEveryFieldInUtc() throws Exception {
        JSONObject json = new JSONObject(ReminderAnswer.toJson("a3f9c21d", alarm("59H1-234.56"), "bad", 1792145633374L));
        assertEquals("a3f9c21d", json.getString("answerId"));
        assertEquals("driver:59H123456", json.getString("reminderId"));
        assertEquals("driver", json.getString("kind"));
        assertEquals("59H123456", json.getString("key"));
        assertEquals("59H1-234.56", json.getString("label"));
        assertEquals("2026-10-16T08:40:00.000Z", json.getString("lookedUpAt"));
        assertEquals("2026-10-18T08:40:00.000Z", json.getString("expiresAt"));
        assertEquals("bad", json.getString("answer"));
        assertEquals("content://kho", json.getString("khoUri"));
        assertEquals("2026-10-16T10:13:53.374Z", json.getString("answeredAt"));
    }

    @Test
    public void labelWithQuotesAndDiacriticsRoundTrips() throws Exception {
        String label = "Quán \"Ngon\" Đà Lạt";
        JSONObject json = new JSONObject(ReminderAnswer.toJson("a1", alarm(label), "good", 0L));
        assertEquals(label, json.getString("label"));
    }

    @Test
    public void rejectsAnAnswerOutsideTheFour() {
        assertThrows(IllegalArgumentException.class, () -> ReminderAnswer.toJson("a1", alarm("x"), "maybe", 0L));
    }
}
