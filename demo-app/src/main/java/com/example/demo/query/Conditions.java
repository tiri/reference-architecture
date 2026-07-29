package com.example.demo.query;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;

/**
 * The question a reader has put to a list, independent of where the list is kept.
 *
 * <p>Both stores in this module are asked the same way — the platform over Impala and the
 * change queue in the module's own database — so the vocabulary, the wire format and the
 * rules live here, and only the SQL function names differ.
 *
 * <p>Nothing here knows it is reached over HTTP: a condition this list does not offer is
 * an {@link IllegalArgumentException}, and turning that into a status code is the web
 * layer's business — see {@code BadConditionMapper}.
 *
 * <p><b>What is bound and what is not.</b> The value a reader types is always a bound
 * parameter. The column and the comparison become SQL, which is why both are whitelists
 * rather than anything the caller can name: this SQL runs on a system the whole
 * organisation shares.
 */
public final class Conditions {

    private Conditions() {
    }

    /** The comparisons a list offers. Anything else is not a question this module knows. */
    public enum Operator {
        CONTAINS, STARTS, ENDS, EQUALS, SET, UNSET;

        static Operator of(String name) {
            try {
                return valueOf(name.toUpperCase(Locale.ROOT));
            }
            catch (IllegalArgumentException unknown) {
                throw new IllegalArgumentException("unknown operator " + name);
            }
        }

        /** SET and UNSET ask whether there is a value at all, so they carry none. */
        public boolean needsValue() {
            return this != SET && this != UNSET;
        }
    }

    /** One condition: a field, how to compare, and what to compare against. */
    public record Condition(String field, Operator operator, String value) {

        /** A condition without a value is not yet a condition — the reader is still typing. */
        boolean isComplete() {
            return !operator.needsValue() || (value != null && !value.isBlank());
        }
    }

    /**
     * How a store spells the two comparisons that are not plain operators, and how it
     * writes a placeholder. Everything else about the SQL is the same on both.
     */
    public enum Dialect {
        /** Impala, over the platform. */
        IMPALA("instr", "strright") {
            @Override
            String placeholder(int index) {
                return "?";
            }
        },
        /** PostgreSQL, the module's own database, through a native query. */
        POSTGRES("strpos", "right") {
            @Override
            String placeholder(int index) {
                // Hibernate wants its native-query parameters numbered.
                return "?" + index;
            }
        };

        private final String position;
        private final String fromRight;

        Dialect(String position, String fromRight) {
            this.position = position;
            this.fromRight = fromRight;
        }

        abstract String placeholder(int index);
    }

    /** A where clause and the values its placeholders stand for, in the order they appear. */
    public record Where(String sql, List<String> params) {
    }

    /**
     * Conditions as the query string carries them: {@code f=name:contains:Meier}, one
     * parameter per condition. Split into three at most, so the value may contain colons.
     *
     * <p>A field this list does not offer is refused rather than dropped: a filtered list
     * is what the reader asked for, and quietly answering with an unfiltered one is the
     * kind of wrong answer nobody notices.
     */
    public static List<Condition> parse(List<String> raw, Map<String, String> columns) {
        return raw.stream().map(entry -> {
            String[] parts = entry.split(":", 3);
            if (parts.length < 2) {
                throw new IllegalArgumentException("malformed condition " + entry);
            }
            if (!"any".equals(parts[0]) && !columns.containsKey(parts[0])) {
                throw new IllegalArgumentException("unknown field " + parts[0]);
            }
            return new Condition(parts[0], Operator.of(parts[1]),
                    parts.length == 3 ? parts[2] : null);
        }).toList();
    }

    /**
     * The tenant, and every condition the reader has put on the list, combined with AND —
     * each condition narrows the result, which is what a reader adding one expects.
     *
     * @param columns    the fields this list offers, by the name the frontend uses
     * @param anyColumns what "all fields" means here
     */
    public static Where where(String tenantColumn, String tenantId, List<Condition> conditions,
            Map<String, String> columns, List<String> anyColumns, Dialect dialect) {
        StringBuilder sql = new StringBuilder("where " + tenantColumn + " = "
                + dialect.placeholder(1));
        List<String> params = new ArrayList<>();
        params.add(tenantId);
        for (Condition condition : conditions) {
            if (!condition.isComplete()) {
                continue;
            }
            // Over one column, or over all of them when the reader has not said which —
            // then any of them matching is a match.
            List<String> targets = "any".equals(condition.field())
                    ? anyColumns
                    : List.of(columns.get(condition.field()));
            StringJoiner alternatives = new StringJoiner(" or ", " and (", ")");
            for (String column : targets) {
                alternatives.add(predicate(column, condition, params, dialect));
            }
            sql.append(alternatives);
        }
        return new Where(sql.toString(), params);
    }

    /**
     * One comparison, as SQL with its value bound.
     *
     * <p>Deliberately not LIKE: the reader's text would then carry {@code %} and {@code _}
     * as wildcards, so a search for "50 %" would quietly mean something else — and Impala
     * has no ESCAPE clause to take that back. Comparing the text as text needs no escaping
     * at all, and reads the same on both stores.
     */
    private static String predicate(String column, Condition condition, List<String> params,
            Dialect dialect) {
        if (condition.operator() == Operator.SET) {
            return column + " is not null";
        }
        if (condition.operator() == Operator.UNSET) {
            return column + " is null";
        }
        params.add(condition.value());
        String first = dialect.placeholder(params.size());
        return switch (condition.operator()) {
            case CONTAINS -> dialect.position + "(lower(" + column + "), lower(" + first + ")) > 0";
            case STARTS -> dialect.position + "(lower(" + column + "), lower(" + first + ")) = 1";
            // The value is needed twice — once for how many characters to take from the
            // right, once to compare them. Neither driver has a reusable placeholder.
            case ENDS -> {
                params.add(condition.value());
                yield dialect.fromRight + "(lower(" + column + "), length(" + first + ")) = lower("
                        + dialect.placeholder(params.size()) + ")";
            }
            case EQUALS -> "lower(" + column + ") = lower(" + first + ")";
            default -> throw new IllegalStateException("unhandled operator " + condition.operator());
        };
    }
}
