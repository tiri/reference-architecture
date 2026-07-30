package com.example.demo.records;

import com.example.platform.bff.error.ProblemDetail;
import io.quarkus.logging.Log;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * The Datenbasis could not answer, as an answer.
 *
 * <p>503, not 500: nothing is wrong with this module. A foreign system it depends on is
 * unreachable or refused the query, and the same request may well succeed in a minute — which
 * is what a 503 tells a client and a 500 does not.
 *
 * <p>Without this the response is Quarkus's default body, {@code {"details":"Error id …"}} —
 * not the {@code application/problem+json} every other error in the platform speaks, and
 * nothing a page can tell a reader beyond "es ist ein Fehler aufgetreten". The module keeps
 * no copy of the records, so this is not an edge case: it is what the whole application looks
 * like whenever the leading source is down, and it should look deliberate.
 *
 * <p>The cause is logged here and not sent. It names hosts, roles and SQL — the caller gets
 * the fact and the operator gets the detail.
 */
@Provider
public class DatenbasisUnavailableMapper implements ExceptionMapper<DatenbasisException> {

    @Override
    public Response toResponse(DatenbasisException failure) {
        Log.error("Datenbasis unavailable", failure);
        return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(ProblemDetail.of(503, "Datenbasis nicht erreichbar",
                        "Die Datensätze werden aus der Datenbasis gelesen; sie antwortet "
                                + "derzeit nicht. Bitte später erneut versuchen.", null))
                .build();
    }
}
