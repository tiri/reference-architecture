package com.example.demo.query;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;

/**
 * The question a reader has put to a list, independent of where the list is kept.
 *
 * <p>Both lists in this module are asked the same way — the Datenbasis and the change
 * queue in the module's own database — so the vocabulary, the wire format and the rules
 * live here, and each store only supplies its own columns.
 *
 * <p>Nothing here knows it is reached over HTTP: a condition this list does not offer is
 * an {@link IllegalArgumentException}, and turning that into a status code is the web
 * layer's business — see {@code InvalidInputMapper}.
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
     * How a placeholder is written — a property of the interface the SQL is handed to, not
     * of the database behind it. The same PostgreSQL takes both: plain JDBC counts
     * positionally and wants a bare {@code ?}, while Hibernate's native queries want their
     * parameters numbered.
     */
    public enum Parameters {
        JDBC {
            @Override
            String at(int index) {
                return "?";
            }
        },
        NUMBERED {
            @Override
            String at(int index) {
                return "?" + index;
            }
        };

        abstract String at(int index);
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
    public static List<Condition> parse(List<String> raw, Set<String> fields) {
        return raw.stream().map(entry -> {
            String[] parts = entry.split(":", 3);
            if (parts.length < 2) {
                throw new IllegalArgumentException("malformed condition " + entry);
            }
            if (!"any".equals(parts[0]) && !fields.contains(parts[0])) {
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
            Map<String, String> columns, List<String> anyColumns, Parameters parameters) {
        StringBuilder sql = new StringBuilder("where " + tenantColumn + " = "
                + parameters.at(1));
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
                alternatives.add(predicate(column, condition, params, parameters));
            }
            sql.append(alternatives);
        }
        return new Where(sql.toString(), params);
    }

    /**
     * One comparison, as SQL with its value bound.
     *
     * <p>Deliberately not LIKE: the reader's text would then carry {@code %} and {@code _}
     * as wildcards, so a search for "50 %" would quietly mean something else. Comparing the
     * text as text needs no escaping at all, and no engine has to be trusted to implement an
     * ESCAPE clause the same way.
     */
    private static String predicate(String column, Condition condition, List<String> params,
            Parameters parameters) {
        if (condition.operator() == Operator.SET) {
            return column + " is not null";
        }
        if (condition.operator() == Operator.UNSET) {
            return column + " is null";
        }
        params.add(condition.value());
        String first = parameters.at(params.size());
        return switch (condition.operator()) {
            case CONTAINS -> "strpos(lower(" + column + "), lower(" + first + ")) > 0";
            case STARTS -> "strpos(lower(" + column + "), lower(" + first + ")) = 1";
            // The value is needed twice — once for how many characters to take from the
            // right, once to compare them. Neither driver has a reusable placeholder.
            case ENDS -> {
                params.add(condition.value());
                yield "right(lower(" + column + "), length(" + first + ")) = lower("
                        + parameters.at(params.size()) + ")";
            }
            case EQUALS -> "lower(" + column + ") = lower(" + first + ")";
            default -> throw new IllegalStateException("unhandled operator " + condition.operator());
        };
    }
}
