/**
 * Business-rule verification for 内職管理システム.
 * Run: node scripts/verify.mjs
 * Does not push to git or any external service.
 */

import { readFileSync } from "node:fs";
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

console.log("\n6. 管理者パスワード");
const { validatePasswordChange, MIN_ADMIN_PASSWORD_LENGTH, MAX_ADMIN_PASSWORD_LENGTH } =
  await import("../src/lib/adminPasswordPolicy.ts");
const { hashPassword, verifyPassword, passwordMatchesStoredOrEnv } = await import(
  "../src/lib/adminPasswordHash.ts"
);
const { stripAdminAuth, mergeStoredFile } = await import("../src/lib/adminAuthRecord.ts");

assert(
  validatePasswordChange({
    currentPassword: "",
    newPassword: "abcdefgh",
    confirmPassword: "abcdefgh",
  }) != null,
  "現在のパスワード未入力を拒否"
);
assert(
  validatePasswordChange({
    currentPassword: "old-password",
    newPassword: "short",
    confirmPassword: "short",
  }) != null,
  "8文字未満を拒否"
);
assert(
  validatePasswordChange({
    currentPassword: "old-password",
    newPassword: "new-password",
    confirmPassword: "other-password",
  }) != null,
  "確認不一致を拒否"
);
assert(
  validatePasswordChange({
    currentPassword: "same-password",
    newPassword: "same-password",
    confirmPassword: "same-password",
  }) != null,
  "現在と同じパスワードを拒否"
);
assert(
  validatePasswordChange({
    currentPassword: "old-password",
    newPassword: "new-password",
    confirmPassword: "new-password",
  }) == null,
  "条件を満たす変更は許可"
);

const hash = await hashPassword("new-password");
assert(hash.startsWith("scrypt$"), "scrypt 形式で保存");
assert(!hash.includes("new-password"), "ハッシュに平文を含まない");
assert(await verifyPassword("new-password", hash), "正しいパスワードはハッシュと一致");
assert(!(await verifyPassword("old-password", hash)), "違うパスワードはハッシュと不一致");
assert(
  (await passwordMatchesStoredOrEnv("env-secret", null, "env-secret")) === "env",
  "未変更なら環境変数パスワードを許可"
);
assert(
  (await passwordMatchesStoredOrEnv("wrong", null, "env-secret")) === "reject",
  "未変更で違うパスワードは拒否"
);
assert(
  (await passwordMatchesStoredOrEnv("new-password", hash, "env-secret")) === "stored",
  "変更後は新しいパスワードを許可"
);
assert(
  (await passwordMatchesStoredOrEnv("env-secret", hash, "env-secret")) === "reject",
  "変更後は環境変数パスワードを拒否"
);
assert(
  (await passwordMatchesStoredOrEnv("new-password", null, "env-secret")) === "reject",
  "保存が消えたら変更後パスワードは使えず環境変数に戻る"
);
assert(
  (await passwordMatchesStoredOrEnv("env-secret", "not-a-hash", "env-secret")) === "reject",
  "壊れたハッシュでは環境変数に戻さない"
);

const seeded = createSeedData();
const published = stripAdminAuth({
  ...seeded,
  adminAuth: { passwordHash: hash, updatedAt: "2026-10-04T00:00:00.000Z" },
});
assert(!("adminAuth" in published), "公開データにパスワードハッシュを含めない");
assert(published.clients.length === seeded.clients.length, "公開データは業務データを残す");
const merged = mergeStoredFile(
  { ...seeded, adminAuth: { passwordHash: "attacker", updatedAt: "x" } },
  { passwordHash: "real-hash", updatedAt: "t" }
);
assert(merged.adminAuth?.passwordHash === "real-hash", "保存時は既存のハッシュを維持する");
const untouched = mergeStoredFile(seeded, null);
assert(!("adminAuth" in untouched), "未設定のときはハッシュを書かない");

console.log("\n7. 保存先の選択");
const { databaseUrl, storageKind, isPersistentStore, postgresDriver } = await import(
  "../src/lib/storageMode.ts"
);

assert(databaseUrl({}) == null, "環境変数が無ければデータベースURLは無い");
assert(databaseUrl({ DATABASE_URL: "  " }) == null, "空白の DATABASE_URL は無視");
assert(
  databaseUrl({ POSTGRES_URL: " postgres://local/db " }) === "postgres://local/db",
  "POSTGRES_URL の前後の空白を除く"
);
assert(
  databaseUrl({
    DATABASE_URL: "postgres://primary/db",
    POSTGRES_URL: "postgres://secondary/db",
  }) === "postgres://primary/db",
  "DATABASE_URL を POSTGRES_URL より先に使う"
);
assert(
  databaseUrl({ DATABASE_URL: "", POSTGRES_URL: "postgres://fallback/db" }) ===
    "postgres://fallback/db",
  "空の DATABASE_URL は POSTGRES_URL に戻る"
);
assert(storageKind({}) === "file", "URL が無ければファイル保存");
assert(
  storageKind({ DATABASE_URL: "postgres://db/app" }) === "postgres",
  "DATABASE_URL があれば Postgres"
);
assert(
  storageKind({ POSTGRES_URL: "postgres://db/app" }) === "postgres",
  "POSTGRES_URL だけでも Postgres"
);
assert(isPersistentStore({}) === true, "ローカルのファイル保存は残る");
assert(isPersistentStore({ VERCEL: "1" }) === false, "Vercel のファイル保存は消える");
assert(
  isPersistentStore({ VERCEL: "1", DATABASE_URL: "postgres://db/app" }) === true,
  "Vercel でも Postgres なら残る"
);
assert(
  postgresDriver("postgresql://u:p@ep-abc.us-east-2.aws.neon.tech/neondb") === "neon-http",
  "Neon のホストは HTTP ドライバ"
);
assert(
  postgresDriver("postgres://naisyoku:naisyoku@127.0.0.1:5432/naisyoku") === "pg",
  "手元の Postgres は通常の接続"
);

