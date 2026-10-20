package com.judexp.app;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public class SafNamesTest {

    @Test
    public void picksTheExactName() {
        assertEquals(1, SafNames.pick(Arrays.asList("Events", "events"), "events"));
    }

    // On a case-insensitive disk (UBS1) "Events" is the folder "events" names.
    @Test
    public void picksTheNameInAnotherCaseWhenNoneMatchesExactly() {
        assertEquals(1, SafNames.pick(Arrays.asList("inbox", "Events"), "events"));
    }

    // The provider may send a child without a name while it hides the kho.
    @Test
    public void picksPastAChildWithoutAName() {
        assertEquals(1, SafNames.pick(Arrays.asList(null, "Events"), "events"));
    }

    @Test
    public void picksNothingWhenNoNameMatchesInAnyCase() {
        assertEquals(-1, SafNames.pick(Arrays.asList("inbox", "events (1)"), "events"));
    }

    @Test
    public void picksNothingFromAnEmptyListing() {
        assertEquals(-1, SafNames.pick(Collections.<String>emptyList(), "events"));
    }
}
