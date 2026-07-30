package com.example.demo.change;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/** A requested change, waiting for the timed run to apply it to the Cloudera. */
@Entity
public class ChangeRequest extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String tenantId;

    public String recordId;

    @Enumerated(EnumType.STRING)
    public ChangeKind kind;

    public String newValue;

    @Enumerated(EnumType.STRING)
    public ChangeStatus status;

    public String requestedBy;

    public Instant requestedAt;

    public Instant appliedAt;

    public String lastError;

}