console.log("\n8. 内職者マイページのパスワード");
const {
  validatePortalLoginId,
  validatePortalPassword,
  portalLoginState,
  MIN_PORTAL_PASSWORD_LENGTH,
  MAX_PORTAL_PASSWORD_LENGTH,
} = await import("../src/lib/portalPasswordPolicy.ts");
assert(
  MIN_PORTAL_PASSWORD_LENGTH === MIN_ADMIN_PASSWORD_LENGTH &&
    MAX_PORTAL_PASSWORD_LENGTH === MAX_ADMIN_PASSWORD_LENGTH,
  "マイページ用パスワードの文字数は管理者と同じ"
);
const { PORTAL_ACCOUNTS, defaultLoginIdForStaff } = await import("../src/lib/portalAuth.ts");

assert(validatePortalLoginId("  ") != null, "空のログインIDを拒否");
assert(validatePortalLoginId("ab") != null, "短すぎるログインIDを拒否");
assert(validatePortalLoginId("sato 001") != null, "空白を含むログインIDを拒否");
assert(validatePortalLoginId("sato001") == null, "見本のログインIDは許可");
assert(validatePortalPassword("") != null, "空のマイページ用パスワードを拒否");
assert(validatePortalPassword("short") != null, "8文字未満のマイページ用パスワードを拒否");
assert(validatePortalPassword("pass1234") == null, "8文字のマイページ用パスワードは許可");
assert(portalLoginState(false, false) === "unset", "未設定はログインできない");
assert(portalLoginState(true, false) === "reject", "違うパスワードは拒否");
assert(portalLoginState(true, true) === "ok", "正しいパスワードは許可");
assert(defaultLoginIdForStaff("stf_sato") === "sato001", "見本の佐藤さんにログインIDを付ける");
assert(defaultLoginIdForStaff("stf_unknown") === "", "不明な内職者のログインIDは空");

for (const account of PORTAL_ACCOUNTS) {
  const person = seeded.staff.find((item) => item.id === account.staffId);
  assert(person?.loginId === account.loginId, `${account.loginId} が見本データにある`);
  assert(account.password.length >= 8, `${account.loginId} の見本パスワードは8文字以上`);
}

const sampleHash = await hashPassword("pass1234");
assert(sampleHash.startsWith("scrypt$"), "見本パスワードも scrypt");
assert(!sampleHash.includes("pass1234"), "見本パスワードのハッシュに平文を含まない");

const hiddenPortal = stripAdminAuth({
  ...seeded,
  adminAuth: { passwordHash: hash, updatedAt: "2026-10-04T00:00:00.000Z" },
  portalAuth: {
    stf_sato: { passwordHash: sampleHash, updatedAt: "2026-10-04T00:00:00.000Z" },
  },
});
assert(!("portalAuth" in hiddenPortal), "公開データに内職者パスワードを含めない");
assert(!("adminAuth" in hiddenPortal), "公開データに管理者パスワードを含めない");
assert(!JSON.stringify(hiddenPortal).includes(sampleHash), "公開データにハッシュ文字列を含めない");

const keptPortal = mergeStoredFile(
  {
    ...seeded,
    portalAuth: { stf_sato: { passwordHash: "attacker", updatedAt: "x" } },
  },
  { passwordHash: "real-hash", updatedAt: "t" },
  { stf_sato: { passwordHash: "real-portal", updatedAt: "t" } }
);
assert(
  keptPortal.portalAuth?.stf_sato.passwordHash === "real-portal",
  "保存時は内職者の既存ハッシュを維持する"
);
assert(keptPortal.adminAuth?.passwordHash === "real-hash", "内職者パスワード保存でも管理者ハッシュを維持する");

const droppedAttack = mergeStoredFile(
  {
    ...seeded,
    portalAuth: { stf_sato: { passwordHash: "attacker", updatedAt: "x" } },
  },
  null
);
assert(!("portalAuth" in droppedAttack), "業務データの保存だけでは内職者パスワードを書き込まない");

console.log("\n9. 請求書の印刷");
const invoiceSource = readFileSync(
  new URL("../src/app/print/invoice/[id]/page.tsx", import.meta.url),
  "utf8"
);
const printShellSource = readFileSync(
  new URL("../src/components/PrintShell.tsx", import.meta.url),
  "utf8"
);
assert(
  invoiceSource.includes("振込にかかる手数料は差し引かずお願いいたします"),
  "振込手数料の案内は指定の文面"
);
assert(
  !invoiceSource.includes("振込かかる手数料は"),
  "古い振込手数料の文面は使わない"
);
assert(invoiceSource.includes("text-[1.75rem]"), "振込先は本文より大きい文字");
assert(invoiceSource.includes("bleed"), "請求書は余白ゼロの印刷を使う");
assert(printShellSource.includes('margin: ${bleed ? "0" : "12mm"}'), "印刷余白ゼロでブラウザの見出しを消す");
assert(printShellSource.includes("padding: 14mm 16mm"), "用紙の余白は中身の余白として残す");

console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
