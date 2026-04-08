"""
File-backed JSON store that implements the same interface as Azure Cosmos DB
ContainerProxy, allowing the app to run entirely locally without any cloud
dependency.

Each "container" is persisted as a JSON file under the configured data
directory (default: ``./data``).
"""

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Exceptions (mimic azure.cosmos.exceptions)
# ---------------------------------------------------------------------------

class CosmosResourceExistsError(Exception):
    """Raised when an item with the same id already exists."""

    def __init__(self, message: str = "", **kwargs: Any):
        super().__init__(message)


# ---------------------------------------------------------------------------
# Mini SQL engine for Cosmos-SQL subset
# ---------------------------------------------------------------------------

_COMPARISON_OPS = {
    "=": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    "<": lambda a, b: a is not None and b is not None and a < b,
    "<=": lambda a, b: a is not None and b is not None and a <= b,
    ">": lambda a, b: a is not None and b is not None and a > b,
    ">=": lambda a, b: a is not None and b is not None and a >= b,
}


def _resolve_params(params_list: list[dict] | None) -> dict[str, Any]:
    if not params_list:
        return {}
    return {p["name"]: p["value"] for p in params_list}


def _get_field(doc: dict, field_expr: str) -> Any:
    """Resolve ``c.field`` or ``c.nested.field`` to a value."""
    path = field_expr
    if path.startswith("c."):
        path = path[2:]
    parts = path.split(".")
    current: Any = doc
    for p in parts:
        if isinstance(current, dict):
            current = current.get(p)
        else:
            return None
    return current


def _match_condition(doc: dict, cond: str, params: dict) -> bool:
    """Evaluate a single WHERE condition against *doc*."""
    cond = cond.strip()

    # CONTAINS(LOWER(c.field), LOWER(@param))
    m = re.match(
        r"CONTAINS\s*\(\s*LOWER\s*\(\s*(c\.\w+)\s*\)\s*,\s*LOWER\s*\(\s*(@\w+)\s*\)\s*\)",
        cond,
        re.IGNORECASE,
    )
    if m:
        val = _get_field(doc, m.group(1))
        search = params.get(m.group(2), "")
        return isinstance(val, str) and search.lower() in val.lower()

    # c.field != null  /  c.field = null
    m = re.match(r"(c\.[\w.]+)\s*(!=|=)\s*null", cond, re.IGNORECASE)
    if m:
        val = _get_field(doc, m.group(1))
        if m.group(2) == "!=":
            return val is not None
        return val is None

    # 1=1 (always true)
    if cond.strip() == "1=1":
        return True

    # c.field OP @param  or  c.field OP 'literal'
    m = re.match(r"(c\.[\w.]+)\s*(!=|<=|>=|<|>|=)\s*(@\w+|'[^']*')", cond)
    if m:
        val = _get_field(doc, m.group(1))
        op = m.group(2)
        rhs_raw = m.group(3)
        if rhs_raw.startswith("@"):
            rhs = params.get(rhs_raw)
        else:
            rhs = rhs_raw.strip("'")
        return _COMPARISON_OPS[op](val, rhs)

    # Unrecognised condition – treat as true (safe fallback)
    logger.debug(f"Unrecognised condition, treating as true: {cond}")
    return True


def _evaluate_where(doc: dict, where_str: str, params: dict) -> bool:
    """Evaluate a full WHERE clause (AND-separated conditions)."""
    parts = re.split(r"\s+AND\s+", where_str, flags=re.IGNORECASE)
    return all(_match_condition(doc, p, params) for p in parts)


