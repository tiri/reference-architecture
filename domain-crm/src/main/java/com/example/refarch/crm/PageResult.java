package com.example.refarch.crm;

import java.util.List;

public record PageResult<T>(
        List<T> items,
        int     total,
        int     page,
        int     size,
        int     totalPages
) {}
