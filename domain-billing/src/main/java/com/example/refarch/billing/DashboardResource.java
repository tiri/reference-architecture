package com.example.refarch.billing;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

import jakarta.ws.rs.QueryParam;
import java.util.List;
import java.util.Map;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class DashboardResource {

    @GET
    @Path("/dashboard")
    public Map<String, Object> dashboard(@QueryParam("org") String org) {
        return Map.of("domain", "billing", "org", org != null ? org : "all",
                "invoices", 34, "outstanding", 12, "revenue", 48750);
    }

    @GET
    @Path("/invoices")
    public List<Map<String, Object>> invoices() {
        return List.of(
                Map.of("id", "INV-001", "customer", "Acme Corp", "amount", 1200, "status", "paid"),
                Map.of("id", "INV-002", "customer", "Globex",    "amount", 3400, "status", "pending"),
                Map.of("id", "INV-003", "customer", "Initech",   "amount",  890, "status", "overdue")
        );
    }
}
