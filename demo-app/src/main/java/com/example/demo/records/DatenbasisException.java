package com.example.demo.records;

/**
 * The Datenbasis could not answer.
 *
 * <p>Owned by the port, not by whichever adapter is behind it. A caller that had to catch
 * {@code ClouderaException} would be written against Impala — the one thing this boundary
 * exists to prevent — and the module would stop being able to exchange the two stand-ins
 * the moment anyone did.
 *
 * <p>Unchecked, and nothing in this module catches it: a page that cannot be read is a 500,
 * and the exception mapper's default is already the right answer. Wrapping the driver's
 * failure adds the one thing a stack trace does not carry — which tenant, and what was
 * being asked.
 */
public class DatenbasisException extends RuntimeException {

    public DatenbasisException(String message) {
        super(message);
    }

    public DatenbasisException(String message, Throwable cause) {
        super(message, cause);
    }
}
