import { diffRow, mergeRows, EMPTY, type Row } from "../apps/web/lib/sheet-merge";
let pass = 0, fail = 0;
const t = (n: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "  ok " : "  FAIL"} ${n}${c ? "" : "  " + x}`); };
const J = JSON.stringify;
const mk = (rows: Row[], labels: Record<string, string>) => ({ sh: { baseRows: rows.slice(), baseLabels: { ...labels } }, city: { rows: rows.slice(), labels: { ...labels } } });

{ // untouched row takes the server's cells and label
  const { sh, city } = mk([{ a: "1" }], {});
  const m = mergeRows(sh, city, [{ row: 0, cells: { a: "2", b: "x" }, label: "interested" }]);
  t("clean row takes server cells + label", J(m.rows[0]) === J({ a: "2", b: "x" }) && m.labels["0"] === "interested" && m.changed);
}
{ // a typed cell stays mine, the rest follows the server
  const { sh, city } = mk([{ a: "1", b: "1" }], {});
  city.rows[0] = { a: "mine", b: "1" };
  const m = mergeRows(sh, city, [{ row: 0, cells: { a: "theirs", b: "2", c: "3" }, label: null }]);
  t("my edit survives, others' edits merge", J(m.rows[0]) === J({ a: "mine", b: "2", c: "3" }), J(m.rows[0]));
  t("the base now matches the server (so only my cell is sent later)", J(diffRow(m.rows[0], sh.baseRows[0])) === J({ set: { a: "mine" } }), J(diffRow(m.rows[0], sh.baseRows[0])));
}
{ // a cell I cleared stays cleared
  const { sh, city } = mk([{ a: "1", b: "1" }], {});
  city.rows[0] = { b: "1" };
  const m = mergeRows(sh, city, [{ row: 0, cells: { a: "1", b: "9" }, label: null }]);
  t("my cleared cell stays cleared", J(m.rows[0]) === J({ b: "9" }), J(m.rows[0]));
  t("and is still sent as an unset", J(diffRow(m.rows[0], sh.baseRows[0])) === J({ unset: ["a"] }));
}
{ // label: mine wins when I changed it, theirs when I didn't
  const a = mk([{ a: "1" }, { a: "2" }], { "0": "x" });
  a.city.labels["0"] = "mine";
  const m = mergeRows(a.sh, a.city, [{ row: 0, cells: { a: "1" }, label: "theirs" }, { row: 1, cells: { a: "2" }, label: "theirs2" }]);
  t("my unsaved label wins", m.labels["0"] === "mine");
  t("an untouched row takes their label", m.labels["1"] === "theirs2");
  t("my label is still pending (base is theirs)", a.sh.baseLabels["0"] === "theirs");
}
{ // a label they removed
  const { sh, city } = mk([{ a: "1" }], { "0": "x" });
  const m = mergeRows(sh, city, [{ row: 0, cells: { a: "1" }, label: null }]);
  t("a label removed by a teammate disappears", m.labels["0"] === undefined && m.changed);
}
{ // I'm typing a new row that a teammate/scrape just filled
  const { sh, city } = mk([{ a: "1" }], {});
  city.rows[1] = { a: "mine" };
  const m = mergeRows(sh, city, [{ row: 1, cells: { a: "theirs", z: "9" }, label: null }]);
  t("their data keeps the row", J(m.rows[1]) === J({ a: "theirs", z: "9" }), J(m.rows));
  t("my typing moves to the next free row", J(m.rows[2]) === J({ a: "mine" }) && m.rows.length === 3, J(m.rows));
  t("that row is new to the server (base empty), so it is sent as new", J(sh.baseRows[2] ?? EMPTY) === "{}");
  t("the row I left is clean again", J(diffRow(m.rows[1], sh.baseRows[1])) === "{}");
}
{ // a label on a blank row that a scrape then filled
  const { sh, city } = mk([{ a: "1" }], {});
  city.labels["1"] = "interested";
  const m = mergeRows(sh, city, [{ row: 1, cells: { a: "scraped" }, label: null }]);
  t("a label meant for a blank row does not land on the scraped lead", m.labels["1"] === undefined && m.labels["2"] === "interested", J(m.labels));
}
{ // echo of my own save changes nothing
  const rows = [{ a: "1" }];
  const { sh, city } = mk(rows, {});
  city.rows[0] = { a: "1" };
  const m = mergeRows(sh, city, [{ row: 0, cells: { a: "1" }, label: null }]);
  t("echo of my own save is not a change (undo history is kept)", !m.changed);
}
{ // a teammate emptied a row
  const { sh, city } = mk([{ a: "1" }, { a: "2" }], {});
  const m = mergeRows(sh, city, [{ row: 0, cells: {}, label: null }]);
  t("an emptied row empties here too", J(m.rows[0]) === "{}" && m.changed && J(m.rows[1]) === J({ a: "2" }));
}
{ // rows beyond what I have
  const { sh, city } = mk([{ a: "1" }], {});
  const m = mergeRows(sh, city, [{ row: 4, cells: { a: "far" }, label: null }]);
  t("far-away rows extend the sheet, gaps are empty", m.rows.length === 5 && J(m.rows[2]) === "{}" && m.rows[4].a === "far");
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
