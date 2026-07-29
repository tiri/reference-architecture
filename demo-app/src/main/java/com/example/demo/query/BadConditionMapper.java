package com.example.demo.query;

import com.example.platform.bff.error.ProblemDetail;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * A condition a list does not offer, as a status code.
 *
 * <p>This is the only place that knows both — that {@link Conditions} refuses by throwing,
 * and that the web answers with 400. Keeping it out of the query model is what lets that
 * model be used by anything, and keeping it out of the resources is what stops the same
 * three lines appearing in each of them.
 *
 * <p>It also gives the refusal a body: an empty 400 tells a caller only that something was
 * wrong with an entire request.
 */
@Provider
public class BadConditionMapper implements ExceptionMapper<IllegalArgumentException> {

    @Override
    public Response toResponse(IllegalArgumentException refused) {
        return Response.status(Response.Status.BAD_REQUEST)
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(ProblemDetail.of(400, "Bedingung nicht möglich", refused.getMessage(), null))
                .build();
    }
}
