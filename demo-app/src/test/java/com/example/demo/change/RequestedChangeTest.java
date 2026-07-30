package com.example.demo.change;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class RequestedChangeTest {

    @Test
    void normalizesAnAcceptedRename() {
        RequestedChange change = new RequestedChange("record-1", ChangeKind.RENAME,
                "  Neuer Name  ");

        assertEquals("Neuer Name", change.newValue());
    }

    @Test
    void rejectsInvalidQueueWorkBeforeItReachesTheBatch() {
        assertThrows(IllegalArgumentException.class, () ->
                new RequestedChange("", ChangeKind.RENAME, "Name"));
        assertThrows(IllegalArgumentException.class, () ->
                new RequestedChange("record-1", ChangeKind.RENAME, " "));
    }

    /**
     * An unknown kind is now refused a step earlier, where the caller's text is read: past
     * that point there is no value to check, because there is no such constant.
     */
    @Test
    void rejectsAKindTheBatchCouldNotApply() {
        assertThrows(IllegalArgumentException.class, () -> ChangeKind.of("delete"));
        assertThrows(IllegalArgumentException.class, () -> ChangeKind.of(null));
        assertEquals(ChangeKind.RENAME, ChangeKind.of("rename"));
    }
}
