import { useState } from "react";
import { Send } from "lucide-react";
import { Button, Field } from "./ui";
import { TIME_WINDOWS, WASTE_TYPES } from "../utils/constants";
import { todayISO } from "../utils/format";

const EMPTY = { collection_address: "", waste_type: "Household", description: "", preferred_date: "", preferred_time_window: "Morning", notes: "" };

function validate(v) {
  const errors = {};
  if (v.collection_address.trim().length < 5) errors.collection_address = "Enter the full pickup address (at least 5 characters).";
  if (v.description.trim().length < 10) errors.description = "Describe the waste in at least 10 characters.";
  if (!v.preferred_date) errors.preferred_date = "Choose a preferred collection date.";
  else if (v.preferred_date < todayISO()) errors.preferred_date = "The date cannot be in the past.";
  return errors;
}

export default function RequestForm({ initial, submitLabel = "Submit request", onSubmit, onCancel }) {
  const [values, setValues] = useState({ ...EMPTY, ...(initial || {}), notes: initial?.notes || "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await onSubmit({ ...values, notes: values.notes.trim() || null });
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { form: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      {errors.form && (
        <div className="form-alert" role="alert">
          {errors.form}
        </div>
      )}
      <Field label="Pickup address" error={errors.collection_address}>
        <input value={values.collection_address} onChange={set("collection_address")} placeholder="House number, street, area" autoComplete="street-address" />
      </Field>
      <Field label="Waste type" error={errors.waste_type}>
        <select value={values.waste_type} onChange={set("waste_type")}>
          {WASTE_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Description" error={errors.description} hint="What should the crew expect? Quantity, bags, large items.">
        <textarea rows={4} value={values.description} onChange={set("description")} />
      </Field>
      <Field label="Preferred date" error={errors.preferred_date}>
        <input type="date" min={todayISO()} value={values.preferred_date} onChange={set("preferred_date")} />
      </Field>
      <Field label="Preferred time" error={errors.preferred_time_window}>
        <select value={values.preferred_time_window} onChange={set("preferred_time_window")}>
          {TIME_WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes for the crew (optional)" error={errors.notes}>
        <textarea rows={2} value={values.notes} onChange={set("notes")} placeholder="Gate code, landmark, where bags are placed" />
      </Field>
      <div className="form-actions">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving} icon={Send}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
