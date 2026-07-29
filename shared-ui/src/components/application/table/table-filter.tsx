import { Fragment } from "react";
import { FilterLines, Plus, Trash01, X } from "@untitledui/icons";
import { Dialog, DialogTrigger, Popover } from "react-aria-components";
import { Badge } from "@platform/shared-ui/src/components/base/badges/badges";
import { Button } from "@platform/shared-ui/src/components/base/buttons/button";
import { Input } from "@platform/shared-ui/src/components/base/input/input";
import { Select } from "@platform/shared-ui/src/components/base/select/select";

/** One condition, in the shape the API carries it: field, comparison, value. */
export interface Condition {
  field: string;
  operator: string;
  value: string;
}

export interface FilterField {
  id: string;
  label: string;
  /**
   * What can be asked of it. Text is compared; a date is only ever there or not — asking
   * whether a timestamp "begins with" something is a question with no honest answer.
   */
  kind?: "text" | "presence";
  /**
   * For a column that holds a code rather than prose: what the codes are, and what each
   * one is called in the table.
   *
   * <p>Without this the reader is asked to type into a box that compares against the
   * stored code, while the table in front of them shows the label — so typing exactly what
   * they can see returns nothing, and the filter looks broken. Given the values, the box
   * becomes a choice and the code never has to be guessed.
   */
  options?: { id: string; label: string }[];
}

const textOperators = [
  { id: "contains", label: "enthält" },
  { id: "starts", label: "beginnt mit" },
  { id: "ends", label: "endet mit" },
  { id: "equals", label: "ist gleich" },
];

const presenceOperators = [
  { id: "set", label: "ist gesetzt" },
  { id: "unset", label: "ist leer" },
];

/** A code is equal to one of its values or it is not; "beginnt mit" would be nonsense. */
const choiceOperators = [{ id: "equals", label: "ist" }];

const fieldOf = (fields: FilterField[], id: string) => fields.find((field) => field.id === id);

const operatorsOf = (fields: FilterField[], id: string) => {
  const field = fieldOf(fields, id);
  if (field?.kind === "presence") {
    return presenceOperators;
  }
  return field?.options ? choiceOperators : textOperators;
};

/** What the reader sees for a stored value — the label if the field has one. */
const valueLabel = (fields: FilterField[], condition: Condition) =>
  fieldOf(fields, condition.field)?.options?.find((option) => option.id === condition.value)?.label
  ?? condition.value;

const labelOf = (list: { id: string; label: string }[], id: string) =>
  list.find((entry) => entry.id === id)?.label ?? id;

const carriesValue = (operator: string) => operator !== "set" && operator !== "unset";

export const serializeConditions = (conditions: Condition[]) =>
  conditions.map((c) => `${c.field}:${c.operator}:${c.value}`);

/** Conditions with nothing in them are not yet conditions and are not asked about. */
export const usableConditions = (conditions: Condition[]) =>
  conditions.filter((c) => c.value.trim() !== "" || !carriesValue(c.operator));

const describe = (fields: FilterField[], condition: Condition) =>
  [
    labelOf(fields, condition.field),
    labelOf(operatorsOf(fields, condition.field), condition.operator),
    carriesValue(condition.operator) ? `„${valueLabel(fields, condition)}“` : "",
  ]
    .filter(Boolean)
    .join(" ");

/**
 * What the table is filtered by, each one removable where it is read. Reading which
 * conditions are in force and dropping one are the two things done most often, so neither
 * should require opening anything.
 */
