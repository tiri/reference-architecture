package com.example.demo.change;

/**
 * A validated change ready to enter the queue.
 *
 * <p>This is deliberately separate from {@link ChangeRequest}: one is an input to the
 * application, the other is the persisted history of that input.
 */
public record RequestedChange(String recordId, ChangeKind kind, String newValue) {

    private static final int MAX_RECORD_ID_LENGTH = 32;
    private static final int MAX_NEW_VALUE_LENGTH = 255;

    public RequestedChange {
        if (recordId == null || recordId.isBlank() || recordId.length() > MAX_RECORD_ID_LENGTH) {
            throw new IllegalArgumentException("ungültige Datensatz-ID");
        }
        if (kind == null) {
            throw new IllegalArgumentException("unbekannte Änderungsart");
        }
        if (newValue == null) {
            throw new IllegalArgumentException("ein neuer Name ist erforderlich");
        }
        newValue = newValue.trim();
        if (newValue.isEmpty() || newValue.length() > MAX_NEW_VALUE_LENGTH) {
            throw new IllegalArgumentException("ungültiger neuer Name");
        }
    }
}
