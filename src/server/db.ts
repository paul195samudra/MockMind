import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { Question, Submission, User, Feedback, ActivityLog, UserRole } from '../types';

const LEGACY_DB_FILE = path.join(process.cwd(), 'db.json');
const SQLITE_DB_FILE = path.join(process.cwd(), 'mockmind.db');

const DEFAULT_ADMIN_EMAILS = [
  'paul15-6093@diu.edu.bd',
  'paul15-60932@diu.edu.bd',
  'paul15-60932diu.edu.bd',
  'paul15-6093diu.edu.bd'
];

// Interface for hashed/persisted user objects
export interface UserRecord extends User {
  role: UserRole;
  passwordHash: string;
}

// Initial default questions to seed our database
const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'react-localstorage',
    title: 'Implement Custom useLocalStorage Hook',
    category: 'Data Structures',
    type: 'coding',
    difficulty: 'Easy',
    description: `Implement a React hook called \`useLocalStorage\` that allows components to persist state in \`localStorage\`.

The hook should accept a \`key\` (string) and an \`initialValue\` (any). It must return a state variable and a setter function, similar to standard \`useState\`.

### Requirements:
1. Load state from \`localStorage\` on initialization. If the key is not found, default to \`initialValue\`.
2. Handle state updates and write the new value to \`localStorage\`.
3. Support functional updates: e.g., \`setValue(prev => prev + 1)\`.
4. Wrap operations in \`try/catch\` block to handle errors gracefully (like locked storage in private windows).`,
    initialCode: `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Your code here
  
}
`,
    solutionTemplate: `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}`,
    expectedOutcomes: [
      'Initialize state from localStorage item or initialValue.',
      'Check for function types in setValue to support functional state modifications.',
      'Save items using JSON.stringify.',
      'Gracefully handle locked files or browser storage exceptions in a try-catch block.'
    ],
    keywords: ['localStorage', 'useState', 'JSON.parse', 'JSON.stringify', 'functional update', 'try-catch']
  },
  {
    id: 'system-design-tinyurl',
    title: 'Design a URL Shortener Service (TinyURL)',
    category: 'System Design',
    type: 'conceptual',
    difficulty: 'Medium',
    description: `Design a high-scale URL shortener service like TinyURL.

Your answer should mock a standard System Design Interview response. Structure your answer to address:
1. **Requirements Clarification**: Functional (shortening, redirection, custom links, expiration) vs. Non-functional (highly available, low latency redirection, write scaling).
2. **Back-of-the-envelope estimation**: Estimate Read/Write QPS and database storage needed over 5 years.
3. **API Definition**: Create clean RESTful endpoints.
4. **Database Schema Choice**: Relational vs. NoSQL, and index requirements.
5. **Key Generation Service (KGS)**: Explain collision prevention, hashing algorithm (Base62 vs. MD5), and pre-generating keys.
6. **Caching & Load Balancing**: Optimize lookups for viral URLs.`,
    solutionTemplate: `A comprehensive solution covers:
- Hashing URLs vs Key Generation Service (highly parallelizable lock-free key-serving to avoid DB write serialization).
- Core APIs: POST /api/v1/shorten (takes longUrl, returns shortUrl), GET /{shortCode} (performs 302/301 redirection).
- Storage DB schema tracking {short_code (PK), original_url, created_at, expiration}.
- Using Redis or Memcached to cache hot keys.
- Base62 encoding for length-7 short codes (62^7 = 3.5 Trillion unique codes).`,
    expectedOutcomes: [
      'Detail Base62 or hashing collision resolution.',
      'Provide concrete QPS or storage volume estimations.',
      'Suggest key separation techniques like KGS (Key Generation Service).',
      'Explain caching hot entries with TTL (Redis/Memcached).'
    ],
    keywords: ['Base62', 'KGS', 'collision', 'QPS', '302 redirection', 'NoSQL', 'Redis cache']
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses Checker',
    category: 'Algorithms',
    type: 'coding',
    difficulty: 'Easy',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example:
* Input: \`s = "()[]{}"\` -> Output: \`true\`
* Input: \`s = "(]"\` -> Output: \`false\`
* Input: \`s = "([])"\` -> Output: \`true\``,
    initialCode: `function isValidParentheses(s: string): boolean {
  // Your code here
  
}
`,
    solutionTemplate: `function isValidParentheses(s: string): boolean {
  const stack: string[] = [];
  const map: { [key: string]: string } = {
    ')': '(',
    '}': '{',
    ']': '['
  };
  
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (char === '(' || char === '{' || char === '[') {
      stack.push(char);
    } else if (char === ')' || char === '}' || char === ']') {
      if (stack.length === 0 || stack.pop() !== map[char]) {
        return false;
      }
    }
  }
  
  return stack.length === 0;
}`,
    expectedOutcomes: [
      'Use a stack data structure to track brackets.',
      'Map opening and closing pairs correctly.',
      'Check string lengths and empty cases elegantly.',
      'Return false if stack is non-empty at the end of evaluation.'
    ],
    keywords: ['stack', 'push', 'pop', 'matching pairs', 'empty stack', 'O(N) time complexity']
  },
  {
    id: 'database-sql-nosql',
    title: 'SQL vs NoSQL Database Tradeoffs',
    category: 'Databases',
    type: 'conceptual',
    difficulty: 'Medium',
    description: `Explain the fundamental differences, strengths, and standard use-cases of relational (SQL) versus non-relational (NoSQL) databases.

### Key Points to Cover:
1. **Data Model**: Schemas (rigid/structured vs flexible/schemaless), data formats (tables vs key-value, document, column-family, graph).
2. **Scaling**: Horizontal scaling vs vertical scaling.
3. **Transaction Guarantees**: ACID characteristics in SQL databases vs BASE (Basically Available, Soft State, Eventual Consistency) model in NoSQL.
4. **Joins & Relations**: How relationships are resolved (JOIN queries vs nested/denormalized collections).`,
    solutionTemplate: `A comprehensive answer outlines:
1. SQL uses structured schemas, supporting SQL joins, foreign key constraints, and 100% ACID compliance (essential for payroll, ledgers). Vertical scaling is typical.
2. NoSQL is schemaless (document, key-value, column-oriented), easily partitioning keys across clusters to support massive horizontal scaling.
3. CAP Theorem explains eventual consistency sacrifices in NoSQL.`,
    expectedOutcomes: [
      'Clearly compare vertical (SQL) and horizontal (NoSQL) scaling mechanisms.',
      'Explain ACID vs BASE transaction profiles.',
      'Specify valid domain use-cases for both types (e.g., Financial ledger for SQL, User session for NoSQL).'
    ],
    keywords: ['ACID', 'BASE', 'Horizontal scaling', 'Vertical scaling', 'CAP theorem', 'denormalization', 'joins']
  },
  {
    id: 'js-debounce',
    title: 'Implement Debounce Function with Immediate Flag',
    category: 'Algorithms',
    type: 'coding',
    difficulty: 'Medium',
    description: `Implement a classic \`debounce\` utility function.

Debouncing ensures that a function is not called again until a specified amount of idle time has passed since its last call. 

### Requirements:
1. The return value should be a function that schedules execution of the target function \`fn\` after \`delay\` milliseconds.
2. If the debounced function is invoked repeatedly, reset the timer on each invocation.
3. Support an optional \`immediate\` boolean parameter. If \`immediate\` is \`true\`, invoke the function immediately on the leading edge instead of the trailing edge of the timeout. Subsequent rapid calls should be throttled until the delay window expires.
4. Correctly preserve the \`this\` context and arguments of the function invocation.`,
    initialCode: `export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number, 
  immediate = false
): (...args: Parameters<T>) => void {
  // Your code here
  
}
`,
    solutionTemplate: `export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number, 
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        fn.apply(context, args);
      }
    }, delay);
    
    if (callNow) {
      fn.apply(context, args);
    }
  };
}`,
    expectedOutcomes: [
      'Maintain timeout state using closure variables.',
      'Clear timeout using clearTimeout on each call.',
      'Support immediate parameter with immediate execution and cooling window.',
      'Preserve the correct context (this) and arguments list.'
    ],
    keywords: ['clearTimeout', 'setTimeout', 'context', 'apply', 'closure', 'immediate', 'leading edge']
  },
  {
    id: 'behavioral-conflict',
    title: 'Resolving Technical Disagreements',
    category: 'Behavioral',
    type: 'conceptual',
    difficulty: 'Medium',
    description: `Describe a situation where you had a significant disagreement with a colleague or stakeholder regarding a technical design, architecture, or coding practice. 

How did you navigate the conversation?

### Requirements:
1. Explain the context, the two opposing viewpoints, and the technical arguments for each.
2. Outline the steps you took to build consensus or resolve the conflict constructively.
3. Detail the final outcome and what you learned from the situation.
4. Structure your response clearly (using the STAR method if possible).`,
    solutionTemplate: `An excellent STAR answer should focus on:
- Situation: The specific product requirement or system component.
- Task: Defining the disagreement (e.g. monolithic design vs. microservices, SQL vs MongoDB).
- Action: Evaluating trade-offs through an objective spike, joint exploration, or benchmark rather than emotional argument.
- Result: Consensual agreement, metrics achieved, and a healthy team relationship.`,
    expectedOutcomes: [
      'Structure using the STAR strategy (Situation, Task, Action, Result).',
      'Demonstrate constructive, ego-free collaboration and compromise.',
      'Acknowledge objective technical trade-offs.',
      'Reflect on key takeaways or relationship building.'
    ],
    keywords: ['consensus', 'compromise', 'collaboration', 'trade-offs', 'STAR framework', 'objective metrics']
  },
  {
    id: 'healthcare-hipaa',
    title: 'HIPAA Auditable Patient Data Pipeline',
    category: 'Pharmacy & Healthcare',
    type: 'conceptual',
    difficulty: 'Hard',
    description: `Design a data intake pipeline for a Pharmacy & Patient Management system that complies with US HIPAA regulations.

Your architect solution must state how you handle Electronic Protected Health Information (ePHI). Specifically, explain:
1. **Access Controls & Identity**: How to implement Role-Based Access Control (RBAC) so only authorized pharmacists, doctors, and system administrators can view specific patient records.
2. **Encryption & Security**: How to secure data at rest (e.g., envelope encryption) and in-transit (e.g., TLS 1.3, HTTPS).
3. **Audit Logging & Tamper-Prevention**: How to record all read, update, and deletion of patient data in an unalterable, cryptographically signed audit log.
4. **De-identification & Masking**: How to mask or remove HIPAA Safe Harbor identifiers (like SSN, detailed names, birth dates) when piping telemetry data to third-party healthcare analytics platforms.`,
    solutionTemplate: `An outstanding HIPAA design architecture outlines:
- Enforcing Row-Level Security (RLS) and strict IAM roles based on active care relationships with patients.
- Using AES-256 with key rotation through KMS to secure personal patient fields (Envelope encryption).
- Sending access/modification logs into a stream structured like AWS CloudTrail, stored in WORM (Write Once Read Many) buckets or backed by signed blockchain blocks.
- Applying k-anonymity or standard differential privacy algorithms on analytic pipeline endpoints.`,
    expectedOutcomes: [
      'Detail secure storage using Envelope Encryption or AES-256 with key rotation.',
      'Explain immutable tamper-proof audit trails for ePHI read/write events.',
      'Describe safe harbor identifiers de-identification methodologies.',
      'Outline Role-Based Access Control (RBAC) and Row-Level Security (RLS) enforcement.'
    ],
    keywords: ['HIPAA', 'ePHI', 'RBAC', 'audit log', 'envelope encryption', 'de-identification', 'WORM storage']
  },
  {
    id: 'it-rate-limiter',
    title: 'Token Bucket Rate Limiter Implementation',
    category: 'Information & Technology',
    type: 'coding',
    difficulty: 'Medium',
    description: `Implement an optimized dynamic \`TokenBucket\` class to manage API rate-limiting in an Information Technology system gateway.

A Token Bucket rate limiter contains a set capacity of tokens. Tokens replenish at a constant fill rate. Every incoming request consumes exactly one token. If the bucket is empty, the request is rejected immediately.

### Requirements:
1. The class should be initialized with:
   - \`capacity\`: Maximum number of tokens the bucket can hold.
   - \`refillRate\`: Number of tokens added to the bucket per second.
2. Implement an asynchronous method \`allowRequest(timestamp: number): boolean\` that checks if a request is permitted at the given millisecond timestamp, updates the token count lazily (without background timer threads), and returns \`true\` if allowed, else \`false\`.`,
    initialCode: `export class TokenBucket {
  private capacity: number;
  private refillRate: number; // tokens per second
  private lastRefillTimestamp: number;
  private tokens: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  public allowRequest(timestamp: number = Date.now()): boolean {
    // Your code here
    return false;
  }
}
`,
    solutionTemplate: `export class TokenBucket {
  private capacity: number;
  private refillRate: number; // tokens per second
  private lastRefillTimestamp: number;
  private tokens: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  public allowRequest(timestamp: number = Date.now()): boolean {
    // Lazy replenish
    const elapsedSeconds = Math.max(0, (timestamp - this.lastRefillTimestamp) / 1000);
    const tokensToAdd = elapsedSeconds * this.refillRate;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefillTimestamp = timestamp;
    }

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }
}`,
    expectedOutcomes: [
      'Calculate tokens lazily based on elapsed duration in seconds or milliseconds.',
      'Clamp the maximum calculated tokens to not exceed the specified bucket capacity.',
      'Subtract one token appropriately when request is allowed, returning true.',
      'Correctly handle non-monotonic clocks or concurrent triggers safely.'
    ],
    keywords: ['Token Bucket', 'rate limiter', 'lazy evaluation', 'refill rate', 'capacity', 'timestamp translation']
  },
  {
    id: 'finance-double-entry',
    title: 'Idempotent Double-Entry Transfer System',
    category: 'Banking & Finance',
    type: 'conceptual',
    difficulty: 'Hard',
    description: `Design a highly resilient consensus transfer mechanism for a digital banking system to direct transfers between two internal deposit accounts.

Detail your solutions to resolve the following real-world banking issues:
1. **Double-Spend & Race Hazards**: How to safely handle two rapid concurrent transfers from Account A (balance $100) to Account B ($50) and Account C ($60) without causing negative overdrafts or inconsistent databases.
2. **Idempotency**: How to ensure a network timeout retry does not charge/transfer money twice if the initial request completed but the packet was dropped on return.
3. **Double-Entry Principle**: Explain how you enforce the core accounting equation (Assets = Liabilities + Equity) using credit/debit records so money is never created or destroyed.
4. **Consistency across Microservices**: How you handle transactions if Account A is in a different database shard or service from Account B (e.g., Sagas, Outbox pattern, or 2PCS/Dual-phase commits).`,
    solutionTemplate: `A production-ready financial ledger design details:
- Using Database Transactions with pessimistic locking (SELECT FOR UPDATE) on the ordered lower ledger IDs first to avoid deadlocks.
- Storing an idempotency key (UUID) on all ledger transactions, checked in a unique constraint table.
- Every ledger transaction must compose balancing Debits and Credits within a single atomic database statement.
- Distributing sharding sync via the Saga Pattern (orchestrator vs choreography) or temporal workflow engines with compensating actions if step two fails.`,
    expectedOutcomes: [
      'Use lock sequencing (alphabetical or ID order) to prevent deadlocks under race conditions.',
      'Explain idempotency checkpoints using a unique constraint database table for idempotency keys.',
      'Define transfer records using balanced debits and credits on account ledgers instead of a simple update statement.',
      'Incorporate Saga workflows or Two-Phase Commit to coordinate across transaction shards.'
    ],
    keywords: ['double-entry', 'idempotency key', 'SELECT FOR UPDATE', 'deadlock prevention', 'ledger auditing', 'Saga pattern']
  },
  {
    id: 'healthcare-ehr-basics',
    title: 'EHR Access Role-Mapping & Audit Logs',
    category: 'Pharmacy & Healthcare',
    type: 'conceptual',
    difficulty: 'Easy',
    description: `Outline the core architectural design for securing Electronic Health Records (EHR) within a clinical environment. Explain who should have read/write access to specialized patient health charts, how you would prevent unauthorized access, and how to verify that your medical personnel conform to strict regulatory security protocols using access logging.`,
    solutionTemplate: `An outstanding entry-level EHR safety summary should include:
- Establishing Role-Based Access Control (RBAC) separating Physicians (read/write), Pharmacists (read prescribed, update fill status), and Admins (billing metadata only).
- Ensuring every query or credential check logs to an immutable access ledger with strict metadata (operator, timestamp, resource ID, action).
- Enforcing automatic session timeout limits to prevent visual exposure of confidential screens in high-traffic wards.`,
    expectedOutcomes: [
      'Mention Role-Based Access Control (RBAC) with specific segregation of clinical roles.',
      'Explain implementing automated, immutable logs for every patient record read action.',
      'Identify critical safety protocols, such as session expirations on shared terminals.'
    ],
    keywords: ['EHR', 'RBAC', 'audit log', 'clinical access controls', 'credential checking']
  },
  {
    id: 'healthcare-validate-ndc',
    title: 'Validate National Drug Code Formats',
    category: 'Pharmacy & Healthcare',
    type: 'coding',
    difficulty: 'Easy',
    description: `Implement a function \`validateNDC(ndcCode: string): boolean\` to determine if a given National Drug Code string complies with standard FDA formats.
    
An FDA National Drug Code (NDC) is a unique 10-digit or 11-digit, 3-segment number. It must follow one of these hyphenated formats:
- 4-4-2 format: e.g. "1234-5678-90" (4 digits, hyphen, 4 digits, hyphen, 2 digits)
- 5-3-2 format: e.g. "12345-678-90"
- 5-4-1 format: e.g. "12345-6789-0"
- 5-4-2 format (11-digit standard): e.g. "12345-6789-01"

Your function must return \`true\` if the code perfectly matches any of the above formats (all characters besides hyphens must be numeric digits), else return \`false\`.`,
    initialCode: `export function validateNDC(ndcCode: string): boolean {
  // Your code here
  return false;
}`,
    solutionTemplate: `export function validateNDC(ndcCode: string): boolean {
  const pattern = /^(?:\\d{4}-\\d{4}-\\d{2}|\\d{5}-\\d{3}-\\d{2}|\\d{5}-\\d{4}-\\d{1}|\\d{5}-\\d{4}-\\d{2})$/;
  return pattern.test(ndcCode);
}`,
    expectedOutcomes: [
      'Utilize a regular expression or segment indexing to parse segments.',
      'Verify segment lengths match standard FDA permutations (4-4-2, 5-3-2, 5-4-1, 5-4-2).',
      'Ensure no alphabetic or special characters other than valid hyphens are accepted.'
    ],
    keywords: ['NDC', 'regular expression', 'FDA layout validation', 'hyphen segments', 'validateNDC']
  },
  {
    id: 'healthcare-pill-intervals',
    title: 'Daily Medication Schedule Generator',
    category: 'Pharmacy & Healthcare',
    type: 'coding',
    difficulty: 'Medium',
    description: `Design a scheduler to generate precise daily administration times for a pharmacy prescription dispensing platform.

Implement a function \`generatePillSchedule(startTimeISO: string, intervalHours: number, totalDoses: number): string[]\` that produces an array of consecutive medication intake times as ISO strings.

### Rules of Administration:
1. First dose must be taken exactly at \`startTimeISO\`.
2. Each subsequent dose must adjust precisely by \`intervalHours\`.
3. To protect the patient's sleep quality, no dose should be scheduled between **11:00 PM (23:00)** and **06:00 AM** in the patient's local timezone.
4. If a dose falls into this sleep gap, it must be automatically shifted forward to exactly **06:00 AM** the following morning, and subsequent doses will calculate from that new adjusted baseline.

Use continuous timing loops or recursions to build standard timezone neutral dates.`,
    initialCode: `export function generatePillSchedule(startTimeISO: string, intervalHours: number, totalDoses: number): string[] {
  // Your code here
  return [];
}`,
    solutionTemplate: `export function generatePillSchedule(startTimeISO: string, intervalHours: number, totalDoses: number): string[] {
  const result: string[] = [];
  if (totalDoses <= 0) return result;
  
  let current = new Date(startTimeISO);
  
  for (let i = 0; i < totalDoses; i++) {
    // Check if current hours are in sleep zone (23:00 to 06:00)
    let hours = current.getHours();
    
    // Check if it falls inside [23:00, 06:00)
    if (hours >= 23 || hours < 6) {
      if (hours >= 23) {
        current.setDate(current.getDate() + 1);
      }
      current.setHours(6, 0, 0, 0);
    }
    
    result.push(current.toISOString());
    // Prep next dose
    current = new Date(current.getTime() + intervalHours * 60 * 60 * 1000);
  }
  return result;
}`,
    expectedOutcomes: [
      'Register medication starting dose at the exact specified starting timestamp.',
      'Iterate and compute offsets in increments of specified interval hours.',
      'Verify hour checks for the sleep window from 11:00 PM (23:00) to 6:00 AM.',
      'Postpone overlapping medication schedules to the next closest safe baseline morning (06:00).'
    ],
    keywords: ['medication scheduler', 'sleep window postponement', 'time-series loops', 'generatePillSchedule', 'date shifts']
  },
  {
    id: 'healthcare-vaccine-coldchain',
    title: 'Cold Chain Vaccine Temperature IoT Architecture',
    category: 'Pharmacy & Healthcare',
    type: 'conceptual',
    difficulty: 'Medium',
    description: `Explain the system design of an IoT cold-chain telemetry logging network for distributed mRNA vaccines. 
    
Vaccines require constant ultra-low temperatures (between -90°C and -60°C). Any detour above this temperature range renders the entire batch inactive. Address how you would handle:
1. **Real-time Telemetry Processing**: How IoT sensor beacons on mobile inventory refrigerators can send frequent temp heartbeats.
2. **Disconnected Operations**: How you handle transient dead zones where shipping trucks lose network signal.
3. **Smart Alerting Grid**: How to notify distribution staff immediately using sliding event evaluation windows when a violation occurs.`,
    solutionTemplate: `An outstanding Cold Chain architecture must specify:
- IoT gateways gathering temperature metrics with client-side buffer flash storage (SQLite/Local logs) to safely persist records during network dropouts, resending buffered backlogs once connection reconnects.
- Continuous streaming ingestion via Apache Kafka or AWS Kinesis to track telemetry heartbeats.
- Sliding window timers in Flink/Spark Streaming to track cumulative temperature exposure thresholds (e.g., an alarm fires if temps exceed -60°C for over 5 consecutive minutes).`,
    expectedOutcomes: [
      'Detail buffer strategy or offline storage on IoT device units during cellular network blackouts.',
      'Utilize continuous event stream ingestion technologies like Kafka, MQTT, or Kinesis.',
      'Explain threshold triggers and alert mechanisms using time-window analysis.'
    ],
    keywords: ['cold chain', 'telemetry system', 'local buffers', 'IoT heartbeats', 'sensor threshold alerts', 'temperature deviation']
  },
  {
    id: 'healthcare-contraindication-check',
    title: 'Drug-Drug Conflict Detection Engine',
    category: 'Pharmacy & Healthcare',
    type: 'coding',
    difficulty: 'Hard',
    description: `Implement a lightning-fast clinical safety algorithm to find potential medication conflict groups.
    
A pharmacy application wants to cross-examine incoming doctor orders for active patients against a known master list of dangerous drug combinations (contraindications).

Implement a function \`findContraindications(activeDrugs: string[], rules: [string, string][]): string[][]\` that scans a list of active medications and identifies all conflicting matches.

### Rules:
1. A rule is a tuple element \`[DrugA, DrugB]\`. If both \`DrugA\` and \`DrugB\` are inside the \`activeDrugs\` list, they trigger a conflict pair.
2. The output must be returned as a list of sorted drug pairs, where each pair is sorted alphabetically: e.g., \`[["DrugA", "DrugB"]]\`.
3. The overall outer list of conflict pairs must also be sorted alphabetically by the first item, then the second item. Avoid returning duplicate conflict reports.`,
    initialCode: `export function findContraindications(activeDrugs: string[], rules: [string, string][]): string[][] {
  // Your code here
  return [];
}`,
    solutionTemplate: `export function findContraindications(activeDrugs: string[], rules: [string, string][]): string[][] {
  const drugSet = new Set(activeDrugs);
  const foundConflicts: string[][] = [];
  const seenPairs = new Set<string>();

  for (const [r1, r2] of rules) {
    if (drugSet.has(r1) && drugSet.has(r2)) {
      const sortedPair = [r1, r2].sort();
      const pairKey = sortedPair.join('::');
      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);
        foundConflicts.push(sortedPair);
      }
    }
  }

  // Sort outer list alphabetically
  return foundConflicts.sort((a, b) => {
    if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
    return a[1].localeCompare(b[1]);
  });
}`,
    expectedOutcomes: [
      'Convert active drugs list into a Hash Set to perform constant time O(1) membership evaluations.',
      'Recognize triggering contraindications where both drugs in a rule are active.',
      'Sort drug parameters within individual results alphabetically.',
      'Ensure the final returned array has no duplicate conflicts and is ordered alphabetically.'
    ],
    keywords: ['drug conflict evaluation', 'contraindications', 'Hash Set tracking', 'deduplication', 'alphabetical sorting']
  },
  {
    id: 'it-bytes-formatter',
    title: 'Raw Bytes Human-Readable Converter',
    category: 'Information & Technology',
    type: 'coding',
    difficulty: 'Easy',
    description: `Implement an operations utility \`formatBytes(bytes: number, decimals?: number): string\` that formats raw computer memory storage values into their readable equivalent string (Bytes, KB, MB, GB, TB, PB).

### Rules:
1. Zero bytes should return exactly \`"0 Bytes"\`.
2. Decimals defaults to \`2\` if not explicitly declared in arguments.
3. The formula evaluates using power indices of base 1024 (1 KB = 1024 Bytes, 1 MB = 1024^2, etc.).
4. The output must contain the calculated space rate float followed by a space and the appropriate size suffix (e.g., \`formatBytes(75390, 1)\` should return \`"73.6 KB"\`).`,
    initialCode: `export function formatBytes(bytes: number, decimals: number = 2): string {
  // Your code here
  return "";
}`,
    solutionTemplate: `export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const calc = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));
  return calc + ' ' + sizes[i];
}`,
    expectedOutcomes: [
      'Perform calculation using logarithmic powers of scale base 1024.',
      'Handle zero edge-cases cleanly by returning exactly "0 Bytes".',
      'Format output float precision according to decimals argument limit.',
      'Map correctly to memory scale labels (Bytes, KB, MB, GB, etc.).'
    ],
    keywords: ['formatBytes', 'base 1024 translation', 'logarithm operations', 'file capacity conversion']
  },
  {
    id: 'it-cloud-models',
    title: 'SaaS, PaaS, IaaS & Serverless Responsibilities',
    category: 'Information & Technology',
    type: 'conceptual',
    difficulty: 'Easy',
    description: `You are an operations lead at an IT software firm during an architecture review.
Explain the core functional separations and security responsibility boundaries between:
1. **Infrastructure as a Service (IaaS)**
2. **Platform as a Service (PaaS)**
3. **Software as a Service (SaaS)**
4. **Function as a Service (FaaS) / Serverless**

Detail specifically who (the cloud provider vs the customer) handles patching the OS kernel, database clustering, application code compliance, and networking protection.`,
    solutionTemplate: `An outstanding description must specify:
- IaaS: Vendor provides physical infrastructure & virtualization. Customer is fully responsible for OS updates, network firewall setups, runtime frameworks, and code safety.
- PaaS: Vendor handles OS updates, database engines, and basic scalability. Customer operates application code configuration and access models.
- SaaS: Vendor handles everything from physical servers up to user-interface access. Customer configures individual account settings.
- Serverless (FaaS): Vendor abstracts container setups and idle servers dynamically. Customer simply uploads stateless trigger functions.`,
    expectedOutcomes: [
      'Segregate Cloud deployment categories (IaaS, PaaS, SaaS, and FaaS/Serverless).',
      'Identify distinct layers of responsibility (OS, Networking, Virtualization, and Code).',
      'Detail the provider versus consumer obligations across models.'
    ],
    keywords: ['IaaS', 'PaaS', 'SaaS', 'Serverless', 'shared responsibility model', 'security boundaries']
  },
  {
    id: 'it-deployment-options',
    title: 'Blue-Green vs Canary vs Rolling Deployments',
    category: 'Information & Technology',
    type: 'conceptual',
    difficulty: 'Medium',
    description: `As a cloud devops architect, compare Blue-Green, Canary, and Rolling software deployment strategies.
    
Detail:
1. **Rollback Performance**: How fast can you undo a bug when one is active in a deployment wave?
2. **Infrastructure Cost**: How do host allocation demands compare between keeping duplicate stacks online?
3. **Database Migration Sync**: How do you avoid corrupted columns or duplicate inserts if old and new versions of code connect to the same SQL database at the same time?`,
    solutionTemplate: `A comprehensive answer outlines:
- Blue-Green: Keeps two identical hardware setups ("Blue" running current, "Green" running new). Rollback is nearly instant by shifting CDN DNS/load balancer routing back. Double standard cloud resource cost metrics.
- Canary: Deploys the code update to a tiny percentage of active machines (e.g., 5% traffic). Rollback involves killing canary hosts. Low extra cost profile.
- Rolling: Sequentially terminates current node clusters and creates new ones. Low cost overhead but rollbacks are slow because of step-by-step image rebuilds task bounds.
- Database Schema Management: Apply backwards-compatible adjustments (Expand/Contract model). Never drop old schema columns until all previous containers are safely updated.`,
    expectedOutcomes: [
      'Define differences between Blue-Green, Canary, and Rolling deployment types.',
      'Assess financial and computing overhead comparisons.',
      'Evaluate rollback recovery speeds and fallback parameters.',
      'Incorporate blue-green database compatibility practices (e.g. backwards-compatible migrations).'
    ],
    keywords: ['Blue-Green', 'Canary release', 'Rolling update', 'rollback rate', 'expand-contract database', 'zero downtime']
  },
  {
    id: 'it-lru-ttl',
    title: 'LRU Cache with TTL Expiry',
    category: 'Information & Technology',
    type: 'coding',
    difficulty: 'Hard',
    description: `Write a high-performance Least Recently Used (LRU) cache class that also enforces individual Time-to-Live (TTL) timestamps on stored keys.

The cache class \`LRUTTLCache\` must support three primary methods:
1. \`constructor(capacity: number)\`: Initializes a cache with maximum element count.
2. \`get(key: string, timestamp: number): number\`: Retrieves value for key if it exists, is not expired, and updates LRU priority list. Returns \`-1\` if key is missing or expired.
3. \`put(key: string, value: number, ttl: number, timestamp: number): void\`: Inserts a key-value pair with a specific millisecond survival duration (\`ttl\`). If capacity is exceeded, evict the least recently used valid element first. If all elements are expired, invalidate the oldest expired entry.

Ensure your code is optimized and manages stale values correctly.`,
    initialCode: `export class LRUTTLCache {
  constructor(capacity: number) {
    // Your code here
  }

  get(key: string, timestamp: number): number {
    // Your code here
    return -1;
  }

  put(key: string, value: number, ttl: number, timestamp: number): void {
    // Your code here
  }
}`,
    solutionTemplate: `export class LRUTTLCache {
  private capacity: number;
  private cache = new Map<string, { value: number; expireAt: number; lastUsed: number }>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string, timestamp: number): number {
    const item = this.cache.get(key);
    if (!item) return -1;
    
    if (timestamp >= item.expireAt) {
      this.cache.delete(key);
      return -1;
    }
    
    // Update LRU access metrics
    item.lastUsed = timestamp;
    return item.value;
  }

  put(key: string, value: number, ttl: number, timestamp: number): void {
    // Clean up expired items first to free space safely
    for (const [k, item] of this.cache.entries()) {
      if (timestamp >= item.expireAt) {
        this.cache.delete(k);
      }
    }

    if (this.cache.has(key)) {
      this.cache.set(key, { value, expireAt: timestamp + ttl, lastUsed: timestamp });
      return;
    }

    if (this.cache.size >= this.capacity) {
      // Find LRU element based on lastUsed
      let lruKey: string | null = null;
      let oldestUsedTime = Infinity;
      
      for (const [k, item] of this.cache.entries()) {
        if (item.lastUsed < oldestUsedTime) {
          oldestUsedTime = item.lastUsed;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, { value, expireAt: timestamp + ttl, lastUsed: timestamp });
  }
}`,
    expectedOutcomes: [
      'Validate time-to-live expirations accurately against incoming timestamp comparisons.',
      'Correctly update eviction structures with LRU priorities during lookups.',
      'Deduct expired entities cleanly from the stored Map layout.',
      'Handle capacity constraints perfectly using lowest-used checks on item structures.'
    ],
    keywords: ['LRUTTLCache', 'LRU eviction', 'stale key clean-up', 'TTL expiration checking', 'Map operations']
  },
  {
    id: 'it-service-mesh',
    title: 'Service Mesh Deployment and mTLS',
    category: 'Information & Technology',
    type: 'conceptual',
    difficulty: 'Hard',
    description: `Explain the architectural design and operations trade-offs of deploying a Service Mesh (like Istio/Linkerd with Envoy sidecars) across a microservice application landscape.
    
Analyze:
1. **Sidecar Proxying Pattern**: How sidecar containers intercept incoming/outgoing system traffic.
2. **Mutual TLS (mTLS)**: How peer identity is validated dynamically between microservices.
3. **Latency & CPU Overhead**: The trade-offs of doing three network hops for a single logical microservice request.
4. **Alternative Architectures**: How this compares to using application-level gateway SDK libraries instead.`,
    solutionTemplate: `An outstanding Service Mesh analysis highlights:
- Sidecar Pattern: Sidecar containers like Envoy are injected next to app containers, redirecting firewall IPTables rule mappings to process all protocol requests.
- mTLS: Sidecars request certificate bundles from a local authority (Citadel/SPIFFE), completing bilateral TLS handshakes before decoding HTTP parameters.
- Infrastructure Costing: Added networking buffer delays, plus a major memory/CPU cost footprint due to running hundreds of localized proxy daemons on the cluster virtual nodes.`,
    expectedOutcomes: [
      'Detail mTLS cryptography handshakes using SPIFFE/SPIRE dynamic container identities.',
      'Explain IPTables redirection intercept configurations within the sidecar container.',
      'Contrast CPU/Memory cost overhead metrics of decentralized proxies vs API gateways.'
    ],
    keywords: ['Service Mesh', 'mTLS', 'Envoy proxy', 'sidecar injection', 'network multiplexing', 'SPIFFE identification']
  },
  {
    id: 'finance-interest-calc',
    title: 'Dynamic Compound Interest Calculator',
    category: 'Banking & Finance',
    type: 'coding',
    difficulty: 'Easy',
    description: `Implement an interest calculator function \`calculateAPYValues(principal: number, annualRate: number, compoundingPeriods: number, years: number): number\` to evaluate continuous growth equations.
    
### Equation:
\`A = P * (1 + r / n) ^ (n * t)\`

Where:
- \`P\` = principal balance (opening deposit value)
- \`r\` = annual nominal interest rate as a float (e.g. 5% value parameter is entered as \`0.05\`)
- \`n\` = compounding periods per year (e.g., monthly compound implies \`12\`, quarterly implies \`4\`)
- \`t\` = period count mapped in years

Round the final floating point output precisely to two fractional places (representing standard cent denominations).`,
    initialCode: `export function calculateAPYValues(principal: number, annualRate: number, compoundingPeriods: number, years: number): number {
  // Your code here
  return 0;
}`,
    solutionTemplate: `export function calculateAPYValues(principal: number, annualRate: number, compoundingPeriods: number, years: number): number {
  if (principal < 0 || annualRate < 0 || compoundingPeriods <= 0 || years < 0) return 0;
  const growth = Math.pow(1 + annualRate / compoundingPeriods, compoundingPeriods * years);
  const total = principal * growth;
  return Math.round(total * 100) / 100;
}`,
    expectedOutcomes: [
      'Incorporate exponent calculations mapped to standard economic compound frequency formula.',
      'Properly map compound fractions like rate divided by period parameter.',
      'Format output float parameters precisely to two decimal rounding points.'
    ],
    keywords: ['APY calculation', 'compound interest', 'Math.pow growth', 'currency rounding mechanics']
  },
  {
    id: 'finance-kyc-aml',
    title: 'KYC & BSA Compliance Onboarding Design',
    category: 'Banking & Finance',
    type: 'conceptual',
    difficulty: 'Easy',
    description: `Explain the fundamental steps of designing a regulatory-compliant digital Know Your Customer (KYC) identity checking system for a retail banking platform in compliance with the Bank Secrecy Act (BSA) rules.
    
Your design description must detail:
1. **User Identity Verification**: What customer credentials must you collect and how do you confirm their authenticity via external state directories (such as credit agencies or govt records)?
2. **Sanctions List Checking**: How you match user names against regulatory watchlists (like OFAC) without raising high false-positives database blocks.
3. **Risk Scoring Engine**: How you categorize users into Low, Medium, and High risk profiles.`,
    solutionTemplate: `An outstanding KYC onboarding analysis specifies:
- Document collection (SSN/Govt IDs) with optical character recognition (OCR) paired with biometric face-matching algorithms showing active movement.
- Match querying on OFAC/Sanctions indices using Levenshtein distance string similarity calculations, utilizing manual compliance officer check queues to resolve grey zone matches.
- Dynamic scoring based on residence country, expected transfer frequency, business entities structure, and initial deposit volume.`,
    expectedOutcomes: [
      'Mention OFAC watchlists checks using fuzzy matching software logic.',
      'Explain AML risk categorizations (Low, Medium, High risk tiers).',
      'Detail identity and identity documents verifying techniques (biometrics, govt databases).'
    ],
    keywords: ['KYC onboarding', 'AML watchlists', 'OFAC check', 'BSA compliance', 'risk profiling', 'Levenshtein distance']
  },
  {
    id: 'finance-order-matcher',
    title: 'Order Book Matching Engine',
    category: 'Banking & Finance',
    type: 'coding',
    difficulty: 'Medium',
    description: `Implement a trade order book matching engine.
    
In a digital brokerage, stock transactions run through an order book where Buy (Bid) and Sell (Ask) orders are matching based on price-time priority.

Implement a class \`OrderMatcher\`:
1. \`addOrder(id: string, side: 'buy' | 'sell', price: number, quantity: number): number\`: Adds a limit order to the book and attempts to match with opposing orders.
   - Buy order matches if there is a Sell order at a price <= buy price.
   - Sell order matches if there is a Buy order at a price >= sell price.
   - Orders match against the best available price first (lowest sell price for buyers, highest buy price for sellers). If same price, oldest matched first.
   - Subtract fulfilled quantities. Returns the total quantity matched (sum of filled volumes) during this addition. Stored remaining unmatched share blocks in order memory queue.`,
    initialCode: `export interface LimitOrder {
  id: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  timestamp: number;
}

export class OrderMatcher {
  private buyBook: LimitOrder[] = [];
  private sellBook: LimitOrder[] = [];
  private counter: number = 0;

  public addOrder(id: string, side: 'buy' | 'sell', price: number, quantity: number): number {
    // Your code here
    return 0;
  }
}`,
    solutionTemplate: `export interface LimitOrder {
  id: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  timestamp: number;
}

export class OrderMatcher {
  private buyBook: LimitOrder[] = [];
  private sellBook: LimitOrder[] = [];
  private counter: number = 0;

  public addOrder(id: string, side: 'buy' | 'sell', price: number, qty: number): number {
    this.counter++;
    const newOrder: LimitOrder = { id, side, price, qty, timestamp: this.counter };
    let totalFilled = 0;

    if (side === 'buy') {
      this.sellBook.sort((a, b) => a.price - b.price || a.timestamp - b.timestamp);
      
      for (const sellObj of this.sellBook) {
        if (newOrder.qty <= 0) break;
        if (sellObj.price <= newOrder.price && sellObj.qty > 0) {
          const matchQty = Math.min(newOrder.qty, sellObj.qty);
          newOrder.qty -= matchQty;
          sellObj.qty -= matchQty;
          totalFilled += matchQty;
        }
      }
      
      this.sellBook = this.sellBook.filter(s => s.qty > 0);
      
      if (newOrder.qty > 0) {
        this.buyBook.push(newOrder);
      }
    } else {
      this.buyBook.sort((a, b) => b.price - a.price || a.timestamp - b.timestamp);
      
      for (const buyObj of this.buyBook) {
        if (newOrder.qty <= 0) break;
        if (buyObj.price >= newOrder.price && buyObj.qty > 0) {
          const matchQty = Math.min(newOrder.qty, buyObj.qty);
          newOrder.qty -= matchQty;
          buyObj.qty -= matchQty;
          totalFilled += matchQty;
        }
      }
      
      this.buyBook = this.buyBook.filter(b => b.qty > 0);
      
      if (newOrder.qty > 0) {
        this.sellBook.push(newOrder);
      }
    }

    return totalFilled;
  }
}`,
    expectedOutcomes: [
      'Prioritize trade matches based on lowest bid ask thresholds (price-time constraints).',
      'Track order execution volumes by subtracting matching volume from order quantities.',
      'Deduct fully matching transactions out of the buy and sell queue.',
      'Append leftover stock volumes to the correct purchase or sales queue.'
    ],
    keywords: ['matching engine', 'order book sorting', 'bid ask prioritize', 'limit order execution', 'volume match math']
  },
  {
    id: 'finance-aml-patterns',
    title: 'Structuring & AML Detection Algorithms',
    category: 'Banking & Finance',
    type: 'conceptual',
    difficulty: 'Medium',
    description: `Explain how transactional compliance systems flag "structuring" (also known as smurfing) in daily banking channels.
    
Regulations require banks to file a Currency Transaction Report (CTR) for physical deposits over $10,000. Bad actors try to bypass this by making multiple smaller deposits (e.g. $9,500, $9,800) across consecutive hours or multiple branch locations. 

Describe:
1. **Detection Window**: What timeframe analysis algorithms are required to aggregate multiple deposits?
2. **False-Positive Management**: How to distinguish a payroll run or grocery business cash deposit from true laundering structuring.
3. **Data Pipelines**: How to digest high transaction volumes real-time using sliding windows.`,
    solutionTemplate: `An outstanding AML structural design architecture highlights:
- Operating a moving aggregate timeframe (typically rolling 24 to 72 hours) tracking individual Social Security Numbers, business TAX IDs, or related device logs.
- Filtering with behavioral baseline metrics — comparing historic deposit patterns (e.g., normal business deposits see constant patterns over 12 months vs. an sudden spike in low-frequency accounts).
- Leveraging stream aggregation systems running sliding time-windows, evaluating risk weights before triggering Suspicious Activity Reports (SARs).`,
    expectedOutcomes: [
      'Define transactional structuring rules (deposits under reporting thresholds like $10,000).',
      'Incorporate sliding windows (such as a rolling 24-72 hour window) to catch related deposits.',
      'Differentiate true laundering behavior from normal high-frequency business patterns using anomalies baseline check variables.'
    ],
    keywords: ['structuring', 'AML rules', 'currency transaction report', 'sliding transaction windows', 'behavioral baselines']
  },
  {
    id: 'finance-max-drawdown',
    title: 'Portfolio Maximum Drawdown Analyzer',
    category: 'Banking & Finance',
    type: 'coding',
    difficulty: 'Hard',
    description: `Implement a performance metric algorithm \`calculateMaxDrawdown(prices: number[]): number\` to find the maximum peak-to-trough drop of historical stock portfolio valuations.

The maximum drawdown (MDD) is the largest percentage drop of the portfolio value from any historical peak. The formula is evaluated as:
\`Drawdown = (TroughValue - PeakValue) / PeakValue\` (represented as a fraction).

### Requirements:
1. Return the maximum drawdown as a positive fractional value (e.g., if value drops from 100 to 70 and that is the largest drop, return \`0.30\` representing a 30% drop).
2. If prices never descend, return \`0\`.
3. Your algorithm must execute in O(N) time complexity and O(1) auxiliary space complexity. Single loops are highly preferred.`,
    initialCode: `export function calculateMaxDrawdown(prices: number[]): number {
  // Your code here
  return 0;
}`,
    solutionTemplate: `export function calculateMaxDrawdown(prices: number[]): number {
  if (prices.length <= 1) return 0;
  
  let maxPeak = prices[0];
  let maxDD = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i];
    if (currentPrice > maxPeak) {
      maxPeak = currentPrice;
    } else {
      const dropFraction = (maxPeak - currentPrice) / maxPeak;
      if (dropFraction > maxDD) {
        maxDD = dropFraction;
      }
    }
  }
  
  return parseFloat(maxDD.toFixed(4));
}`,
    expectedOutcomes: [
      'Implement single-pass O(N) evaluation scanning to record moving historical peak elements.',
      'Calculate percentage drawdown fraction from peak boundaries on dynamic drops.',
      'Enforce strict O(1) auxiliary space memory restrictions.',
      'Handle zero-drop price trajectories properly by returning 0.'
    ],
    keywords: ['maximum drawdown', 'O(N) single pass', 'peak tracking', 'investment analysis scaling', 'calculateMaxDrawdown']
  },
  {
    id: 'finance-hft-latency',
    title: 'High-Frequency Trading Network Latency Design',
    category: 'Banking & Finance',
    type: 'conceptual',
    difficulty: 'Hard',
    description: `Describe the engineering design of a high-frequency trading (HFT) infrastructure demanding sub-microsecond latency.
    
Detail:
1. **Network protocol and OSI stack bypassing**: Standard TCP congestion vs UDP multi-casting with custom reliability protocols.
2. **OS kernel kernel-bypass techniques**: Explain DPDK (Data Plane Development Kit) or Solarflare OpenOnload.
3. **Hardware Acceleration**: Role of field-programmable gate arrays (FPGAs) in translating market data formats.
4. **Co-location**: Placing computational server arrays physical meters away from exchange matching servers.`,
    solutionTemplate: `A stellar HFT infrastructure analysis details:
- Co-location: Installing order execution server clusters physically within the exchange datacenter cage, reducing light speed fiber propagation transit delay down to single-digit nanoseconds.
- Kernel Bypass: Utilizing DPDK/Solarflare OpenOnload cards to forward packet buffers directly into RAM user memory spaces, skipping kernel interrupt contexts and CPU contexts switching.
- Hardware Processing: Program buy/sell checks directly on FPGA silicon wafers to execute order routing within 50 to 100 nanoseconds, bypassing traditional CPU compiler/execution lanes.`,
    expectedOutcomes: [
      'Detail physical fiber co-location tactics within the exchange data warehouse.',
      'Explain kernel bypass mechanics to jump network packets directly into user CPU space.',
      'Outline FPGA hardware layouts to process exchange feeds in nanoseconds.'
    ],
    keywords: ['HFT acceleration', 'kernel bypass', 'FPGA trade engine', 'DPDK network', 'co-location latency']
  }
];

