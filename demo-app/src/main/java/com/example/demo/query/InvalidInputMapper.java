package com.example.demo.query;

import com.example.platform.bff.error.ProblemDetail;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Input the module will not accept, as a status code: a condition on a field no list
 * offers, a change of an unknown kind, a name that is empty or absurdly long.
 *
 * <p>Everything that rejects such input does so by throwing
 * {@link IllegalArgumentException} from where it knows what is wrong — a record's compact
 * constructor, a whitelist check — and this is the single place that knows what the web
 * should say about it. Keeping it out of those classes is what lets them be used by
 * anything; keeping it out of the resources is what stops the same three lines appearing
 * in each of them.
 *
 * <p><b>Only the caller's mistakes.</b> A misconfigured deployment is not a bad request,
 * which is why nothing in this module signals that with an IllegalArgumentException — see
 * {@link com.example.demo.records.Datenbasis}. This mapper would otherwise blame the
 * caller for it, with a 400 and an explanation they can do nothing about.
 */
@Provider
public class InvalidInputMapper implements ExceptionMapper<IllegalArgumentException> {

    @Override
    public Response toResponse(IllegalArgumentException refused) {
        return Response.status(Response.Status.BAD_REQUEST)
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(ProblemDetail.of(400, "Ungültige Eingabe", refused.getMessage(), null))
                .build();
    }
}
