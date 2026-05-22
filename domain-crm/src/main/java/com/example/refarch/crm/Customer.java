package com.example.refarch.crm;

public record Customer(
        int    id,
        String name,
        String status,
        String industry,
        int    revenue,
        String email,
        String country
) {}