export interface AuthAttemptResult {
  user: UserRecord | null;
  error?: string;
}

export class Database {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(SQLITE_DB_FILE);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.initSchema();
    this.seedOrMigrate();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'candidate',
        password_hash TEXT NOT NULL,
        registered_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        description TEXT NOT NULL,
        initial_code TEXT DEFAULT '',
        solution_template TEXT DEFAULT '',
        expected_outcomes TEXT NOT NULL DEFAULT '[]',
        keywords TEXT NOT NULL DEFAULT '[]',
        is_custom INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        question_id TEXT NOT NULL,
        question_title TEXT NOT NULL,
        category TEXT NOT NULL,
        type TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        code_language TEXT,
        duration_seconds INTEGER,
        timestamp TEXT NOT NULL,
        evaluation_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS feedbacks (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        rating INTEGER NOT NULL,
        category TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_email TEXT NOT NULL,
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        details TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        user_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, question_id)
      );
    `);

    // Forward-compatible column migrations for existing mockmind.db instances
    const qCols = (this.db.prepare('PRAGMA table_info(questions)').all() as Array<{ name: string }>).map(c => c.name);
    if (!qCols.includes('test_cases')) {
      this.db.exec("ALTER TABLE questions ADD COLUMN test_cases TEXT NOT NULL DEFAULT '[]';");
    }
    if (!qCols.includes('sql_setup')) {
      this.db.exec("ALTER TABLE questions ADD COLUMN sql_setup TEXT DEFAULT '';");
    }

    const sCols = (this.db.prepare('PRAGMA table_info(submissions)').all() as Array<{ name: string }>).map(c => c.name);
    if (!sCols.includes('hints_used')) {
      this.db.exec('ALTER TABLE submissions ADD COLUMN hints_used INTEGER DEFAULT 0;');
    }
  }

  private isAdminEmail(email: string): boolean {
    const normalized = email.toLowerCase().trim();
    const envEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.toLowerCase().trim())
      .filter(Boolean);
    const list = envEmails.length > 0 ? envEmails : DEFAULT_ADMIN_EMAILS;
    return list.includes(normalized);
  }

  private getAdminPassword(): string {
    return process.env.ADMIN_PASSWORD || '2441139';
  }

  private hashPassword(passwordPlain: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(passwordPlain, salt, 64).toString('hex');
    return `scrypt$${salt}$${derived}`;
  }

  private legacySimpleHash(pwd: string): string {
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
      const char = pwd.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return 'h_' + hash.toString(36);
  }

  private verifyPassword(passwordPlain: string, storedHash: string): { valid: boolean; needsUpgrade: boolean } {
    if (storedHash.startsWith('scrypt$')) {
      const parts = storedHash.split('$');
      if (parts.length !== 3) return { valid: false, needsUpgrade: false };
      const [, salt, expectedHex] = parts;
      const derivedBuf = crypto.scryptSync(passwordPlain, salt, 64);
      const expectedBuf = Buffer.from(expectedHex, 'hex');
      if (derivedBuf.length !== expectedBuf.length) return { valid: false, needsUpgrade: false };
      return {
        valid: crypto.timingSafeEqual(derivedBuf, expectedBuf),
        needsUpgrade: false
      };
    }

    // Legacy hash compatibility (transparently upgraded on next login)
    return {
      valid: this.legacySimpleHash(passwordPlain) === storedHash,
      needsUpgrade: true
    };
  }

  private normalizeCategory(cat: string): Question['category'] {
    if (cat === 'Frontend & React') return 'Data Structures';
    if (cat === 'Data Structures & Algorithms' || cat === 'JavaScript Essentials') return 'Algorithms';
    if (cat === 'Databases & SQL') return 'Databases';
    return cat as Question['category'];
  }

  private seedOrMigrate(): void {
    const qCountRow = this.db.prepare('SELECT COUNT(*) as cnt FROM questions').get() as { cnt: number };
    const uCountRow = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };

    // Import legacy db.json once if SQLite is fresh
    if (qCountRow.cnt === 0 && uCountRow.cnt === 0 && fs.existsSync(LEGACY_DB_FILE)) {
      try {
        const raw = fs.readFileSync(LEGACY_DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        const insertUser = this.db.prepare(`
          INSERT OR IGNORE INTO users (id, email, name, role, password_hash, registered_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const u of (parsed.users || [])) {
          const email = String(u.email || '').toLowerCase().trim();
          const role: UserRole = (u.id === 'usr_admin_paul' || this.isAdminEmail(email)) ? 'admin' : 'candidate';
          insertUser.run(
            u.id,
            email,
            u.name || 'Candidate',
            role,
            u.passwordHash || this.hashPassword(crypto.randomBytes(12).toString('hex')),
            u.registeredAt || new Date().toISOString()
          );
        }

        const insertQuestion = this.db.prepare(`
          INSERT OR IGNORE INTO questions (id, title, category, type, difficulty, description, initial_code, solution_template, expected_outcomes, keywords, is_custom, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const legacyQuestions: Question[] = parsed.questions || [];
        legacyQuestions.forEach((q, idx) => {
          insertQuestion.run(
            q.id,
            q.title,
            this.normalizeCategory(q.category),
            q.type,
            q.difficulty,
            q.description,
            q.initialCode || '',
            q.solutionTemplate || '',
            JSON.stringify(q.expectedOutcomes || []),
            JSON.stringify(q.keywords || []),
            q.isCustom ? 1 : 0,
            idx
          );
        });

        const insertSub = this.db.prepare(`
          INSERT OR IGNORE INTO submissions (id, user_id, question_id, question_title, category, type, answer_text, code_language, duration_seconds, timestamp, evaluation_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of (parsed.submissions || [])) {
          insertSub.run(
            s.id,
            s.userId || null,
            s.questionId,
            s.questionTitle,
            this.normalizeCategory(s.category),
            s.type,
            s.answerText,
            s.codeLanguage || null,
            typeof s.durationSeconds === 'number' ? s.durationSeconds : null,
            s.timestamp,
            JSON.stringify(s.evaluation)
          );
        }

        const insertFb = this.db.prepare(`
          INSERT OR IGNORE INTO feedbacks (id, user_id, user_name, user_email, rating, category, message, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const fb of (parsed.feedbacks || [])) {
          insertFb.run(
            fb.id,
            fb.userId || null,
            fb.userName,
            fb.userEmail,
            Number(fb.rating || 5),
            fb.category,
            fb.message,
            fb.timestamp
          );
        }

        const insertLog = this.db.prepare(`
          INSERT OR IGNORE INTO activity_logs (id, user_id, user_email, user_name, action, timestamp, details)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const log of (parsed.activityLogs || [])) {
          insertLog.run(
            log.id,
            log.userId || null,
            log.userEmail,
            log.userName,
            log.action,
            log.timestamp,
            log.details
          );
        }
      } catch (err) {
        console.error('Failed migrating legacy db.json into SQLite:', err);
      }
    }

    // Ensure all default questions exist
    const insertDefault = this.db.prepare(`
      INSERT OR IGNORE INTO questions (id, title, category, type, difficulty, description, initial_code, solution_template, expected_outcomes, keywords, is_custom, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    DEFAULT_QUESTIONS.forEach((q, idx) => {
      insertDefault.run(
        q.id,
        q.title,
        q.category,
        q.type,
        q.difficulty,
        q.description,
        q.initialCode || '',
        q.solutionTemplate || '',
        JSON.stringify(q.expectedOutcomes || []),
        JSON.stringify(q.keywords || []),
        0,
        idx
      );
    });
  }

  public getSessionSecret(): string {
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
      return process.env.SESSION_SECRET.trim();
    }
    const row = this.db.prepare("SELECT value FROM app_meta WHERE key = 'session_secret'").get() as { value: string } | undefined;
    if (row?.value) return row.value;

    const generated = crypto.randomBytes(32).toString('hex');
    this.db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('session_secret', ?)").run(generated);
    return generated;
  }

  public registerUser(name: string, email: string, passwordPlain: string): UserRecord | null {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.isAdminEmail(normalizedEmail)) {
      return null;
    }

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return null;
    }

    const newUser: UserRecord = {
      id: 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      email: normalizedEmail,
      name: name.trim(),
      role: 'candidate',
      passwordHash: this.hashPassword(passwordPlain),
      registeredAt: new Date().toISOString()
    };

    this.db.prepare(`
      INSERT INTO users (id, email, name, role, password_hash, registered_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newUser.id, newUser.email, newUser.name, newUser.role, newUser.passwordHash, newUser.registeredAt);

    this.addActivityLog(newUser.id, newUser.email, newUser.name, 'Register', 'New candidate account registered.');
    return newUser;
  }

  public authenticateUser(email: string, passwordPlain: string, requestedRole?: UserRole): AuthAttemptResult {
    const normalizedEmail = email.toLowerCase().trim();
    const isAdminAccount = this.isAdminEmail(normalizedEmail);

    if (requestedRole === 'admin' && !isAdminAccount) {
      return { user: null, error: 'This email does not have administrator privileges.' };
    }
    if (requestedRole === 'candidate' && isAdminAccount) {
      return { user: null, error: 'Administrator accounts must sign in through the Platform Admin tab.' };
    }

    if (isAdminAccount) {
      if (passwordPlain !== this.getAdminPassword()) {
        return { user: null, error: 'Invalid administrator credentials.' };
      }

      let adminRow = this.db
        .prepare("SELECT id, email, name, role, password_hash, registered_at FROM users WHERE id = 'usr_admin_paul' OR email = ?")
        .get(normalizedEmail) as any;

      if (!adminRow) {
        const adminId = 'usr_admin_paul';
        const now = new Date().toISOString();
        const hash = this.hashPassword(passwordPlain);
        this.db.prepare(`
          INSERT INTO users (id, email, name, role, password_hash, registered_at)
          VALUES (?, ?, ?, 'admin', ?, ?)
        `).run(adminId, normalizedEmail, 'Paul Samudra (Admin)', hash, now);
        adminRow = {
          id: adminId,
          email: normalizedEmail,
          name: 'Paul Samudra (Admin)',
          role: 'admin',
          password_hash: hash,
          registered_at: now
        };
      } else if (adminRow.role !== 'admin') {
        this.db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminRow.id);
        adminRow.role = 'admin';
      }

      const adminUser: UserRecord = {
        id: adminRow.id,
        email: adminRow.email,
        name: adminRow.name,
        role: 'admin',
        passwordHash: adminRow.password_hash,
        registeredAt: adminRow.registered_at
      };

      this.addActivityLog(adminUser.id, adminUser.email, adminUser.name, 'Admin Login', 'Administrator authenticated.');
      return { user: adminUser };
    }

    const row = this.db
      .prepare('SELECT id, email, name, role, password_hash, registered_at FROM users WHERE email = ?')
      .get(normalizedEmail) as any;

    if (!row) {
      return { user: null, error: 'Invalid email or password.' };
    }

    const { valid, needsUpgrade } = this.verifyPassword(passwordPlain, row.password_hash);
    if (!valid) {
      return { user: null, error: 'Invalid email or password.' };
    }

    let finalHash = row.password_hash;
    if (needsUpgrade) {
      finalHash = this.hashPassword(passwordPlain);
      this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(finalHash, row.id);
    }

    const user: UserRecord = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: (row.role === 'admin' ? 'admin' : 'candidate'),
      passwordHash: finalHash,
      registeredAt: row.registered_at
    };

    this.addActivityLog(user.id, user.email, user.name, 'Login', 'Candidate signed in.');
    return { user };
  }

  public getUserById(id: string): User | undefined {
    const row = this.db
      .prepare('SELECT id, email, name, role, registered_at FROM users WHERE id = ?')
      .get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role === 'admin' || this.isAdminEmail(row.email) ? 'admin' : 'candidate',
      registeredAt: row.registered_at
    };
  }

  private mapQuestionRow(row: any): Question {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      type: row.type,
      difficulty: row.difficulty,
      description: row.description,
      initialCode: row.initial_code || '',
      solutionTemplate: row.solution_template || '',
      expectedOutcomes: JSON.parse(row.expected_outcomes || '[]'),
      keywords: JSON.parse(row.keywords || '[]'),
      isCustom: Boolean(row.is_custom),
      testCases: JSON.parse(row.test_cases || '[]'),
      sqlSetup: row.sql_setup || ''
    };
  }

  public getQuestions(): Question[] {
    const rows = this.db
      .prepare('SELECT * FROM questions ORDER BY sort_order ASC, rowid ASC')
      .all() as any[];
    return rows.map(r => this.mapQuestionRow(r));
  }

  public getQuestionById(id: string): Question | undefined {
    const row = this.db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as any;
    return row ? this.mapQuestionRow(row) : undefined;
  }

  public addQuestion(question: Question, actor?: User): Question {
    const maxOrder = this.db.prepare('SELECT COALESCE(MAX(sort_order), 0) as maxOrder FROM questions').get() as { maxOrder: number };
    this.db.prepare(`
      INSERT INTO questions (id, title, category, type, difficulty, description, initial_code, solution_template, expected_outcomes, keywords, is_custom, sort_order, test_cases, sql_setup)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      question.id,
      question.title,
      question.category,
      question.type,
      question.difficulty,
      question.description,
      question.initialCode || '',
      question.solutionTemplate || '',
      JSON.stringify(question.expectedOutcomes || []),
      JSON.stringify(question.keywords || []),
      question.isCustom ? 1 : 0,
      maxOrder.maxOrder + 1,
      JSON.stringify(question.testCases || []),
      question.sqlSetup || ''
    );

    this.addActivityLog(
      actor?.id,
      actor?.email || 'system',
      actor?.name || 'System Editor',
      'Create Custom Question',
      `Added challenge titled: "${question.title}".`
    );

    return question;
  }

  public updateQuestion(id: string, updated: Partial<Question>, actor?: User): Question | null {
    const existing = this.getQuestionById(id);
    if (!existing) return null;

    const merged: Question = {
      ...existing,
      ...updated,
      id
    };

    this.db.prepare(`
      UPDATE questions
      SET title = ?, category = ?, type = ?, difficulty = ?, description = ?, initial_code = ?, solution_template = ?, expected_outcomes = ?, keywords = ?, test_cases = ?, sql_setup = ?
      WHERE id = ?
    `).run(
      merged.title,
      merged.category,
      merged.type,
      merged.difficulty,
      merged.description,
      merged.initialCode || '',
      merged.solutionTemplate || '',
      JSON.stringify(merged.expectedOutcomes || []),
      JSON.stringify(merged.keywords || []),
      JSON.stringify(merged.testCases || []),
      merged.sqlSetup || '',
      id
    );

    this.addActivityLog(
      actor?.id,
      actor?.email || 'system',
      actor?.name || 'System Editor',
      'Update Question',
      `Updated challenge titled: "${merged.title}".`
    );

    return merged;
  }

  public deleteQuestion(id: string, actor?: User): boolean {
    const targetQ = this.getQuestionById(id);
    if (!targetQ) return false;

    const result = this.db.prepare('DELETE FROM questions WHERE id = ?').run(id);
    if (result.changes > 0) {
      this.db.prepare('DELETE FROM bookmarks WHERE question_id = ?').run(id);
      this.addActivityLog(
        actor?.id,
        actor?.email || 'system',
        actor?.name || 'System Editor',
        'Delete Question',
        `Removed challenge titled: "${targetQ.title}".`
      );
      return true;
    }
    return false;
  }

  private mapSubmissionRow(row: any): Submission {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      questionId: row.question_id,
      questionTitle: row.question_title,
      category: row.category,
      type: row.type,
      answerText: row.answer_text,
      codeLanguage: row.code_language || undefined,
      durationSeconds: typeof row.duration_seconds === 'number' ? row.duration_seconds : undefined,
      hintsUsed: typeof row.hints_used === 'number' ? row.hints_used : 0,
      timestamp: row.timestamp,
      evaluation: JSON.parse(row.evaluation_json)
    };
  }

  public getSubmissions(userId?: string): Submission[] {
    const rows = userId
      ? (this.db.prepare('SELECT * FROM submissions WHERE user_id = ? ORDER BY timestamp DESC').all(userId) as any[])
      : (this.db.prepare('SELECT * FROM submissions ORDER BY timestamp DESC').all() as any[]);
    return rows.map(r => this.mapSubmissionRow(r));
  }

  public getSubmissionById(id: string): Submission | undefined {
    const row = this.db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any;
    return row ? this.mapSubmissionRow(row) : undefined;
  }

  public addSubmission(submission: Submission): Submission {
    this.db.prepare(`
      INSERT INTO submissions (id, user_id, question_id, question_title, category, type, answer_text, code_language, duration_seconds, hints_used, timestamp, evaluation_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      submission.id,
      submission.userId || null,
      submission.questionId,
      submission.questionTitle,
      submission.category,
      submission.type,
      submission.answerText,
      submission.codeLanguage || null,
      typeof submission.durationSeconds === 'number' ? submission.durationSeconds : null,
      typeof submission.hintsUsed === 'number' ? submission.hintsUsed : 0,
      submission.timestamp,
      JSON.stringify(submission.evaluation)
    );

    const user = submission.userId ? this.getUserById(submission.userId) : undefined;
    this.addActivityLog(
      submission.userId,
      user?.email || 'guest@mockmind.internal',
      user?.name || 'Guest User',
      'Submit Answer',
      `Submitted practice attempt for "${submission.questionTitle}" with score: ${submission.evaluation.score}%`
    );

    return submission;
  }

  public getBookmarkedQuestionIds(userId: string): string[] {
    const rows = this.db
      .prepare('SELECT question_id FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Array<{ question_id: string }>;
    return rows.map((r) => r.question_id);
  }

  public toggleBookmark(userId: string, questionId: string): { bookmarked: boolean; bookmarks: string[] } {
    const existing = this.db
      .prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND question_id = ?')
      .get(userId, questionId);

    if (existing) {
      this.db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND question_id = ?').run(userId, questionId);
      return { bookmarked: false, bookmarks: this.getBookmarkedQuestionIds(userId) };
    }

    this.db
      .prepare('INSERT INTO bookmarks (user_id, question_id, created_at) VALUES (?, ?, ?)')
      .run(userId, questionId, new Date().toISOString());
    return { bookmarked: true, bookmarks: this.getBookmarkedQuestionIds(userId) };
  }

  public deleteSubmission(id: string, requesterId?: string, isAdmin = false): boolean {
    const row = this.db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as any;
    if (!row) return false;

    if (!isAdmin && row.user_id !== requesterId) {
      return false;
    }

    const res = this.db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
    if (res.changes > 0) {
      const user = requesterId ? this.getUserById(requesterId) : undefined;
      this.addActivityLog(
        requesterId,
        user?.email || 'guest@mockmind.internal',
        user?.name || 'User',
        'Delete Submission',
        `Deleted practice result for question: "${row.question_title}"`
      );
      return true;
    }
    return false;
  }

  public addActivityLog(userId: string | undefined, userEmail: string, userName: string, action: string, details: string): ActivityLog {
    const log: ActivityLog = {
      id: 'log_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      userId,
      userEmail,
      userName,
      action,
      timestamp: new Date().toISOString(),
      details
    };

    this.db.prepare(`
      INSERT INTO activity_logs (id, user_id, user_email, user_name, action, timestamp, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(log.id, log.userId || null, log.userEmail, log.userName, log.action, log.timestamp, log.details);

    return log;
  }

  public getActivityLogs(): ActivityLog[] {
    const rows = this.db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 500').all() as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id || undefined,
      userEmail: r.user_email,
      userName: r.user_name,
      action: r.action,
      timestamp: r.timestamp,
      details: r.details
    }));
  }

  public addFeedback(feedback: Feedback): Feedback {
    this.db.prepare(`
      INSERT INTO feedbacks (id, user_id, user_name, user_email, rating, category, message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      feedback.id,
      feedback.userId || null,
      feedback.userName,
      feedback.userEmail,
      feedback.rating,
      feedback.category,
      feedback.message,
      feedback.timestamp
    );

    this.addActivityLog(
      feedback.userId,
      feedback.userEmail,
      feedback.userName,
      'Submit Feedback',
      `Submitted feedback with rating ${feedback.rating}/5 in category "${feedback.category}"`
    );

    return feedback;
  }

  public getFeedbacks(): Feedback[] {
    const rows = this.db.prepare('SELECT * FROM feedbacks ORDER BY timestamp DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id || undefined,
      userName: r.user_name,
      userEmail: r.user_email,
      rating: r.rating,
      category: r.category,
      message: r.message,
      timestamp: r.timestamp
    }));
  }

  public getAllUsers(): User[] {
    const rows = this.db.prepare('SELECT id, email, name, role, registered_at FROM users ORDER BY registered_at DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: (r.role === 'admin' || this.isAdminEmail(r.email)) ? 'admin' : 'candidate',
      registeredAt: r.registered_at
    }));
  }
}

export const dbService = new Database();
