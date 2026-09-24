import type { ProductAttribute, Variant } from "@/lib/api";

/** attributeId → valueId elegido. */
export type Selection = Record<number, number | undefined>;

function selectedIds(selection: Selection, exceptAttributeId?: number) {
  return Object.entries(selection)
    .filter(([attrId, v]) => v !== undefined && Number(attrId) !== exceptAttributeId)
    .map(([, v]) => v as number);
}

/** La variante que corresponde a la selección, solo si todos los atributos están elegidos. */
export function findVariant(attributes: ProductAttribute[], variants: Variant[], selection: Selection): Variant | undefined {
  if (attributes.some((a) => selection[a.id] === undefined)) return undefined;
  const ids = selectedIds(selection);
  return variants.find((v) => ids.every((id) => v.valueIds.includes(id)));
}

/** Un valor se puede elegir si existe alguna variante que lo combine con el resto de lo ya elegido. */
export function isValueEnabled(variants: Variant[], selection: Selection, attributeId: number, valueId: number) {
  const others = selectedIds(selection, attributeId);
  return variants.some((v) => v.valueIds.includes(valueId) && others.every((id) => v.valueIds.includes(id)));
}

/** Aplica una elección y descarta las otras elecciones que dejan de ser compatibles. */
export function select(attributes: ProductAttribute[], variants: Variant[], selection: Selection, attributeId: number, valueId: number): Selection {
  const next: Selection = { ...selection, [attributeId]: valueId };
  for (const attr of attributes) {
    const current = next[attr.id];
    if (attr.id !== attributeId && current !== undefined && !isValueEnabled(variants, next, attr.id, current)) {
      next[attr.id] = undefined;
    }
  }
  return next;
}

/** Preselecciona los atributos que tienen un único valor posible. */
export function initialSelection(attributes: ProductAttribute[]): Selection {
  return Object.fromEntries(attributes.filter((a) => a.values.length === 1).map((a) => [a.id, a.values[0].id]));
}

/** "Medida 2.40 · Grosor 34 · Color Caoba" */
export function describeSelection(attributes: ProductAttribute[], selection: Selection) {
  return attributes
    .map((a) => {
      const value = a.values.find((v) => v.id === selection[a.id]);
      return value ? `${a.name} ${value.label}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}
