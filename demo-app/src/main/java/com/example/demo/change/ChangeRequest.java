package com.example.demo.change;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;
import java.util.List;

/** A requested change, waiting for the timed run to apply it to the Cloudera. */
@Entity
public class ChangeRequest extends PanacheEntityBase {

    /**
     * Noted, not yet handed over. The user is still working: a draft can be looked at
     * next to everything else they changed, and taken back, before any of it is released.
     */
    public static final String DRAFT = "DRAFT";

    /** Submitted. From here it belongs to the batch, and the user cannot take it back. */
    public static final String OPEN = "OPEN";

    public static final String APPLIED = "APPLIED";
    public static final String FAILED = "FAILED";

    /** Both states in which the platform does not yet hold what the user asked for. */
    public static final List<String> PENDING = List.of(DRAFT, OPEN);

    public static final String KIND_RENAME = "rename";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String tenantId;

    public String recordId;

    public String kind;

    public String newValue;

    public String status;

    public String requestedBy;

    public Instant requestedAt;

    public Instant appliedAt;

    public String lastError;
}
