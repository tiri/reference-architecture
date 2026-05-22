package com.example.refarch.crm;

import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.Map;

@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Authenticated
public class DashboardResource {

    @Inject
    CustomerRepository customers;

    @GET
    @Path("/dashboard")
    public Map<String, Object> dashboard(@QueryParam("org") String org) {
        return Map.of(
                "domain",    "crm",
                "org",       org != null ? org : "all",
                "customers", customers.countByStatus("active"),
                "leads",     customers.countByStatus("prospect"),
                "tasks",     7L);
    }

    @GET
    @Path("/customers")
    public PageResult<Customer> customers(
            @QueryParam("page")   @DefaultValue("0")    int page,
            @QueryParam("size")   @DefaultValue("8")    int size,
            @QueryParam("sort")   @DefaultValue("name") String sort,
            @QueryParam("order")  @DefaultValue("asc")  String order,
            @QueryParam("search") String search,
            @QueryParam("status") String status) {

        return customers.query(search, status, sort, order, page, size);
    }
}
