#!/usr/bin/env python3
# Reads a toy-database file and opens an HTML view of its table, columns and rows.
# The layout mirrors src/sqliteInt.h; usage: python3 tools/visual.py [file.db]
import html
import struct
import sys
import tempfile
import webbrowser
from pathlib import Path

# ---- same arithmetic as sqliteInt.h ----------------------------------------
PAGE_SIZE = 4096
ID_SIZE = 4
USERNAME_SIZE = 32 + 1
EMAIL_SIZE = 255 + 1
ID_OFFSET = 0
USERNAME_OFFSET = ID_OFFSET + ID_SIZE
EMAIL_OFFSET = USERNAME_OFFSET + USERNAME_SIZE
ROW_SIZE = ID_SIZE + USERNAME_SIZE + EMAIL_SIZE
ROWS_PER_PAGE = PAGE_SIZE // ROW_SIZE

COLUMNS = [
    ("id", "u32", ID_OFFSET, ID_SIZE),
    ("username", f"char[{USERNAME_SIZE}]", USERNAME_OFFSET, USERNAME_SIZE),
    ("email", f"char[{EMAIL_SIZE}]", EMAIL_OFFSET, EMAIL_SIZE),
]


def cstr(b):
    return b.split(b"\0", 1)[0].decode("utf-8", "replace")


def read_rows(data):
    # Same row count as main.c: full pages hold ROWS_PER_PAGE rows, the last one is partial.
    n_rows = (len(data) // PAGE_SIZE) * ROWS_PER_PAGE + (len(data) % PAGE_SIZE) // ROW_SIZE
    for i in range(n_rows):
        page, slot = divmod(i, ROWS_PER_PAGE)
        off = page * PAGE_SIZE + slot * ROW_SIZE
        raw = data[off:off + ROW_SIZE]
        (row_id,) = struct.unpack_from("<I", raw, ID_OFFSET)
        username = cstr(raw[USERNAME_OFFSET:USERNAME_OFFSET + USERNAME_SIZE])
        email = cstr(raw[EMAIL_OFFSET:EMAIL_OFFSET + EMAIL_SIZE])
        yield page, slot, off, (row_id, username, email)


def render(path, data):
    rows = list(read_rows(data))
    e = html.escape
    head = "".join(
        f"<th>{e(name)}<small>{e(typ)} · +{off}</small></th>" for name, typ, off, _ in COLUMNS
    )
    body = "".join(
        f"<tr><td class=meta>{page}</td><td class=meta>{slot}</td><td class=meta>{off}</td>"
        + "".join(f"<td>{e(str(v))}</td>" for v in values)
        + "</tr>"
        for page, slot, off, values in rows
    ) or f"<tr><td colspan={3 + len(COLUMNS)} class=empty>No rows</td></tr>"
    n_pages = -(-len(data) // PAGE_SIZE)
    return f"""<!doctype html>
<meta charset=utf-8>
<title>{e(path.name)}</title>
<style>
  :root {{ --bg:#fff; --fg:#1a1a1a; --mute:#777; --line:#e3e3e3; --head:#f5f5f5; }}
  @media (prefers-color-scheme: dark) {{
    :root {{ --bg:#161616; --fg:#eaeaea; --mute:#8a8a8a; --line:#2c2c2c; --head:#1f1f1f; }}
  }}
  body {{ background:var(--bg); color:var(--fg); font:14px/1.5 ui-monospace,Menlo,monospace; margin:24px 16px; }}
  h1 {{ font-size:18px; margin:0 0 4px; }}
  p {{ color:var(--mute); margin:0 0 16px; }}
  .wrap {{ overflow-x:auto; }}
  table {{ border-collapse:collapse; min-width:100%; }}
  th, td {{ border:1px solid var(--line); padding:6px 10px; text-align:left; white-space:nowrap; }}
  th {{ background:var(--head); position:sticky; top:0; }}
  th small {{ display:block; color:var(--mute); font-weight:normal; }}
  .meta, .empty {{ color:var(--mute); }}
</style>
<h1>table: users</h1>
<p>{e(str(path))} · {len(data)} bytes · {n_pages} page(s) · {len(rows)} row(s) · {ROW_SIZE} B/row · {ROWS_PER_PAGE} rows/page</p>
<div class=wrap><table>
<thead><tr><th>page</th><th>slot</th><th>offset</th>{head}</tr></thead>
<tbody>{body}</tbody>
</table></div>
"""


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "test.db").resolve()
    if not path.exists():
        sys.exit(f"{path}: no such file")
    out = Path(tempfile.gettempdir()) / f"{path.stem}-visual.html"
    out.write_text(render(path, path.read_bytes()))
    print(out)
    webbrowser.open(out.as_uri())


if __name__ == "__main__":
    main()
