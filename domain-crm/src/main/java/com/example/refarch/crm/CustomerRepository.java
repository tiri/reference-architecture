package com.example.refarch.crm;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Predicate;
import java.util.stream.Stream;

/**
 * In-memory customer store — replace with a Panache repository backed by
 * a real database for production use.
 */
@ApplicationScoped
public class CustomerRepository {

    private final Map<Integer, Customer> store    = new ConcurrentHashMap<>();
    private final AtomicInteger          sequence = new AtomicInteger(0);

    @PostConstruct
    void seed() {
        List.of(
            new Customer(next(), "Acme Corp",          "active",   "Technology",      124000, "contact@acmecorp.com",       "US"),
            new Customer(next(), "Globex",              "active",   "Manufacturing",    82000, "info@globex.com",            "US"),
            new Customer(next(), "Initech",             "inactive", "Finance",          31000, "hello@initech.com",          "US"),
            new Customer(next(), "Umbrella Corp",       "prospect", "Pharmaceuticals",      0, "sales@umbrella.com",         "CH"),
            new Customer(next(), "Stark Industries",    "active",   "Aerospace",       540000, "pepper@starkindustries.com", "US"),
            new Customer(next(), "Wayne Enterprises",   "active",   "Conglomerate",    320000, "lucius@wayne.com",           "US"),
            new Customer(next(), "Massive Dynamic",     "active",   "Technology",       97000, "walter@massivedynamic.com",  "US"),
            new Customer(next(), "Oscorp",              "inactive", "Biotechnology",    44000, "info@oscorp.com",            "US"),
            new Customer(next(), "Weyland Corp",        "prospect", "Mining",               0, "ceo@weylandcorp.com",        "GB"),
            new Customer(next(), "Tyrell Corporation",  "active",   "Technology",      215000, "contact@tyrellcorp.com",     "US"),
            new Customer(next(), "Cyberdyne Systems",   "inactive", "Robotics",         58000, "info@cyberdyne.com",         "US"),
            new Customer(next(), "Aperture Science",    "prospect", "Research",             0, "glados@aperture.com",        "US"),
            new Customer(next(), "Black Mesa",          "active",   "Research",         73000, "gordon@blackmesa.com",       "US"),
            new Customer(next(), "Abstergo Industries", "active",   "Pharmaceuticals", 189000, "contact@abstergo.com",       "IT"),
            new Customer(next(), "Veridian Dynamics",   "inactive", "Biotech",          22000, "info@veridian.com",          "CA"),
            new Customer(next(), "Soylent Corp",        "prospect", "Food",                 0, "sales@soylent.com",          "US"),
            new Customer(next(), "Nakatomi Trading",    "active",   "Finance",          66000, "info@nakatomi.co.jp",        "JP"),
            new Customer(next(), "Pendant Publishing",  "active",   "Media",            41000, "press@pendant.com",          "GB"),
            new Customer(next(), "Monsters Inc",        "active",   "Energy",          103000, "sully@monstersinc.com",      "US"),
            new Customer(next(), "Prestige Worldwide",  "inactive", "Logistics",        11000, "dale@prestige.com",          "US"),
            new Customer(next(), "Duff Corp",           "active",   "Beverages",        55000, "duff@duffcorp.com",          "US"),
            new Customer(next(), "Virtucon",            "prospect", "Conglomerate",         0, "number2@virtucon.com",       "DE"),
            new Customer(next(), "Kramerica Ind.",      "inactive", "Oil",               8000, "cosmo@kramerica.com",        "US"),
            new Customer(next(), "Vandelay Industries", "prospect", "Latex",                0, "art@vandelay.com",           "US"),
            new Customer(next(), "Bluth Company",       "active",   "Real Estate",      29000, "michael@bluth.com",          "US")
        ).forEach(c -> store.put(c.id(), c));
    }

    private int next() { return sequence.incrementAndGet(); }

    // ── Query ─────────────────────────────────────────────────────────────────

    public PageResult<Customer> query(String search, String status,
                                      String sort, String order,
                                      int page, int size) {

        Predicate<Customer> filter = buildFilter(search, status);
        Comparator<Customer> comparator = buildComparator(sort, order);

        List<Customer> filtered = store.values().stream()
                .filter(filter)
                .sorted(comparator)
                .toList();

        int total      = filtered.size();
        int totalPages = total == 0 ? 1 : (int) Math.ceil((double) total / size);
        int safeFrom   = Math.min(page * size, total);

        List<Customer> page_ = filtered.stream()
                .skip(safeFrom)
                .limit(size)
                .toList();

        return new PageResult<>(page_, total, page, size, totalPages);
    }

    public long countByStatus(String status) {
        return store.values().stream().filter(c -> c.status().equals(status)).count();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Predicate<Customer> buildFilter(String search, String status) {
        Predicate<Customer> p = c -> true;

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            p = p.and(c -> c.name().toLowerCase().contains(q)
                    || c.email().toLowerCase().contains(q)
                    || c.industry().toLowerCase().contains(q)
                    || c.country().toLowerCase().contains(q));
        }

        if (status != null && !status.isBlank() && !"all".equals(status)) {
            p = p.and(c -> c.status().equalsIgnoreCase(status));
        }

        return p;
    }

    private Comparator<Customer> buildComparator(String sort, String order) {
        Comparator<Customer> c = switch (sort == null ? "" : sort) {
            case "revenue"  -> Comparator.comparingInt(Customer::revenue);
            case "status"   -> Comparator.comparing(Customer::status,   String.CASE_INSENSITIVE_ORDER);
            case "industry" -> Comparator.comparing(Customer::industry, String.CASE_INSENSITIVE_ORDER);
            case "country"  -> Comparator.comparing(Customer::country,  String.CASE_INSENSITIVE_ORDER);
            case "email"    -> Comparator.comparing(Customer::email,    String.CASE_INSENSITIVE_ORDER);
            default         -> Comparator.comparing(Customer::name,     String.CASE_INSENSITIVE_ORDER);
        };
        return "desc".equalsIgnoreCase(order) ? c.reversed() : c;
    }
}
