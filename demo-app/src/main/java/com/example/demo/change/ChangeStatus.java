package com.example.demo.change;

import java.util.Set;

/** The only states a queued change can occupy. */
public enum ChangeStatus {
    DRAFT,
    OPEN,
    APPLIED,
    FAILED;

    /** States in which the leading data source has not yet applied the request. */
    public static final Set<ChangeStatus> PENDING = Set.of(DRAFT, OPEN);
}