export function FilterConditions({ fields, conditions, onRemove }: {
  fields: FilterField[];
  conditions: Condition[];
  onRemove: (index: number) => void;
}) {
  return (
    <>
      {conditions.map((condition, index) => (
        <Badge key={index} size="sm" color="brand" type="pill-color" className="gap-1 pr-1">
          {describe(fields, condition)}
          <button
            type="button"
            aria-label={`${describe(fields, condition)} entfernen`}
            onClick={() => onRemove(index)}
            className="rounded-full p-0.5 text-utility-brand-400 outline-focus-ring hover:bg-utility-brand-100 hover:text-utility-brand-500 focus-visible:outline-2"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
    </>
  );
}

/**
 * The builder, behind one icon: a table's question is read far more often than it is
 * edited, so it does not deserve a permanent strip across the table.
 *
 * <p>The conditions are laid out as a grid rather than as rows that wrap. With one
 * condition the difference is invisible; with six, wrapping puts each part wherever it
 * happens to fit and the columns stop lining up just as the reader most needs to compare
 * them.
 *
 * <p>Nothing is asked until "Anwenden" or Enter. Where a query costs seconds, filtering as
 * the reader types sends questions nobody asked and makes the one they did ask wait.
 */
export function FilterControl({ fields, conditions, onChange, onApply, dirty, active }: {
  fields: FilterField[];
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  onApply: () => void;
  dirty: boolean;
  active: number;
}) {
  const replace = (index: number, condition: Condition) =>
    onChange(conditions.map((existing, at) => (at === index ? condition : existing)));

  const add = () => {
    const first = fields[0]!;
    onChange([
      ...conditions,
      { field: first.id, operator: operatorsOf(fields, first.id)[0]!.id, value: "" },
    ]);
  };

  return (
    <DialogTrigger>
      <Button size="sm" color="secondary" iconLeading={FilterLines} aria-label="Filter">
        {active > 0 ? String(active) : undefined}
      </Button>
      <Popover
        placement="bottom end"
        offset={6}
        className="rounded-xl border border-secondary bg-primary p-4 shadow-lg outline-hidden"
      >
        <Dialog aria-label="Filter" className="outline-hidden">
          {/* Enter is caught here, on the way down: react-aria's text field stops the key
              before it can bubble, and Dialog takes no key handler at all — but a
              condition typed and confirmed with Enter is how anyone expects a filter to
              behave. Only from the value field: Enter on a button is that button's. */}
          <div
            className="flex flex-col gap-3"
            onKeyDownCapture={(event) => {
              if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
                onApply();
              }
            }}
          >
            {conditions.length === 0 ? (
              <p className="max-w-xs text-sm text-tertiary">
                Ohne Bedingung zeigt die Tabelle den gesamten Bestand.
              </p>
            ) : (
              // Capped and scrollable: a question with twenty conditions must not become a
              // panel taller than the screen it is filtering.
              <div className="grid max-h-80 grid-cols-[10rem_10rem_minmax(0,1fr)_auto] items-center gap-2 overflow-y-auto">
                {conditions.map((condition, index) => (
                  <Fragment key={index}>
                    <Select
                      aria-label="Feld"
                      size="sm"
                      items={fields}
                      selectedKey={condition.field}
                      onSelectionChange={(key) => {
                        // Fields do not all answer the same questions, so a field that
                        // cannot answer the current one gets the first it can.
                        const operators = operatorsOf(fields, String(key));
                        const operator = operators.some((e) => e.id === condition.operator)
                          ? condition.operator
                          : operators[0]!.id;
                        // The value belonged to the old field. Kept, it would be a code
                        // the new field has never heard of.
                        const options = fieldOf(fields, String(key))?.options;
                        const value = !options || options.some((o) => o.id === condition.value)
                          ? condition.value
                          : "";
                        replace(index, { ...condition, field: String(key), operator, value });
                      }}
                    >
                      {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    <Select
                      aria-label="Vergleich"
                      size="sm"
                      items={operatorsOf(fields, condition.field)}
                      selectedKey={condition.operator}
                      onSelectionChange={(key) =>
                        replace(index, { ...condition, operator: String(key) })}
                    >
                      {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    {carriesValue(condition.operator) && fieldOf(fields, condition.field)?.options ? (
                      // A code is chosen, never typed: the reader would otherwise have to
                      // guess the stored value from the label the table shows them.
                      <Select
                        aria-label="Wert"
                        size="sm"
                        placeholder="Wert wählen"
                        items={fieldOf(fields, condition.field)!.options}
                        selectedKey={condition.value || null}
                        onSelectionChange={(key) =>
                          replace(index, { ...condition, value: String(key) })}
                      >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                      </Select>
                    ) : carriesValue(condition.operator) ? (
                      <Input
                        aria-label="Wert"
                        size="sm"
                        value={condition.value}
                        onChange={(value) => replace(index, { ...condition, value })}
                        placeholder="Wert"
                      />
                    ) : (
                      // The cell still has to be filled, or the grid closes up and the
                      // delete buttons of the other rows move.
                      <span />
                    )}

                    <Button
                      size="sm"
                      color="tertiary"
                      iconLeading={Trash01}
                      aria-label="Bedingung entfernen"
                      onClick={() => onChange(conditions.filter((_, at) => at !== index))}
                    />
                  </Fragment>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button size="sm" color="secondary" iconLeading={Plus} onClick={add}>
                Bedingung
              </Button>
              {conditions.length > 1 && (
                <Button size="sm" color="link-gray" onClick={() => onChange([])}>
                  Alle entfernen
                </Button>
              )}
              {/* Only offered when it would change the answer — a button that repeats a
                  query already on screen is an invitation to wait for nothing. */}
              {dirty && (
                <Button size="sm" color="primary" className="ml-auto" onClick={onApply}>
                  Anwenden
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}
