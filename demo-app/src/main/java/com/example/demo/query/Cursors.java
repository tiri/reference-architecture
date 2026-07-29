package com.example.demo.query;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.function.BiFunction;

/**
 * Where a page ended, as something the browser can carry but not compose.
 *
 * <p>Opaque on purpose: it is the module's business where a page ended, and a client that
 * assembled one by hand would be relying on the shape of a sort key. Both lists in this
 * module page the same way, so they encode it the same way.
 */
public final class Cursors {

    /** Separates the sort key from the tie-breaking id — a character no key contains. */
    private static final char SEPARATOR = '';

    private Cursors() {
    }

    public static String encode(String key, String id) {
        return key == null ? null
                : Base64.getUrlEncoder().withoutPadding()
                        .encodeToString((key + SEPARATOR + id).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * @return the cursor, or null — which means "start at the beginning". A cursor we did
     *         not issue is not an error: it is a position, and a lost position simply
     *         starts the list again.
     */
    public static <T> T decode(String cursor, BiFunction<String, String, T> asCursor) {
        if (cursor == null || cursor.isBlank()) {
            return null;
        }
        try {
            String[] parts = new String(Base64.getUrlDecoder().decode(cursor),
                    StandardCharsets.UTF_8).split(String.valueOf(SEPARATOR), 2);
            return parts.length == 2 ? asCursor.apply(parts[0], parts[1]) : null;
        }
        catch (IllegalArgumentException malformed) {
            return null;
        }
    }
}
