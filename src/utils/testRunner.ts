/**
 * MockMind Client-Side Unit Test Runner
 * Compiles and runs student solutions against pre-defined or custom unit tests directly in the browser.
 */

import { Question, QuestionTestCase } from '../types';

export interface TestCaseResult {
  name: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

export interface TestSuiteResult {
  passed: boolean;
  cases: TestCaseResult[];
  error?: string;
  noLocalSuite?: boolean;
}

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => deepEqual(item, b[idx]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

/**
 * Strips common TypeScript type annotations from user code
 * to make it valid executable JavaScript in browser-level eval.
 */
export function compileTSToJS(tsCode: string): string {
  let js = tsCode;

  // 1. Remove ES imports & exports
  js = js.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  js = js.replace(/\bexport\s+/g, '');

  // 2. Remove standard TS declarations (interfaces & types)
  js = js.replace(/interface\s+\w+\s*\{[\s\S]*?\}/g, '');
  js = js.replace(/type\s+\w+\s*=\s*[^;]+;?/g, '');

  // 3. Strip function generics like <T>, <T extends ...>
  js = js.replace(/<[A-Za-z0-9_,\s<=&|:()[\]{}'"]+>(?=\s*\()/g, '');

  // 4. Strip variable type annotations on const/let/var (e.g. const stack: string[] = []; const map: Record<string, string> = {})
  js = js.replace(
    /\b(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*(?:Record|Map|Set|Array|ReadonlyArray|Promise|Partial|Required|Readonly)<[^=]+?>\s*(?==)/g,
    '$1 $2 '
  );
  js = js.replace(
    /\b(const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*[A-Za-z_$][A-Za-z0-9_$\[\]|&\s.]*\s*(?==)/g,
    '$1 $2 '
  );

  // 5. Strip TS parameter/return type signatures
  js = js.replace(/:\s*(?:Record|Map|Set|Array|ReadonlyArray|Promise)<[^)>]+>/g, '');
  js = js.replace(/:\s*string\[\]\[\]/g, '');
  js = js.replace(/:\s*\[string,\s*string\]\[\]/g, '');
  js = js.replace(/:\s*string\[\]/g, '');
  js = js.replace(/:\s*number\[\]/g, '');
  js = js.replace(/:\s*boolean\[\]/g, '');
  js = js.replace(/:\s*string\b/g, '');
  js = js.replace(/:\s*number\b/g, '');
  js = js.replace(/:\s*boolean\b/g, '');
  js = js.replace(/:\s*void\b/g, '');
  js = js.replace(/:\s*any\b/g, '');
  js = js.replace(/:\s*unknown\b/g, '');
  js = js.replace(/:\s*'buy'\s*\|\s*'sell'/g, '');
  js = js.replace(/:\s*LimitOrder\[\]/g, '');
  js = js.replace(/:\s*\(\s*\.\.\.args:\s*Parameters<T>\s*\)\s*=>\s*void/g, '');

  // Double check any trailing type parameters & function return annotations
  js = js.replace(/<T>/g, '');
  js = js.replace(/\)\s*:\s*[A-Za-z_$][A-Za-z0-9_<>\[\]|&\s,'".]*(?=\s*\{)/g, ')');
  js = js.replace(/\bas\s+(?:const|[A-Za-z_$][A-Za-z0-9_<>\[\]]*)/g, '');

  return js;
}

function runDynamicCases(compiledJS: string, customCases: QuestionTestCase[]): TestSuiteResult {
  const cases: TestCaseResult[] = [];

  // Discover declared function names in candidate code
  const fnNames = Array.from(
    new Set([
      ...Array.from(compiledJS.matchAll(/\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g)).map((m) => m[1]),
      ...Array.from(compiledJS.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>/g)).map((m) => m[1]),
      ...customCases.map((tc) => tc.functionName).filter((n): n is string => Boolean(n && n.trim()))
    ])
  );

  const exportEntries = fnNames
    .map((name) => `${name}: typeof ${name} !== 'undefined' ? ${name} : null`)
    .join(',\n        ');

  const sandbox = new Function(`
    ${compiledJS}
    return {
      ${exportEntries}
    };
  `)();

  const fallbackFnName = fnNames[0];

  for (let i = 0; i < customCases.length; i++) {
    const tc = customCases[i];
    const targetName = tc.functionName?.trim() || fallbackFnName;
    const fn = targetName ? sandbox[targetName] : null;
    if (typeof fn !== 'function') {
      cases.push({
        name: tc.name || `Case ${i + 1}`,
        input: JSON.stringify(tc.args ?? []),
        expected: JSON.stringify(tc.expected),
        actual: 'Function not found',
        passed: false,
        error: targetName
          ? `Could not find callable function "${targetName}" in your solution.`
          : 'No top-level function found to execute test cases against.'
      });
      continue;
    }

    try {
      const args = Array.isArray(tc.args) ? tc.args : [tc.args];
      const actual = fn(...args);
      const passed = deepEqual(actual, tc.expected);
      cases.push({
        name: tc.name || `Case ${i + 1}`,
        input: args.map((a) => JSON.stringify(a)).join(', '),
        expected: JSON.stringify(tc.expected),
        actual: JSON.stringify(actual),
        passed
      });
    } catch (e: any) {
      cases.push({
        name: tc.name || `Case ${i + 1}`,
        input: JSON.stringify(tc.args ?? []),
        expected: JSON.stringify(tc.expected),
        actual: 'ERROR',
        passed: false,
        error: e?.message || 'Runtime error during test execution'
      });
    }
  }

  return {
    passed: cases.length > 0 && cases.every((c) => c.passed),
    cases
  };
}

/**
 * Runs assertions for a question object or id given the user's raw code
 */
export async function runUnitTests(questionOrId: string | Question, userCode: string): Promise<TestSuiteResult> {
  const questionId = typeof questionOrId === 'string' ? questionOrId : questionOrId.id;
  const customCases = typeof questionOrId === 'string' ? undefined : questionOrId.testCases;
  const cases: TestCaseResult[] = [];
  
  try {
    const compiledJS = compileTSToJS(userCode);

    if (customCases && customCases.length > 0) {
      return runDynamicCases(compiledJS, customCases);
    }
    
    // Evaluate in wrapped function scope to catch closures and classes without polluting global scope
    const sandboxCreator = new Function(`
      ${compiledJS}
      
      return {
        isValidParentheses: typeof isValidParentheses !== 'undefined' ? isValidParentheses : (typeof this !== 'undefined' && this.isValidParentheses ? this.isValidParentheses : null),
        debounce: typeof debounce !== 'undefined' ? debounce : (typeof this !== 'undefined' && this.debounce ? this.debounce : null),
        TokenBucket: typeof TokenBucket !== 'undefined' ? TokenBucket : (typeof this !== 'undefined' && this.TokenBucket ? this.TokenBucket : null),
        useLocalStorage: typeof useLocalStorage !== 'undefined' ? useLocalStorage : (typeof this !== 'undefined' && this.useLocalStorage ? this.useLocalStorage : null),
        validateNDC: typeof validateNDC !== 'undefined' ? validateNDC : (typeof this !== 'undefined' && this.validateNDC ? this.validateNDC : null),
        generatePillSchedule: typeof generatePillSchedule !== 'undefined' ? generatePillSchedule : (typeof this !== 'undefined' && this.generatePillSchedule ? this.generatePillSchedule : null),
        findContraindications: typeof findContraindications !== 'undefined' ? findContraindications : (typeof this !== 'undefined' && this.findContraindications ? this.findContraindications : null),
        formatBytes: typeof formatBytes !== 'undefined' ? formatBytes : (typeof this !== 'undefined' && this.formatBytes ? this.formatBytes : null),
        LRUTTLCache: typeof LRUTTLCache !== 'undefined' ? LRUTTLCache : (typeof this !== 'undefined' && this.LRUTTLCache ? this.LRUTTLCache : null),
        calculateAPYValues: typeof calculateAPYValues !== 'undefined' ? calculateAPYValues : (typeof this !== 'undefined' && this.calculateAPYValues ? this.calculateAPYValues : null),
        OrderMatcher: typeof OrderMatcher !== 'undefined' ? OrderMatcher : (typeof this !== 'undefined' && this.OrderMatcher ? this.OrderMatcher : null),
        calculateMaxDrawdown: typeof calculateMaxDrawdown !== 'undefined' ? calculateMaxDrawdown : (typeof this !== 'undefined' && this.calculateMaxDrawdown ? this.calculateMaxDrawdown : null)
      };
    `);

    const exportsObj = sandboxCreator();

    switch (questionId) {
      case 'valid-parentheses': {
        const fn = exportsObj.isValidParentheses;
        if (!fn) throw new Error('Could not find function "isValidParentheses" in your code. Ensure it is named correctly.');
        
        const tests = [
          { s: '()', expected: true },
          { s: '()[]{}', expected: true },
          { s: '(]', expected: false },
          { s: '([)]', expected: false },
          { s: '{[]}', expected: true },
          { s: '', expected: true }
        ];

        for (let i = 0; i < tests.length; i++) {
          const t = tests[i];
          try {
            const actual = fn(t.s);
            cases.push({
              name: `Test Case ${i + 1}: Check simple and nested brackets`,
              input: `s = "${t.s}"`,
              expected: String(t.expected),
              actual: String(actual),
              passed: actual === t.expected
            });
          } catch (e: any) {
            cases.push({
              name: `Test Case ${i + 1}: s = "${t.s}"`,
              input: `s = "${t.s}"`,
              expected: String(t.expected),
              actual: 'ERROR',
              passed: false,
              error: e.message
            });
          }
        }
        break;
      }

      case 'healthcare-validate-ndc': {
        const fn = exportsObj.validateNDC;
        if (!fn) throw new Error('Could not find function "validateNDC" in your code. Ensure it is named correctly.');

        const tests = [
          { input: '1234-5678-90', expected: true },
          { input: '12345-678-90', expected: true },
          { input: '12345-6789-0', expected: true },
          { input: '12345-6789-01', expected: true },
          { input: '1234-567-890', expected: false },
          { input: 'abcde-fgh-ij', expected: false },
          { input: '12345-6789-012', expected: false }
        ];

        for (let i = 0; i < tests.length; i++) {
          const t = tests[i];
          try {
            const actual = fn(t.input);
            cases.push({
              name: `Test Code Format: ${t.input}`,
              input: t.input,
              expected: String(t.expected),
              actual: String(actual),
              passed: actual === t.expected
            });
          } catch (e: any) {
            cases.push({
              name: `Test Code Format: ${t.input}`,
              input: t.input,
              expected: String(t.expected),
              actual: 'ERROR',
              passed: false,
              error: e.message
            });
          }
        }
        break;
      }

      case 'finance-interest-calc': {
        const fn = exportsObj.calculateAPYValues;
        if (!fn) throw new Error('Could not find function "calculateAPYValues" in your code. Ensure it is named correctly.');

        const tests = [
          { args: [1000, 0.05, 12, 1], expected: 1051.16, desc: 'Compound monthly for 1 year' },
          { args: [5000, 0.08, 4, 3], expected: 6341.21, desc: 'Compound quarterly for 3 years' },
          { args: [10000, 0.03, 1, 5], expected: 11592.74, desc: 'Compound annually for 5 years' },
          { args: [100, -0.05, 12, 1], expected: 0, desc: 'Negative interest rates fallback to 0' }
        ];

        for (let i = 0; i < tests.length; i++) {
          const t = tests[i];
          try {
            const actual = fn(...t.args);
            cases.push({
              name: `Test Case ${i + 1}: ${t.desc}`,
              input: `P=${t.args[0]}, r=${t.args[1]}, n=${t.args[2]}, t=${t.args[3]}`,
              expected: String(t.expected),
              actual: String(actual),
              passed: Math.abs(actual - t.expected) <= 0.02
            });
          } catch (e: any) {
            cases.push({
              name: `Test Case ${i + 1}`,
              input: JSON.stringify(t.args),
              expected: String(t.expected),
              actual: 'ERROR',
              passed: false,
              error: e.message
            });
          }
        }
        break;
      }

      case 'it-bytes-formatter': {
        const fn = exportsObj.formatBytes;
        if (!fn) throw new Error('Could not find function "formatBytes" in your code. Ensure it is named correctly.');

        const tests = [
          { bytes: 0, decimals: 2, expected: '0 Bytes' },
          { bytes: 1024, decimals: 1, expected: '1 KB' },
          { bytes: 75390, decimals: 1, expected: '73.6 KB' },
          { bytes: 1048576, decimals: 2, expected: '1 MB' },
          { bytes: 10737418240, decimals: 0, expected: '10 GB' }
        ];

        for (let i = 0; i < tests.length; i++) {
          const t = tests[i];
          try {
            const actual = fn(t.bytes, t.decimals);
            // Replace any multiple spaces with a single space
            const normalizedActual = String(actual).replace(/\s+/g, ' ').trim();
            const normalizedExpected = t.expected.trim();
            cases.push({
              name: `Format size check: ${t.bytes} bytes`,
              input: `bytes=${t.bytes}, decimals=${t.decimals}`,
              expected: normalizedExpected,
              actual: normalizedActual,
              passed: normalizedActual.startsWith(normalizedExpected) || normalizedActual === normalizedExpected || normalizedActual.replace('.00', '') === normalizedExpected.replace('.00', '')
            });
          } catch (e: any) {
            cases.push({
              name: `Format size check: ${t.bytes} bytes`,
              input: `bytes=${t.bytes}, decimals=${t.decimals}`,
              expected: t.expected,
              actual: 'ERROR',
              passed: false,
              error: e.message
            });
          }
        }
        break;
      }

      case 'finance-max-drawdown': {
        const fn = exportsObj.calculateMaxDrawdown;
        if (!fn) throw new Error('Could not find function "calculateMaxDrawdown" in your code. Ensure it is named correctly.');

        const tests = [
          { prices: [100, 120, 110, 130, 80, 120, 70, 110], expected: 0.4615, desc: 'Standard drawdown calculation' },
          { prices: [100, 110, 120, 130], expected: 0, desc: 'Ever-increasing prices' },
          { prices: [100, 90, 80, 70], expected: 0.30, desc: 'Ever-decreasing prices' },
          { prices: [50], expected: 0, desc: 'Single price point' }
        ];

        for (let i = 0; i < tests.length; i++) {
          const t = tests[i];
          try {
            const actual = fn(t.prices);
            cases.push({
              name: `Max Drawdown Test ${i + 1}: ${t.desc}`,
              input: `prices = [${t.prices.join(', ')}]`,
              expected: String(t.expected),
              actual: String(actual),
              passed: Math.abs(actual - t.expected) <= 0.01
            });
          } catch (e: any) {
            cases.push({
              name: `Max Drawdown Test ${i + 1}`,
              input: `prices = [${t.prices}]`,
              expected: String(t.expected),
              actual: 'ERROR',
              passed: false,
              error: e.message
            });
          }
        }
        break;
      }

      case 'healthcare-contraindication-check': {
        const fn = exportsObj.findContraindications;
        if (!fn) throw new Error('Could not find function "findContraindications" in your code. Ensure it is named correctly.');

        const activeDrugs = ['Aspirin', 'Warfarin', 'Ibuprofen', 'Acetaminophen'];
        const rules: [string, string][] = [
          ['Aspirin', 'Warfarin'],
          ['Ibuprofen', 'Warfarin'],
          ['Amoxicillin', 'Penicillin']
        ];
        
        // Expected: [['Aspirin', 'Warfarin'], ['Ibuprofen', 'Warfarin']] (alphabetically ordered)
        const expected = [
          ['Aspirin', 'Warfarin'],
          ['Ibuprofen', 'Warfarin']
        ];

        try {
          const actual = fn(activeDrugs, rules);
          const passed = JSON.stringify(actual) === JSON.stringify(expected);
          cases.push({
            name: 'Check standard drug conflict pair identification and sorting',
            input: `activeDrugs = ${JSON.stringify(activeDrugs)}, rules = ${JSON.stringify(rules)}`,
            expected: JSON.stringify(expected),
            actual: JSON.stringify(actual),
            passed
          });
        } catch (e: any) {
          cases.push({
            name: 'Check standard drug conflict pair identification',
            input: 'Checking combinations',
            expected: JSON.stringify(expected),
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }

        // Test with zero conflicts
        try {
          const actualZero = fn(['Amoxicillin', 'Aspirin'], rules);
          cases.push({
            name: 'Check single-drug combination output',
            input: `active = ['Amoxicillin', 'Aspirin']`,
            expected: '[]',
            actual: JSON.stringify(actualZero),
            passed: Array.isArray(actualZero) && actualZero.length === 0
          });
        } catch (e: any) {
          cases.push({
            name: 'Check empty combination output',
            input: 'Empty state check',
            expected: '[]',
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }
        break;
      }

      case 'healthcare-pill-intervals': {
        const fn = exportsObj.generatePillSchedule;
        if (!fn) throw new Error('Could not find function "generatePillSchedule" in your code. Ensure it is named correctly.');

        try {
          // Normal case: Start 08:00 AM, 4-hour interval, 3 doses
          // Mapped locally (no shift required since all are between 06:00 and 23:00)
          const startTime = new Date('2026-06-19T08:00:00.000Z');
          const res = fn(startTime.toISOString(), 4, 3);
          
          cases.push({
            name: 'Continuous daylight series generation',
            input: `startTime="08:00", interval=4, doses=3`,
            expected: '3 timestamps, consecutive hourly spaces',
            actual: `${res.length} doses mapped: ${JSON.stringify(res)}`,
            passed: Array.isArray(res) && res.length === 3
          });
          
          // sleep window shift checking
          // If we add 4 doses from 20:00:
          // Dose 1: 20:00 (safe)
          // Dose 2: 24:00 (shifts to next day 06:00)
          // Dose 3: 10:00 (safe)
          // Dose 4: 14:00 (safe)
          const resShift = fn(new Date('2026-06-19T20:00:00.000').toISOString(), 4, 3);
          let secondDoseHourIsValid = false;
          if (resShift.length >= 2) {
            const date2 = new Date(resShift[1]);
            secondDoseHourIsValid = date2.getHours() === 6;
          }
          
          cases.push({
            name: 'Medication sleep window shift verification',
            input: `startTime="20:00", interval=4, doses=3`,
            expected: 'Second dose occurs at exactly 06:00 AM after sleep correction',
            actual: `Second dose timestamp: ${resShift[1] || 'None'}`,
            passed: secondDoseHourIsValid
          });

        } catch (e: any) {
          cases.push({
            name: 'Scheduler validation exception thrown',
            input: 'Valid intervals simulation',
            expected: 'ISO Timestamp Arrays matching criteria',
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }
        break;
      }

      case 'it-rate-limiter': {
        const BucketClass = exportsObj.TokenBucket;
        if (!BucketClass) throw new Error('Could not find class "TokenBucket" in your code. Ensure it is named correctly.');

        try {
          const limiter = new BucketClass(5, 2); // capacity 5, refill rate 2/sec
          
          // Initial allows
          let p1 = limiter.allowRequest(1000); 
          let p2 = limiter.allowRequest(1000);
          let p3 = limiter.allowRequest(1000);
          let p4 = limiter.allowRequest(1000);
          let p5 = limiter.allowRequest(1000);
          let p6 = limiter.allowRequest(1000); // 6th should fail (capacity exceeded)

          cases.push({
            name: 'Check capacity bounds limits',
            input: 'Initialize capacity=5, request 6 items at same timestamp',
            expected: 'allows=[true, true, true, true, true], 6th=false',
            actual: `Allows: ${[p1, p2, p3, p4, p5, p6].join(', ')}`,
            passed: p1 && p2 && p3 && p4 && p5 && !p6
          });

          // Dynamic lazily refilled
          const limiter2 = new BucketClass(2, 1); // cap 2, 1 token/sec
          limiter2.allowRequest(1000); // token remaining: 1
          limiter2.allowRequest(1000); // token remaining: 0
          
          // 2 seconds later, should refill 2 tokens
          let r1 = limiter2.allowRequest(3000); // allows, remaining: 1
          let r2 = limiter2.allowRequest(3000); // allows, remaining: 0
          let r3 = limiter2.allowRequest(3000); // rejected

          cases.push({
            name: 'Check lazy token replenishment over elapsed intervals',
            input: 'Request 2, wait 2 seconds (refills 2), request 3',
            expected: 'allows third block=[true, true], and fifth block=false',
            actual: `Next wave results: allowed=${r1}, allowed=${r2}, rejected=${!r3}`,
            passed: r1 && r2 && !r3
          });

        } catch (e: any) {
          cases.push({
            name: 'Token Limiter testing exception thrown',
            input: 'Instantiating TokenBucket',
            expected: 'Successful simulation runs without exceptions',
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }
        break;
      }

      case 'it-lru-ttl': {
        const LRUClass = exportsObj.LRUTTLCache;
        if (!LRUClass) throw new Error('Could not find class "LRUTTLCache" in your code. Ensure it is named correctly.');

        try {
          const cache = new LRUClass(2); // capacity 2
          cache.put('a', 10, 100, 1000); // key, value, ttl, timestamp
          cache.put('b', 20, 200, 1000);
          
          const g1 = cache.get('a', 1050); // within ttl, returns 10
          const g2 = cache.get('a', 1150); // expired, returns -1
          
          cases.push({
            name: 'Time-to-Live (TTL) key expiration check',
            input: 'Put key "a" with ttl 100 at time 1000. Get at 1050 and 1150',
            expected: 'At 1050: 10, At 1150: -1',
            actual: `At 1050: ${g1}, At 1150: ${g2}`,
            passed: g1 === 10 && g2 === -1
          });

          const cache2 = new LRUClass(2);
          cache2.put('x', 1, 1000, 1000);
          cache2.put('y', 2, 1000, 1020);
          
          // access 'x' at 1050 to make it recently used
          cache2.get('x', 1050);
          
          // put 'z' at 1100. y should be evicted because x was retrieved more recently
          cache2.put('z', 3, 1000, 1100);
          
          const xVal = cache2.get('x', 1150);
          const yVal = cache2.get('y', 1150);
          const zVal = cache2.get('z', 1150);

          cases.push({
            name: 'Least Recently Used (LRU) eviction logic',
            input: 'Put x, Put y, Get x, Put z (exceeds cap of 2). Check values',
            expected: 'x=1, y=-1 (evicted), z=3',
            actual: `x: ${xVal}, y: ${yVal}, z: ${zVal}`,
            passed: xVal === 1 && yVal === -1 && zVal === 3
          });

        } catch (e: any) {
          cases.push({
            name: 'LRU Cache verification exception thrown',
            input: 'Instantiating LRUTTLCache',
            expected: 'Successful execution of Cache sequences',
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }
        break;
      }

      case 'finance-order-matcher': {
        const MatcherClass = exportsObj.OrderMatcher;
        if (!MatcherClass) throw new Error('Could not find class "OrderMatcher" in your code. Ensure it is named correctly.');

        try {
          const matcher = new MatcherClass();
          // Add limit sell order: 100 shares at price 150
          const res1 = matcher.addOrder('s1', 'sell', 150, 100);
          // Add limit buy order: 50 shares at price 140 (no match occurs, buy price too low)
          const res2 = matcher.addOrder('b1', 'buy', 140, 50);
          // Add limit buy order: 60 shares at price 155 (matches with s1)
          const res3 = matcher.addOrder('b2', 'buy', 155, 60);

          cases.push({
            name: 'Standard Order Execution matches',
            input: 'Sell 100@150, Buy 50@140, Buy 60@155',
            expected: 'Match sell: 0, Match buy1: 0, Match buy2: 60',
            actual: `Matches: S1=${res1}, B1=${res2}, B2=${res3}`,
            passed: res1 === 0 && res2 === 0 && res3 === 60
          });

        } catch (e: any) {
          cases.push({
            name: 'Order Matcher verification exception thrown',
            input: 'Instantiating OrderMatcher',
            expected: 'Successful simulation of financial order priority book',
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }
        break;
      }

      case 'js-debounce': {
        const fn = exportsObj.debounce;
        if (!fn) throw new Error('Could not find function "debounce" in your code. Ensure it is named correctly.');

        try {
          let callCount = 0;
          const target = (arg: string) => { callCount++; };
          const debounced = fn(target, 50);
          
          if (typeof debounced !== 'function') {
            throw new Error('debounce did not return a function wrapper.');
          }

          debounced('hello');
          debounced('world');
          
          // Immediately after calling, callCount should be 0 because of delay 50
          const immediateCheck = callCount === 0;

          cases.push({
            name: 'Check trailing execution delay behaviour',
            input: 'Call debounced twice, verify zero synchronous runs',
            expected: 'callCount = 0 (execution is delayed)',
            actual: `callCount: ${callCount}`,
            passed: immediateCheck
          });

        } catch (e: any) {
          cases.push({
            name: 'Debounce testing validation exception',
            input: 'Verifying debounce wrapper',
            expected: 'Function returned successfully',
            actual: 'ERROR',
            passed: false,
            error: e.message
          });
        }
        break;
      }

      case 'react-localstorage': {
        const fn = exportsObj.useLocalStorage;
        if (!fn) throw new Error('Could not find function "useLocalStorage" in your code. Ensure it is named correctly.');

        cases.push({
          name: 'Verifying React localstorage hook signature',
          input: 'Hook presence validation',
          expected: 'Function of useLocalStorage is declared',
          actual: `typeof: ${typeof fn}`,
          passed: typeof fn === 'function'
        });
        break;
      }

      default: {
        // Custom coding question without local test cases: signal caller to run AI Dry-Run check
        return {
          passed: true,
          cases: [],
          noLocalSuite: true
        };
      }
    }

    const passed = cases.every(c => c.passed);
    return { passed, cases };

  } catch (error: any) {
    return {
      passed: false,
      cases: [],
      error: error.message || 'Syntax or Type evaluation compilation error detected. Please verify your brackets or identifiers.'
    };
  }
}
