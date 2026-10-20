package com.judexp.app;

import java.util.List;

// Name rules SafPlugin applies to what the documents provider hands back. Kept free of Android
// types so they run as plain JUnit tests on the host.
final class SafNames {
    private SafNames() {}

    // Index in `names` of the one named `want`, else of one named `want` in another case (on a
    // case-insensitive disk that is the same document), or -1.
    static int pick(List<String> names, String want) {
        int exact = names.indexOf(want);
        if (exact >= 0) return exact;
        for (int i = 0; i < names.size(); i++) {
            if (want.equalsIgnoreCase(names.get(i))) return i;
        }
        return -1;
    }
}
