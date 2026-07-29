package com.example.platform.bff.error;

import com.example.platform.bff.tenant.TenantAccessDeniedException;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class TenantAccessDeniedMapper implements ExceptionMapper<TenantAccessDeniedException> {

    @Override
    public Response toResponse(TenantAccessDeniedException exception) {
        return Response.status(Response.Status.FORBIDDEN)
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(ProblemDetail.of(403, "Tenant access denied", exception.getMessage(), null))
                .build();
    }
}
