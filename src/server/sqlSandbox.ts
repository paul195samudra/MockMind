import { DatabaseSync } from 'node:sqlite';
import { SqlExecutionResult } from '../types';

const DEFAULT_SQL_SETUP = `
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  salary INTEGER NOT NULL,
  hire_date TEXT NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  account_id TEXT NOT NULL,
  tx_type TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE prescriptions (
  id INTEGER PRIMARY KEY,
  ndc_code TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  drug_name TEXT NOT NULL,
  days_supply INTEGER NOT NULL,
  filled_at TEXT NOT NULL
);

INSERT INTO departments (id, name, location) VALUES
  (1, 'Engineering', 'New York'),
  (2, 'Product', 'San Francisco'),
  (3, 'Analytics', 'Austin'),
  (4, 'Healthcare Ops', 'Boston');

INSERT INTO employees (id, name, department_id, salary, hire_date) VALUES
  (101, 'Alice Chen', 1, 165000, '2022-03-15'),
  (102, 'Bob Rivera', 1, 148000, '2023-01-10'),
  (103, 'Carla Gomez', 1, 165000, '2021-07-01'),
  (104, 'David Kim', 2, 138000, '2022-11-20'),
  (105, 'Elena Novak', 2, 152000, '2020-09-05'),
  (106, 'Farid Hassan', 3, 129000, '2024-02-12'),
  (107, 'Grace Patel', 3, 141000, '2021-05-19'),
  (108, 'Henry Cho', 4, 134000, '2023-06-01');

INSERT INTO customers (id, name, email, tier) VALUES
  (1, 'Northstar Labs', 'ops@northstar.io', 'Enterprise'),
  (2, 'Beacon Health', 'it@beaconhealth.org', 'Enterprise'),
  (3, 'Summit Retail', 'hello@summitretail.com', 'Growth'),
  (4, 'Civic Credit', 'data@civiccredit.com', 'Enterprise'),
  (5, 'Lumen Studio', 'team@lumenstudio.co', 'Starter');

INSERT INTO orders (id, customer_id, order_date, total_amount, status) VALUES
  (501, 1, '2025-01-10', 4200.00, 'completed'),
  (502, 1, '2025-02-14', 3150.50, 'completed'),
  (503, 2, '2025-02-01', 8900.00, 'completed'),
  (504, 3, '2025-02-19', 1200.00, 'pending'),
  (505, 4, '2025-02-22', 6400.00, 'completed'),
  (506, 2, '2025-03-02', 1950.00, 'completed');

INSERT INTO transactions (id, account_id, tx_type, amount, created_at) VALUES
  (9001, 'ACC-100', 'credit', 5000.00, '2025-03-01T09:00:00Z'),
  (9002, 'ACC-100', 'debit', 1250.00, '2025-03-01T10:15:00Z'),
  (9003, 'ACC-200', 'credit', 9800.00, '2025-03-02T11:30:00Z'),
  (9004, 'ACC-100', 'debit', 400.00, '2025-03-03T14:20:00Z'),
  (9005, 'ACC-200', 'debit', 2100.00, '2025-03-03T16:45:00Z');

INSERT INTO prescriptions (id, ndc_code, patient_id, drug_name, days_supply, filled_at) VALUES
  (1, '00093-3147-05', 'PT-401', 'Amoxicillin 500mg', 10, '2025-02-20'),
  (2, '00378-1805-10', 'PT-402', 'Levothyroxine 50mcg', 30, '2025-02-21'),
  (3, '00071-0155-23', 'PT-401', 'Atorvastatin 20mg', 90, '2025-02-22');
`;

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1] || '';

    if (inLineComment) {
      current += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      current += ch;
      if (ch === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        current += ch;
        continue;
      }
      if (ch === '/' && next === '*') {
        inBlockComment = true;
        current += ch;
        continue;
      }
      if (ch === ';') {
        const trimmed = current.trim();
        if (trimmed) statements.push(trimmed);
        current = '';
        continue;
      }
    }

    if (ch === "'" && !inDouble) {
      if (inSingle && next === "'") {
        current += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function runSqlInSandbox(query: string, customSetup?: string): SqlExecutionResult {
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executedStatements: 0,
      error: 'Please enter a SQL query to run.'
    };
  }

  // Block disk/extension attachment commands for strict in-memory isolation
  const upper = trimmedQuery.toUpperCase();
  if (/\b(ATTACH|DETACH)\b/.test(upper)) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executedStatements: 0,
      error: 'ATTACH/DETACH statements are disabled in the in-memory SQL sandbox.'
    };
  }

  let memDb: DatabaseSync | null = null;
  try {
    memDb = new DatabaseSync(':memory:');
    memDb.exec('PRAGMA foreign_keys = ON;');

    const setupSql = customSetup && customSetup.trim() ? customSetup : DEFAULT_SQL_SETUP;
    memDb.exec(setupSql);

    const statements = splitStatements(trimmedQuery);
    if (statements.length === 0) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executedStatements: 0,
        error: 'No executable SQL statements found.'
      };
    }

    let lastRows: Record<string, any>[] = [];
    let columns: string[] = [];

    for (const stmtSql of statements) {
      const stmt = memDb.prepare(stmtSql);
      const isReader = /^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(stmtSql);
      if (isReader) {
        const rawRows = stmt.all() as Record<string, any>[];
        lastRows = rawRows.slice(0, 100);
        if (lastRows.length > 0) {
          columns = Object.keys(lastRows[0]);
        } else {
          const colsInfo = typeof (stmt as any).columns === 'function' ? (stmt as any).columns() : [];
          columns = Array.isArray(colsInfo) ? colsInfo.map((c: any) => c.name || String(c)) : [];
        }
      } else {
        stmt.run();
        lastRows = [];
        columns = [];
      }
    }

    return {
      columns,
      rows: lastRows,
      rowCount: lastRows.length,
      executedStatements: statements.length
    };
  } catch (err: any) {
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executedStatements: 0,
      error: err?.message || 'SQL execution error.'
    };
  } finally {
    try {
      memDb?.close();
    } catch {
      // ignore close errors
    }
  }
}
