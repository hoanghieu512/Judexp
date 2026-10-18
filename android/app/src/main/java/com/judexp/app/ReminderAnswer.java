package com.judexp.app;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The file a notification button leaves behind. Native code never builds an
 * event: it only records which button was pressed, when, and for which
 * reminder. The app turns that into an event with its own code next time it
 * opens, so the event schema lives in one place.
 */
public final class ReminderAnswer {
    /** Under getFilesDir(), which is Directory.Data on the JS side. */
    public static final String DIR = "reminder-answers";

    private static final List<String> ANSWERS = Arrays.asList("good", "ok", "bad", "skip");

    private ReminderAnswer() {}

    /** UTC with milliseconds; minSdk 24 has no java.time. */
    public static String isoUtc(long ms) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(ms));
    }

    public static String toJson(String answerId, ReminderAlarm alarm, String answer, long answeredAtMs) {
        if (!ANSWERS.contains(answer)) throw new IllegalArgumentException("unknown answer: " + answer);
        try {
            JSONObject json = new JSONObject();
            json.put("answerId", answerId);
            json.put("reminderId", alarm.reminderId);
            json.put("kind", alarm.kind);
            json.put("key", alarm.key);
            json.put("label", alarm.label);
            json.put("lookedUpAt", alarm.lookedUpAt);
            json.put("expiresAt", alarm.expiresAt);
            json.put("answer", answer);
            json.put("answeredAt", isoUtc(answeredAtMs));
            return json.toString();
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
    }
}
