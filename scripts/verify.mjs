/**
 * Business-rule verification for 内職管理システム.
 * Run: node scripts/verify.mjs
 * Does not push to git or any external service.
 */

import { createSeedData } from "../src/lib/seed.ts";
import {
  invoiceDetail,
  issueInvoice,
  paymentLines,
  remainingDeliverQty,
  remainingShipQty,
  staffPaymentSummary,
  unbilledDeliveries,
  validateArriveQty,
  validateDeliverQty,
  validateShipQty,
} from "../src/lib/business.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("\n=== 内職管理システム 検証 ===\n");

// --- Seed integrity ---
console.log("1. シードデータの整合性");
let data = createSeedData();
assert(data.clients.length >= 2, "顧客が2件以上ある");
assert(data.staff.length >= 2, "内職者が2件以上ある");
assert(
  data.deliveries.every((d) => data.clients.some((c) => c.id === d.clientId)),
  "全納品が有効な顧客に紐づく"
);
assert(
  data.assignments.every((a) => data.staff.some((s) => s.id === a.staffId)),
  "全出荷が有効な内職者に紐づく"
);

// --- Client invoice isolation ---
console.log("\n2. 顧客請求の混同防止");
const clientA = "cli_sample";
const clientB = "cli_test";

const unbilledA = unbilledDeliveries(data, { clientId: clientA, yearMonth: "2026-04" });
assert(
  unbilledA.every((d) => d.clientId === clientA),
  "顧客Aの未請求は顧客Aのみ"
);
assert(
  !unbilledA.some((d) => d.clientId === clientB),
  "顧客Aの未請求に顧客Bが含まれない"
);

const resultA = issueInvoice(data, clientA, "2026-04");
assert(!("error" in resultA), "顧客Aの請求書を発行できる");
if (!("error" in resultA)) {
  data = resultA.data;
  const detail = invoiceDetail(data, resultA.invoice.id);
  assert(detail != null, "請求書詳細を取得できる");
  assert(detail.mixedClientError === false, "請求書に顧客混同なし");
  assert(
    detail.lines.every((l) => {
      const d = data.deliveries.find((x) => x.id === l.deliveryId);
      return d?.clientId === clientA;
    }),
    "請求明細はすべて顧客Aの納品"
  );
  assert(
    detail.invoice.subtotal ===
      detail.lines.reduce((s, l) => s + l.amount, 0),
    "請求小計が明細合計と一致"
  );
  // Expected: only April delivery for sample (2000 * 10 = 20000)
  assert(detail.invoice.subtotal === 20000, `顧客A 4月小計=20000 (actual ${detail.invoice.subtotal})`);
}

const resultB = issueInvoice(data, clientB, "2026-04");
assert(!("error" in resultB), "顧客Bの請求書を発行できる");
if (!("error" in resultB)) {
  data = resultB.data;
  const detailB = invoiceDetail(data, resultB.invoice.id);
  assert(detailB.mixedClientError === false, "顧客B請求書に混同なし");
  assert(
    detailB.lines.every((l) => {
      const d = data.deliveries.find((x) => x.id === l.deliveryId);
      return d?.clientId === clientB;
    }),
    "顧客B明細は顧客Bのみ"
  );
  assert(detailB.invoice.subtotal === 5000, `顧客B 4月小計=5000 (actual ${detailB.invoice.subtotal})`);
  // A invoice must not include B lines
  const detailA2 = invoiceDetail(data, resultA.invoice.id);
  assert(
    !detailA2.lines.some((l) => {
      const d = data.deliveries.find((x) => x.id === l.deliveryId);
      return d?.clientId === clientB;
    }),
    "顧客A請求書に顧客B明細が混入していない"
  );
}

const dup = issueInvoice(data, clientA, "2026-04");
assert("error" in dup, "同一顧客・同一月の二重発行を拒否");

// --- Staff payment isolation ---
console.log("\n3. 内職者支払の混同防止");
data = createSeedData(); // reset for payment tests
const staffSato = "stf_sato";
const staffTanaka = "stf_tanaka";
const staffNeko = "stf_neko";

