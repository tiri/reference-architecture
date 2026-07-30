package com.example.demo.query;

import java.util.List;

/**
 * A page as the wire carries it: the rows, and where the next page starts.
 *
 * <p>One shape for every list in the module. Both lists are read by the same component, so
 * a second copy of these four fields is a second thing to keep in step with it — and the
 * cursor is opaque to the client either way, which is what lets one shape serve stores that
 * page by entirely different keys.
 *
 * @param total only on the first page of a walk, {@code null} after it: the count is a full
 *              scan and does not get cheaper further in, while nothing here adds or removes
 *              rows, so the answer from the start of the walk still holds
 * @param next  the encoded cursor, or {@code null} at the end of the list
 */
public record PageView<T>(List<T> rows, Long total, String next, int size) {
}
