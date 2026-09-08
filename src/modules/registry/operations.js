import {
  DEFAULT_SOURCE,
  REGISTRY_DEFINITIONS,
  REGISTRY_RESOLVERS,
  REGISTRY_SOURCE_PRIORITY,
  REGISTRY_SOURCE_RANK,
  REGISTRY_TYPES,
  validateRegistryKey,
} from "./schema";
import { DEFAULT_REGISTRY_SCOPE } from "./runtime";
export function isRegistryType(type) {
  return Boolean(REGISTRY_DEFINITIONS[type]);
}
export function createInitialRegistries() {
  return Object.fromEntries(
    Object.keys(REGISTRY_DEFINITIONS).map((type) => [type, {}]),
  );
}
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  )
    return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !Object.prototype.hasOwnProperty.call(b, key) ||
      !Object.is(a[key], b[key])
    ) {
      return false;
    }
  }
  return true;
}
function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function hasOwnProperty(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}
function resolveInstanceId(value) {
  if (isObject(value) && typeof value.instanceId === "string") {
    return value.instanceId;
  }
  return null;
}
function resolveRegisterInput(sourceOrOptions, optionsArg) {
  if (typeof sourceOrOptions === "string") {
    return {
      source: sourceOrOptions,
      options: isObject(optionsArg) ? optionsArg : {},
    };
  }
  if (isObject(sourceOrOptions)) {
    return {
      source:
        typeof sourceOrOptions.source === "string"
          ? sourceOrOptions.source
          : DEFAULT_SOURCE,
      options: sourceOrOptions,
    };
  }
  return {
    source: DEFAULT_SOURCE,
    options: isObject(optionsArg) ? optionsArg : {},
  };
}
function resolveScope(options) {
  return typeof options?.scope === "string" && options.scope.trim()
    ? options.scope.trim()
    : DEFAULT_REGISTRY_SCOPE;
}
function resolveUnregisterInput(sourceOrOptions) {
  if (typeof sourceOrOptions === "string") {
    return {
      instanceId: null,
      scope: null,
      source: sourceOrOptions,
    };
  }
  if (isObject(sourceOrOptions)) {
    return {
      instanceId: resolveInstanceId(sourceOrOptions),
      scope:
        typeof sourceOrOptions.scope === "string" &&
        sourceOrOptions.scope.trim()
          ? sourceOrOptions.scope.trim()
          : null,
      source:
        typeof sourceOrOptions.source === "string"
          ? sourceOrOptions.source
          : DEFAULT_SOURCE,
    };
  }
  return {
    instanceId: null,
    scope: null,
    source: DEFAULT_SOURCE,
  };
}
function buildSourceRecord({
  source,
  value,
  instanceId = null,
  priority,
  timestamp,
  sequence,
  scope = DEFAULT_REGISTRY_SCOPE,
}) {
  return {
    updatedAt: timestamp,
    sequence: Number.isFinite(sequence) ? sequence : timestamp,
    instanceId: typeof instanceId === "string" ? instanceId : null,
    priority,
    value,
    source,
    scope,
  };
}
export function createRecordKey(
  source,
  instanceId = null,
  scope = DEFAULT_REGISTRY_SCOPE,
) {
  if (scope === DEFAULT_REGISTRY_SCOPE) {
    if (typeof instanceId === "string" && instanceId.length > 0) {
      return `instance:${JSON.stringify([source, instanceId])}`;
    }
    return `source:${JSON.stringify(source)}`;
  }
  if (typeof instanceId === "string" && instanceId.length > 0) {
    return `instance:${JSON.stringify([scope, source, instanceId])}`;
  }
  return `source:${JSON.stringify([scope, source])}`;
}
function getSourceRecords(entry, source, scope = null) {
  return Object.entries(entry || {})
    .map(([recordKey, rawRecord]) => ({
      recordKey,
      record: toSourceRecord(rawRecord, recordKey),
    }))
    .filter(
      ({ record }) =>
        record?.source === source && (scope === null || record.scope === scope),
    );
}
function getSourceRecord(
  entry,
  source,
  instanceId = null,
  scope = DEFAULT_REGISTRY_SCOPE,
) {
  const recordKey = createRecordKey(source, instanceId, scope);
  return toSourceRecord(entry?.[recordKey], source);
}
function resolveRecordPriority(options, source) {
  if (isObject(options) && hasOwnProperty(options, "priority")) {
    const parsedPriority = Number(options.priority);
    if (Number.isFinite(parsedPriority)) {
      return parsedPriority;
    }
  }
  return REGISTRY_SOURCE_PRIORITY[source] ?? 0;
}
export function toSourceRecord(rawRecord, source = DEFAULT_SOURCE) {
  if (rawRecord === undefined) return null;
  const isWrappedRecord =
    isObject(rawRecord) &&
    hasOwnProperty(rawRecord, "value") &&
    hasOwnProperty(rawRecord, "updatedAt") &&
    hasOwnProperty(rawRecord, "priority") &&
    hasOwnProperty(rawRecord, "source");
  if (isWrappedRecord) {
    const parsedPriority = Number(rawRecord.priority);
    return {
      updatedAt: Number(rawRecord.updatedAt) || 0,
      sequence: Number(rawRecord.sequence) || Number(rawRecord.updatedAt) || 0,
      instanceId:
        typeof rawRecord.instanceId === "string" ? rawRecord.instanceId : null,
      priority: Number.isFinite(parsedPriority)
        ? parsedPriority
        : (REGISTRY_SOURCE_PRIORITY[source] ?? 0),
      source: typeof rawRecord.source === "string" ? rawRecord.source : source,
      scope:
        typeof rawRecord.scope === "string"
          ? rawRecord.scope
          : DEFAULT_REGISTRY_SCOPE,
      value: rawRecord.value,
    };
  }
  return {
    updatedAt: 0,
    sequence: 0,
    instanceId: null,
    priority: REGISTRY_SOURCE_PRIORITY[source] ?? 0,
    source,
    scope: DEFAULT_REGISTRY_SCOPE,
    value: rawRecord,
  };
}
function getSourceRank(source) {
  return REGISTRY_SOURCE_RANK[source] ?? 0;
}
function compareRecords(a, b) {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }
  const rankDiff = getSourceRank(a.source) - getSourceRank(b.source);
  if (rankDiff !== 0) {
    return rankDiff;
  }
  return (a.sequence ?? a.updatedAt) - (b.sequence ?? b.updatedAt);
}
function recordsHaveSameValue(prevRecord, nextRecord) {
  if (Object.is(prevRecord?.value, nextRecord?.value)) return true;
  if (isObject(prevRecord?.value) && isObject(nextRecord?.value)) {
    return shallowEqual(prevRecord.value, nextRecord.value);
  }
  return false;
}
function hasRecordChanged(prevRecord, nextRecord) {
  if (!prevRecord) return true;
  if (prevRecord.priority !== nextRecord.priority) return true;
  if (prevRecord.source !== nextRecord.source) return true;
  if (prevRecord.instanceId !== nextRecord.instanceId) return true;
  if (prevRecord.scope !== nextRecord.scope) return true;
  if (!recordsHaveSameValue(prevRecord, nextRecord)) return true;
  return false;
}
function hasAnySourceRecord(entry) {
  return Object.entries(entry || {}).some(
    ([, rawRecord]) => rawRecord !== undefined,
  );
}
function setSourceRecord(state, type, key, source, record) {
  const typeRegistry = state[type] || {};
  const currentEntry = typeRegistry[key] || {};
  const recordKey = createRecordKey(source, record.instanceId, record.scope);
  const prevRecord = toSourceRecord(currentEntry[recordKey], source);
  if (!hasRecordChanged(prevRecord, record)) {
    return state;
  }
  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: {
        ...currentEntry,
        [recordKey]: record,
      },
    },
  };
}
export function removeSourceRecord(
  state,
  type,
  key,
  source,
  instanceId = null,
  scope = null,
) {
  const typeRegistry = state[type];
  const currentEntry = typeRegistry?.[key];
  if (!typeRegistry || !currentEntry) {
    return state;
  }
  const records =
    typeof instanceId === "string" && instanceId.length > 0 && scope !== null
      ? [
          {
            recordKey: createRecordKey(
              source,
              instanceId,
              scope || DEFAULT_REGISTRY_SCOPE,
            ),
            record: getSourceRecord(
              currentEntry,
              source,
              instanceId,
              scope || DEFAULT_REGISTRY_SCOPE,
            ),
          },
        ]
      : getSourceRecords(currentEntry, source, scope).filter(
          ({ record }) => !instanceId || record.instanceId === instanceId,
        );
  const activeRecords = records.filter(({ record }) => Boolean(record));
  if (activeRecords.length === 0) {
    return state;
  }
  const nextEntry = {
    ...currentEntry,
  };
  activeRecords.forEach(({ recordKey }) => {
    delete nextEntry[recordKey];
  });
  if (!hasAnySourceRecord(nextEntry)) {
    const nextTypeRegistry = {
      ...typeRegistry,
    };
    delete nextTypeRegistry[key];
    return {
      ...state,
      [type]: nextTypeRegistry,
    };
  }
  return {
    ...state,
    [type]: {
      ...typeRegistry,
      [key]: nextEntry,
    },
  };
}
function getResolverKind(type) {
  return REGISTRY_RESOLVERS[type] || "priority";
}
function mergeNavValues(values) {
  return values.reduce((acc, value) => {
    const next = {
      ...acc,
      ...value,
    };
    if (isObject(acc.style) && isObject(value.style)) {
      next.style = {
        ...acc.style,
        ...value.style,
      };
      ["card", "icon", "title", "description"].forEach((field) => {
        if (isObject(acc.style[field]) && isObject(value.style[field])) {
          next.style[field] = {
            ...acc.style[field],
            ...value.style[field],
          };
        }
      });
    }
    return next;
  }, {});
}
export function resolveEntryValue(type, entry, scope = null) {
  if (!entry) return undefined;
  const activeRecords = Object.entries(entry)
    .map(([source, rawRecord]) => toSourceRecord(rawRecord, source))
    .filter((record) => record && (scope === null || record.scope === scope));
  if (activeRecords.length === 0) return undefined;
  if (getResolverKind(type) === "merge") {
    const sortedRecords = [...activeRecords].sort(compareRecords);
    const mergeCandidate = sortedRecords.every((record) =>
      isObject(record.value),
    );
    if (mergeCandidate) {
      return type === REGISTRY_TYPES.NAV
        ? mergeNavValues(sortedRecords.map((record) => record.value))
        : sortedRecords.reduce(
            (acc, record) => ({
              ...acc,
              ...record.value,
            }),
            {},
          );
    }
    return sortedRecords[sortedRecords.length - 1].value;
  }
  let winner = activeRecords[0];
  for (let index = 1; index < activeRecords.length; index += 1) {
    const current = activeRecords[index];
    if (compareRecords(current, winner) > 0) {
      winner = current;
    }
  }
  return winner.value;
}
export function createResolverCache() {
  const entryCache = new WeakMap();
  return (type, entry, scope = null) => {
    if (!entry || typeof entry !== "object") {
      return resolveEntryValue(type, entry, scope);
    }
    let typeCache = entryCache.get(entry);
    if (!typeCache) {
      typeCache = new Map();
      entryCache.set(entry, typeCache);
    }
    const cacheKey = JSON.stringify([type, scope]);
    if (typeCache.has(cacheKey)) return typeCache.get(cacheKey);
    const value = resolveEntryValue(type, entry, scope);
    typeCache.set(cacheKey, value);
    return value;
  };
}
export function createRegisterOperation(
  type,
  key,
  item,
  sourceOrOptions,
  optionsArg,
  timestamp,
  sequence = timestamp,
) {
  const { source, options } = resolveRegisterInput(sourceOrOptions, optionsArg);
  const normalizedKey = typeof key === "string" ? key.trim() : key;
  const instanceId = resolveInstanceId(options);
  const priority = resolveRecordPriority(options, source);
  const scope = resolveScope(options);
  const record = buildSourceRecord({
    source,
    value: item,
    instanceId,
    priority,
    scope,
    timestamp,
    sequence,
  });
  return {
    kind: "register",
    validation: options.validation,
    source,
    scope,
    record,
    instanceId,
    type,
    key: normalizedKey,
  };
}
export function createUnregisterOperation(type, key, sourceOrOptions) {
  const { scope, source, instanceId } = resolveUnregisterInput(sourceOrOptions);
  return {
    kind: "unregister",
    instanceId,
    scope,
    source,
    type,
    key: typeof key === "string" ? key.trim() : key,
  };
}
export function isValidRegistryTarget(type, key) {
  return validateRegistryKey(type, key).valid;
}
export function applyOperation(state, operation) {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) {
    return state;
  }
  if (operation.kind === "register") {
    return setSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.record,
    );
  }
  if (operation.kind === "unregister") {
    return removeSourceRecord(
      state,
      operation.type,
      operation.key,
      operation.source,
      operation.instanceId,
      operation.scope,
    );
  }
  return state;
}
export function hasOperationEffect(state, operation) {
  if (!isValidRegistryTarget(operation?.type, operation?.key)) {
    return false;
  }
  if (operation.kind === "register") {
    const currentRecord = getSourceRecord(
      state[operation.type]?.[operation.key],
      operation.source,
      operation.instanceId,
      operation.scope,
    );
    return hasRecordChanged(currentRecord, operation.record);
  }
  if (operation.kind === "unregister") {
    const entry = state[operation.type]?.[operation.key];
    if (
      typeof operation.instanceId === "string" &&
      operation.instanceId.length > 0
    ) {
      return Boolean(
        operation.scope === null
          ? getSourceRecords(entry, operation.source).some(
              ({ record }) => record.instanceId === operation.instanceId,
            )
          : getSourceRecord(
              entry,
              operation.source,
              operation.instanceId,
              operation.scope,
            ),
      );
    }
    return (
      getSourceRecords(entry, operation.source, operation.scope).length > 0
    );
  }
  return false;
}
export function resolveEffectiveOperations(state, operations) {
  const effectiveOperations = [];
  let nextState = state;
  operations.forEach((operation) => {
    if (!hasOperationEffect(nextState, operation)) return;
    effectiveOperations.push(operation);
    nextState = applyOperation(nextState, operation);
  });
  return {
    effectiveOperations,
    nextState,
  };
}
export function runScopedBatch(batch, executor, createScopedQueue) {
  if (typeof executor !== "function") {
    return 0;
  }
  return batch((queue) => {
    executor(createScopedQueue(queue));
  });
}
