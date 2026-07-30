package com.example.demo.records;

import com.example.demo.cloudera.Cloudera;
import io.quarkus.logging.Log;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import java.util.Locale;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Which Datenbasis this module is talking to — the one decision, in one place.
 *
 * <p>Two stand-ins for the same foreign system. Cloudera over Impala is what a deployment
 * has; PostgreSQL is the light one to develop against, native on any machine and up in
 * seconds. Nothing above this class knows which is in use, and that is the whole claim
 * being made: the module was written against a record catalogue, not against a query
 * engine, so the engine can be exchanged without touching a page, a resource or the batch.
 *
 * <p>Chosen at run time rather than at build time, so the same artefact runs either way —
 * a developer switches with one property, and the thing they ship is the thing they ran.
 *
 * <p>The adapters are {@code @Typed} to their own class, so neither is injectable as a
 * {@link RecordCatalog} by accident. The only way to get one is through here.
 */
@ApplicationScoped
public class Datenbasis {

    /** The stand-ins there are. A value outside this set is not a Datenbasis at all. */
    public enum Kind {
        IMPALA,
        POSTGRES;

        static Kind of(String configured) {
            try {
                return valueOf(configured.trim().toUpperCase(Locale.ROOT));
            }
            catch (IllegalArgumentException | NullPointerException unusable) {
                // Not an IllegalArgumentException on the way out: nothing about this is a
                // bad request, and the mapper that turns those into 400 would otherwise
                // report a misconfigured deployment as the caller's mistake.
                throw new IllegalStateException("demo.datenbasis must be one of "
                        + java.util.Arrays.toString(values()) + ", not '" + configured + "'");
            }
        }
    }

    @ConfigProperty(name = "demo.datenbasis", defaultValue = "postgres")
    String configured;

    @Inject
    Cloudera cloudera;

    @Inject
    PostgresRecords postgres;

    /**
     * Read once, at startup. A property nobody can spell is a deployment that must not
     * come up: checked here, the process refuses to start; checked lazily, it starts and
     * fails on somebody's first request instead.
     */
    void check(@Observes StartupEvent started) {
        Log.infof("Datenbasis: %s", kind());
    }

    private Kind kind() {
        return Kind.of(configured);
    }

    @Produces
    @ApplicationScoped
    public RecordCatalog catalog() {
        return kind() == Kind.IMPALA ? cloudera : postgres;
    }

    @Produces
    @ApplicationScoped
    public RecordWriter writer() {
        return kind() == Kind.IMPALA ? cloudera : postgres;
    }
}
