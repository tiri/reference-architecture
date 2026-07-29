package com.example.demo.audit;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.Instant;

/** Append-only audit record; updates and deletes are rejected by the database. */
@Entity
public class AuditEntry extends PanacheEntityBase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Instant occurredAt;

    public String actor;

    public String tenantId;

    public String recordType;

    public String recordId;

    public String action;

    public String detail;
}
