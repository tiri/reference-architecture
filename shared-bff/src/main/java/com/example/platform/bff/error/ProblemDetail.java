package com.example.platform.bff.error;

/**
 * RFC 9457 problem details. The uniform error shape of every module — no internal
 * details leave the process (BSI APP.3.1).
 */
public record ProblemDetail(String type, String title, int status, String detail, String instance) {

    public static final String MEDIA_TYPE = "application/problem+json";

    public static ProblemDetail of(int status, String title, String detail, String instance) {
        return new ProblemDetail("about:blank", title, status, detail, instance);
    }
}
