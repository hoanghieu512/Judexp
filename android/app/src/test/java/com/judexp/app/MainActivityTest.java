package com.judexp.app;

import org.junit.Test;

public class MainActivityTest {
    // When no WebView can be created (Android System WebView updating or
    // disabled), BridgeActivity shows its "no WebView" message and leaves the
    // bridge null. Painting the page colour must not turn that into a crash.
    @Test
    public void paintingTheWebViewSkipsAMissingBridge() {
        MainActivity.paintWebView(null, 0xFFF6EDDD);
    }
}
