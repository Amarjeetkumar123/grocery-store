// Collects "where" conditions with numbered placeholders ($1, $2 …) so
// values are always sent separately from the SQL text.
// Column names passed in come from code, never from user input.
export function createFilterBuilder() {
  const conditions = [];
  const values = [];

  const builder = {
    // Adds a value and returns its placeholder, e.g. "$3".
    addValue(value) {
      values.push(value);
      return `$${values.length}`;
    },

    // A fixed condition with no value, e.g. "product.active".
    where(condition) {
      conditions.push(condition);
      return builder;
    },

    // Skipped when value is null or undefined, so optional filters stay simple.
    whereEquals(column, value) {
      if (value !== null && value !== undefined) conditions.push(`${column} = ${builder.addValue(value)}`);
      return builder;
    },

    // Matches text anywhere in any of the columns; skipped when searchText is empty.
    whereAnyContains(columns, searchText) {
      const pattern = containsPattern(searchText);
      if (!pattern) return builder;
      const placeholder = builder.addValue(pattern);
      conditions.push(`(${columns.map((column) => `${column} ilike ${placeholder}`).join(' or ')})`);
      return builder;
    },

    build() {
      return { whereClause: conditions.length > 0 ? `where ${conditions.join(' and ')}` : '', values };
    },
  };
  return builder;
}

// Turns "dal %" typed by someone into a safe "contains" pattern.
function containsPattern(searchText) {
  const cleaned = typeof searchText === 'string' ? searchText.trim().slice(0, 60) : '';
  return cleaned ? `%${cleaned.replace(/[\\%_]/g, (character) => `\\${character}`)}%` : null;
}
