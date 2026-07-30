package com.example.demo.change;

import java.util.Locale;

/**
 * What kind of change was asked for. One today, and still an enum: {@code kind} decides
 * what the batch does with a row, and a String there means every place that reads it has
 * to agree on a spelling that the compiler never checks.
 *
 * <p>Adding a kind is then a compile error in each place that must handle it — the batch's
 * switch, this enum — instead of a row the batch skips at three in the morning.
 */
public enum ChangeKind {

    /** Give the record a different name. */
    RENAME;

    /**
     * The kind as a caller spelled it. Case-insensitive: this is what arrives over HTTP,
     * and a client writing "rename" is not making a mistake worth a 400.
     */
    public static ChangeKind of(String name) {
        try {
            return valueOf(name.trim().toUpperCase(Locale.ROOT));
        }
        catch (IllegalArgumentException | NullPointerException unknown) {
            throw new IllegalArgumentException("unbekannte Änderungsart");
        }
    }
}
