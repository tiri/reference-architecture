package com.example.demo.records;

/**
 * Changing a record in the Datenbasis — the one thing this module does to the leading
 * source, and only ever from the batch.
 *
 * <p>Its own interface rather than two more methods on {@link RecordCatalog}: everything
 * that serves a page depends on the catalogue, and nothing that serves a page should be
 * able to write. Narrow enough that a caller cannot do more than its job needs is worth
 * more here than one interface fewer.
 */
public interface RecordWriter {

    /**
     * Applies an accepted change. The tenant is part of the predicate, never assumed.
     *
     * @throws RuntimeException if the record is not there for this tenant — one bad
     *         record must not look like a successful write
     */
    void rename(String tenantId, String recordId, String newName);
}
