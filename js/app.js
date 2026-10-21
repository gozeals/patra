'use strict';
/* ============================================================
   BOOT — menentukan halaman pertama dari URL (?id=KODE&aksi=kelola)
   ============================================================ */
function hideBoot() { const b = $('boot'); if (b) { b.classList.add('out'); setTimeout(function () { if (b.parentNode) b.remove(); }, 300); } }

/* Perbarui nomor WhatsApp admin tanpa merender ulang form yang sedang diisi */
function refreshHelp() { const el = document.querySelector('.help-pill'); if (el) el.outerHTML = helpPill(); }
function setWa(wa) { wa = wa || ''; if (wa !== S.wa) { S.wa = wa; lsSet('rnfc-wa', wa); refreshHelp(); } }

async function loadConfig() {
  const r = await apiGet({ action: 'config' });
  if (r && r.success && r.data) setWa(r.data.wa);
}
async function restoreSession() {
  let t = null; try { t = sessionStorage.getItem('rnfc-tok'); } catch (e) {}
  if (!t) return;
  const r = await rpc('staffBootstrap', [t]);               /* S.token masih kosong → tidak memicu "sesi berakhir" */
  if (!r.success) { try { sessionStorage.removeItem('rnfc-tok'); } catch (e) {} return; }
  if (S.view !== 'portal' && S.view !== 'login') return;
  S.token = t; applyBoot(r.data); startAuto();
  go(S.role === 'master' ? 'overview' : 'cards');
}

(async function boot() {
  if (!gasReady()) { go('setup'); hideBoot(); return; }

  if (!INIT.code) {                                         /* tanpa kode kartu → portal kelola */
    go('portal'); hideBoot();
    loadConfig(); restoreSession();
    return;
  }

  /* Dengan kode kartu: tampilkan perantara segera, data kartu sudah diminta lebih awal di <head> */
  go('resolving'); hideBoot();
  let r = window.__cardP ? await window.__cardP : null;
  if (!r || r.success === undefined) r = await apiGet({ action: 'card', id: INIT.code, log: INIT.aksi ? 0 : 1 });
  if (!r || !r.success) {
    INIT.error = (r && r.message) || 'Tidak dapat menghubungi server. Periksa koneksi Anda lalu coba pindai ulang.';
    go('info'); return;
  }
  INIT.card = r.data.card;
  setWa(r.data.waAdmin);
  const c = INIT.card;
  let v = 'info';
  if (c && c.status === 'terhubung') v = INIT.aksi === 'kelola' ? 'pin' : 'redirect';
  else if (c && c.status === 'belum_setup') v = 'register';
  if (v === 'pin') S.pin = { val: '', err: '', locked: false };
  go(v);
})();
window.addEventListener('offline', function () { toast('warn', 'Anda sedang offline', 'Perubahan akan gagal sampai koneksi kembali.'); });