const satoLines = paymentLines(data, { staffId: staffSato, yearMonth: "2026-04" });
assert(
  satoLines.every((l) => l.staffId === staffSato),
  "佐藤の明細は佐藤のみ"
);
assert(
  !satoLines.some((l) => l.staffId === staffTanaka || l.staffId === staffNeko),
  "佐藤の明細に他者が含まれない"
);
// Sato: envelope 980*6=5880, seal 500*3=1500 => 7380
const satoTotal = satoLines.reduce((s, l) => s + l.amount, 0);
assert(satoTotal === 7380, `佐藤4月報酬=7380 (actual ${satoTotal})`);

const tanakaLines = paymentLines(data, {
  staffId: staffTanaka,
  yearMonth: "2026-04",
});
const tanakaTotal = tanakaLines.reduce((s, l) => s + l.amount, 0);
// Tanaka: pack 700*9=6300 (env not arrived)
assert(tanakaTotal === 6300, `田中4月報酬=6300 (actual ${tanakaTotal})`);
assert(
  tanakaLines.every((l) => l.staffId === staffTanaka),
  "田中の明細は田中のみ"
);

const nekoLines = paymentLines(data, { staffId: staffNeko, yearMonth: "2026-04" });
const nekoTotal = nekoLines.reduce((s, l) => s + l.amount, 0);
// Neko: seal 2000*3=6000
assert(nekoTotal === 6000, `猫の手4月報酬=6000 (actual ${nekoTotal})`);

const summary = staffPaymentSummary(data, "2026-04");
const satoRow = summary.find((r) => r.staffId === staffSato);
const tanakaRow = summary.find((r) => r.staffId === staffTanaka);
assert(satoRow?.totalAmount === 7380, "一覧表の佐藤合計が一致");
assert(tanakaRow?.totalAmount === 6300, "一覧表の田中合計が一致");
assert(
  summary.every((r) => r.lines.every((l) => l.staffId === r.staffId)),
  "一覧表の各行明細が本人のみ"
);

// Pending arrival must not appear in payment
assert(
  !satoLines.some((l) => l.assignmentId === "asn_tanaka_env"),
  "未入荷の出荷は支払に含まれない"
);
assert(
  !tanakaLines.some((l) => l.assignmentId === "asn_tanaka_env"),
  "田中の未入荷出荷は支払に含まれない"
);

// --- Cross-check invoice vs delivery clientId denormalization ---
console.log("\n4. 納品の clientId 整合");
data = createSeedData();
for (const d of data.deliveries) {
  const project = data.projects.find((p) => p.id === d.projectId);
  assert(
    project != null && project.clientId === d.clientId,
    `納品 ${d.id} の clientId が案件と一致`
  );
}

// --- Quantity guards ---
console.log("\n5. 出荷・納品・入荷の数量制限");
data = createSeedData();
const envRemain = remainingShipQty(data, "prj_envelope");
// order 10000, shipped 1000+800 = 1800, remain 8200
assert(envRemain === 8200, `封筒案件の出荷残=8200 (actual ${envRemain})`);
assert(
  validateShipQty(data, "prj_envelope", 8201) != null,
  "出荷残を超える出荷を拒否"
);
assert(validateShipQty(data, "prj_envelope", 100) == null, "出荷残以内は許可");
assert(
  validateShipQty(data, "prj_envelope", 0) != null,
  "出荷数0を拒否"
);

const delivRemain = remainingDeliverQty(data, "prj_envelope");
// delivered 5000+2000 = 7000, remain 3000
assert(delivRemain === 3000, `封筒案件の納品残=3000 (actual ${delivRemain})`);
assert(
  validateDeliverQty(data, "prj_envelope", 3001) != null,
  "納品残を超える納品を拒否"
);
assert(validateDeliverQty(data, "prj_envelope", 3000) == null, "納品残ちょうどは許可");

const pendingAsn = data.assignments.find((a) => a.id === "asn_tanaka_env");
assert(
  validateArriveQty(pendingAsn, 801) != null,
  "出荷数を超える入荷を拒否"
);
assert(validateArriveQty(pendingAsn, 800) == null, "出荷数と同じ入荷は許可");
assert(validateArriveQty(pendingAsn, 780) == null, "欠品入荷は許可");

console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