def _parse_query(
    data: list[dict],
    query: str,
    params_list: list[dict] | None = None,
    max_item_count: int | None = None,
) -> list[dict]:
    """Execute a Cosmos-SQL-subset query against an in-memory list."""
    params = _resolve_params(params_list)
    q = query.strip()

    # ── SELECT VALUE COUNT(1) ──
    if re.match(r"SELECT\s+VALUE\s+COUNT\s*\(\s*1\s*\)", q, re.IGNORECASE):
        where_m = re.search(r"WHERE\s+(.+)", q, re.IGNORECASE)
        if where_m:
            filtered = [d for d in data if _evaluate_where(d, where_m.group(1), params)]
        else:
            filtered = data
        return [len(filtered)]

    # ── SELECT field, COUNT(1) as alias FROM c GROUP BY field ──
    gm = re.search(r"GROUP\s+BY\s+(c\.[\w.]+)", q, re.IGNORECASE)
    if gm:
        group_field = gm.group(1)
        where_m = re.search(r"WHERE\s+(.+?)(?:\s+GROUP\s+BY)", q, re.IGNORECASE)
        filtered = data
        if where_m:
            filtered = [d for d in data if _evaluate_where(d, where_m.group(1), params)]
        groups: dict[Any, int] = {}
        for d in filtered:
            key = _get_field(d, group_field)
            groups[key] = groups.get(key, 0) + 1
        field_name = group_field[2:]  # strip "c."
        return [{field_name: k, "count": v} for k, v in groups.items()]

    # ── DISTINCT ──
    distinct = bool(re.match(r"SELECT\s+DISTINCT\s+", q, re.IGNORECASE))

    # ── Parse SELECT fields ──
    sel_m = re.match(r"SELECT\s+(TOP\s+\d+\s+)?(DISTINCT\s+)?(.*?)\s+FROM\s+c", q, re.IGNORECASE | re.DOTALL)
    select_fields: list[str] | None = None
    top_n: int | None = None
    if sel_m:
        top_part = sel_m.group(1)
        if top_part:
            top_n = int(re.search(r"\d+", top_part).group())  # type: ignore[union-attr]
        fields_raw = sel_m.group(3).strip()
        if fields_raw != "*":
            select_fields = []
            for f in fields_raw.split(","):
                f = f.strip()
                if f.startswith("c."):
                    f = f[2:]
                select_fields.append(f)

    # ── WHERE ──
    where_m = re.search(r"WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+OFFSET|\s+GROUP\s+BY|$)", q, re.IGNORECASE | re.DOTALL)
    filtered = data
    if where_m:
        where_str = where_m.group(1).strip()
        filtered = [d for d in data if _evaluate_where(d, where_str, params)]

    # ── ORDER BY ──
    order_m = re.search(r"ORDER\s+BY\s+(c\.[\w.]+)\s*(ASC|DESC)?", q, re.IGNORECASE)
    if order_m:
        order_field = order_m.group(1)
        descending = (order_m.group(2) or "ASC").upper() == "DESC"
        filtered.sort(
            key=lambda d: (_get_field(d, order_field) is None, _get_field(d, order_field) or ""),
            reverse=descending,
        )

    # ── OFFSET / LIMIT ──
    offset_m = re.search(r"OFFSET\s+(@?\w+)\s+LIMIT\s+(@?\w+)", q, re.IGNORECASE)
    if offset_m:
        off_raw, lim_raw = offset_m.group(1), offset_m.group(2)
        off = int(params.get(off_raw, off_raw))
        lim = int(params.get(lim_raw, lim_raw))
        filtered = filtered[off : off + lim]

    # ── TOP N ──
    if top_n is not None:
        filtered = filtered[:top_n]

    # ── max_item_count ──
    if max_item_count is not None:
        filtered = filtered[:max_item_count]

    # ── DISTINCT ──
    if distinct and select_fields:
        seen: set[str] = set()
        unique: list[dict] = []
        for d in filtered:
            proj = {f: _get_field(d, "c." + f if not f.startswith("c.") else f) or d.get(f) for f in select_fields}
            key = json.dumps(proj, sort_keys=True, default=str)
            if key not in seen:
                seen.add(key)
                unique.append(proj)
        return unique

    # ── Field projection ──
    if select_fields:
        filtered = [{f: d.get(f) for f in select_fields if f in d} for d in filtered]

    return filtered


# ---------------------------------------------------------------------------
# Local container proxy
# ---------------------------------------------------------------------------

class LocalContainerProxy:
    """Drop-in replacement for ``azure.cosmos.aio.ContainerProxy`` backed by a
    JSON file on disk."""

    def __init__(self, name: str, data_dir: str, partition_key_path: str):
        self.name = name
        self._data_dir = data_dir
        self._pk_path = partition_key_path
        self._pk_field = partition_key_path.lstrip("/")
        self._file = os.path.join(data_dir, f"{name}.json")
        self._data: list[dict] = []
        self._load()

    # -- persistence ---------------------------------------------------------

    def _load(self) -> None:
        if os.path.exists(self._file):
            with open(self._file, "r", encoding="utf-8") as fh:
                self._data = json.load(fh)
        else:
            self._data = []

    def _save(self) -> None:
        os.makedirs(self._data_dir, exist_ok=True)
        tmp = self._file + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(self._data, fh, indent=2, default=str)
        os.replace(tmp, self._file)

    # -- CRUD ----------------------------------------------------------------

    def _index_of(self, item_id: str) -> int:
        for i, d in enumerate(self._data):
            if d.get("id") == item_id:
                return i
        return -1

    async def create_item(self, body: dict, **kwargs: Any) -> dict:
        if self._index_of(body.get("id", "")) >= 0:
            raise CosmosResourceExistsError(message=f"Item '{body['id']}' already exists")
        self._data.append(body)
        self._save()
        return body

    async def upsert_item(self, body: dict, **kwargs: Any) -> dict:
        idx = self._index_of(body.get("id", ""))
        if idx >= 0:
            self._data[idx] = body
        else:
            self._data.append(body)
        self._save()
        return body

    async def read_item(self, item: str, partition_key: str, **kwargs: Any) -> dict:
        idx = self._index_of(item)
        if idx < 0:
            raise KeyError(f"Item '{item}' not found in '{self.name}'")
        return self._data[idx]

    async def delete_item(self, item: str, partition_key: str, **kwargs: Any) -> None:
        idx = self._index_of(item)
        if idx >= 0:
            self._data.pop(idx)
            self._save()

    # -- query ---------------------------------------------------------------

    def query_items(
        self,
        query: str,
        parameters: list[dict] | None = None,
        partition_key: str | None = None,
        max_item_count: int | None = None,
        **kwargs: Any,
    ) -> "_LocalQueryIterator":
        results = _parse_query(self._data, query, parameters, max_item_count)
        return _LocalQueryIterator(results)


class _LocalQueryIterator:
    """Async iterator over pre-computed query results."""

    def __init__(self, results: list) -> None:
        self._results = results
        self._idx = 0

    def __aiter__(self) -> "_LocalQueryIterator":
        return self

    async def __anext__(self) -> Any:
        if self._idx >= len(self._results):
            raise StopAsyncIteration
        val = self._results[self._idx]
        self._idx += 1
        return val


# ---------------------------------------------------------------------------
# Initialisation helper (mirrors init_cosmos)
# ---------------------------------------------------------------------------

CONTAINERS = {
    "items": "/partitionKey",
    "settings": "/settingType",
    "scan_history": "/status",
}


def init_local_containers(data_dir: str) -> dict[str, LocalContainerProxy]:
    """Create local container proxies for every container the app expects."""
    os.makedirs(data_dir, exist_ok=True)
    return {
        name: LocalContainerProxy(name, data_dir, pk_path)
        for name, pk_path in CONTAINERS.items()
    }
