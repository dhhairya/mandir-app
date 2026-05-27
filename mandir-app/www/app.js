/* ── State ── */
let lang = 'en';
let donationType = 'donation';
let detectedFields = [];
let imageBase64 = '';
let lastReceiptHTML = '';
let receiptCounter = parseInt(localStorage.getItem('rcptCount') || '1');

const STORAGE_KEY = 'mandir-receipts-v2';

/* ── Storage (uses window.storage if available, else localStorage fallback) ── */
async function loadReceipts() {
  try {
    if (window.storage) {
      const r = await window.storage.get(STORAGE_KEY);
      return r && r.value ? JSON.parse(r.value) : [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveReceipts(arr) {
  try {
    if (window.storage) {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(arr));
      if (!result) showToast('Warning: could not save');
      return true;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    return true;
  } catch { showToast('Save error'); return false; }
}

/* ── Toast ── */
function showToast(msg) {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

/* ── Navigation ── */
function goTo(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (btn) btn.classList.add('active');
  if (page === 'dashboard') renderDash();
  if (page === 'history') renderHistory();
}

/* ── Translations ── */
const T = {
  en: {
    dTitle: 'Overview', dSub: 'All donations and memberships at a glance',
    btnNewReceipt: 'New Receipt', nrTitle: 'New Receipt', nrSub: 'Upload your template or fill in manually',
    stl0: 'Total Receipts', stl1: 'Total Collected', stl2: 'Donations', stl3: 'Memberships',
    recentTitle: 'Recent Receipts', viewAllBtn: 'View All →',
    uploadTitle: 'Upload Template', uzTitle: 'Drop your receipt photo here', uzSub: 'JPG or PNG • Physical receipt template',
    aiScanText: 'AI is reading your template...', scanBtnText: 'Scan with AI',
    skipTitle: 'Or skip template', skipDesc: "If you don't have a template photo, use our default fields to generate a receipt directly.", skipBtn: 'Use Default Fields →',
    donorInfoTitle: 'Donor Information', donTypeTitle: 'Donation Type',
    typeDonName: 'Donation', typeDonDesc: 'General donation (दान)',
    typeMemName: 'Membership', typeMemDesc: 'Annual membership (सदस्यता)',
    genBtnText: 'Generate Receipt',
    savedSuccessTitle: 'Receipt saved successfully', savedSuccessSub: 'Added to your history',
    actionsTitle: 'Actions', printBtnText: 'Print Receipt', pdfBtnText: 'Save as PDF',
    printHintText: 'In the print dialog, choose "Save as PDF" as destination',
    newReceiptBtn2Text: 'New Receipt',
    hTitle: 'Receipt History', hSub: 'Filter, search and export all receipts',
    exportBtn: 'Export CSV', fromLbl: 'From', toLbl: 'To', typeLbl: 'Type',
    sl1: 'Template', sl2: 'Details', sl3: 'Receipt',
    nlMain: 'Main', nlLang: 'Language',
    emptyRecent: 'No receipts yet. Create your first one!',
    emptyHistory: 'No receipts found for this filter.',
    mandirName: 'Shri Mandir Trust', mandirSub: 'श्री मंदिर ट्रस्ट',
    receiptNoLbl: 'Receipt No.', dateLbl: 'Date', donorLbl: 'Donor Name',
    phoneLbl: 'Phone', addressLbl: 'Address', payModeLbl: 'Payment Mode',
    amountLbl: 'Amount Received', inWordsLbl: 'In words',
    thankYou: 'Thank you for your generous contribution',
    donorSig: "Donor's Signature", authSig: 'Authorised Signatory',
    savedMsg: 'Receipt saved', niDash: 'Dashboard', niNew: 'New Receipt', niHist: 'History'
  },
  hi: {
    dTitle: 'अवलोकन', dSub: 'सभी दान और सदस्यताएं एक नजर में',
    btnNewReceipt: 'नई रसीद', nrTitle: 'नई रसीद', nrSub: 'टेम्पलेट अपलोड करें या सीधे भरें',
    stl0: 'कुल रसीदें', stl1: 'कुल राशि', stl2: 'दान', stl3: 'सदस्यताएं',
    recentTitle: 'हाल की रसीदें', viewAllBtn: 'सभी देखें →',
    uploadTitle: 'टेम्पलेट अपलोड', uzTitle: 'रसीद का फोटो यहाँ डालें', uzSub: 'JPG या PNG • भौतिक रसीद',
    aiScanText: 'AI रसीद पढ़ रहा है...', scanBtnText: 'AI से स्कैन करें',
    skipTitle: 'या टेम्पलेट छोड़ें', skipDesc: 'अगर फोटो नहीं है तो सीधे डिफ़ॉल्ट फ़ील्ड से रसीद बनाएं।', skipBtn: 'डिफ़ॉल्ट फ़ील्ड उपयोग करें →',
    donorInfoTitle: 'दानदाता की जानकारी', donTypeTitle: 'दान का प्रकार',
    typeDonName: 'दान', typeDonDesc: 'सामान्य दान (Donation)',
    typeMemName: 'सदस्यता', typeMemDesc: 'वार्षिक सदस्यता (Membership)',
    genBtnText: 'रसीद बनाएं',
    savedSuccessTitle: 'रसीद सफलतापूर्वक सहेजी गई', savedSuccessSub: 'इतिहास में जोड़ा गया',
    actionsTitle: 'कार्य', printBtnText: 'प्रिंट करें', pdfBtnText: 'PDF सेव करें',
    printHintText: 'प्रिंट डायलॉग में "Save as PDF" चुनें',
    newReceiptBtn2Text: 'नई रसीद',
    hTitle: 'रसीद इतिहास', hSub: 'फ़िल्टर करें और CSV डाउनलोड करें',
    exportBtn: 'CSV डाउनलोड', fromLbl: 'से', toLbl: 'तक', typeLbl: 'प्रकार',
    sl1: 'टेम्पलेट', sl2: 'विवरण', sl3: 'रसीद',
    nlMain: 'मुख्य', nlLang: 'भाषा',
    emptyRecent: 'कोई रसीद नहीं। पहली रसीद बनाएं!',
    emptyHistory: 'इस फ़िल्टर के लिए कोई रसीद नहीं।',
    mandirName: 'श्री मंदिर ट्रस्ट', mandirSub: 'Shri Mandir Trust',
    receiptNoLbl: 'रसीद नं.', dateLbl: 'दिनांक', donorLbl: 'दानदाता',
    phoneLbl: 'फ़ोन', addressLbl: 'पता', payModeLbl: 'भुगतान',
    amountLbl: 'प्राप्त राशि', inWordsLbl: 'शब्दों में',
    thankYou: 'आपके सहयोग के लिए धन्यवाद',
    donorSig: 'दानदाता के हस्ताक्षर', authSig: 'अधिकृत हस्ताक्षरकर्ता',
    savedMsg: 'रसीद सहेजी गई', niDash: 'डैशबोर्ड', niNew: 'नई रसीद', niHist: 'इतिहास'
  }
};

function t(k) { return T[lang][k] || T.en[k] || k; }

function setLang(l, btn) {
  lang = l;
  document.querySelectorAll('.lang-opt').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyLang();
  renderDash();
  renderHistory();
}

function applyLang() {
  const ids = [
    'dTitle','dSub','btnNewReceipt','nrTitle','nrSub','recentTitle','viewAllBtn',
    'uploadTitle','uzTitle','uzSub','aiScanText','scanBtnText','skipTitle','skipDesc','skipBtn',
    'donorInfoTitle','donTypeTitle','typeDonName','typeDonDesc','typeMemName','typeMemDesc',
    'genBtnText','savedSuccessTitle','savedSuccessSub','actionsTitle','printBtnText','pdfBtnText',
    'printHintText','newReceiptBtn2Text','hTitle','hSub','exportBtn','fromLbl','toLbl','typeLbl',
    'sl1','sl2','sl3','nlMain','nlLang'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(id);
  });
  ['stl-total','stl-amount','stl-donations','stl-memberships'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t('stl' + i);
  });
  document.getElementById('nl-dashboard').textContent = t('niDash');
  document.getElementById('nl-new-receipt').textContent = t('niNew');
  document.getElementById('nl-history').textContent = t('niHist');
}

/* ── Dashboard ── */
async function renderDash() {
  const all = await loadReceipts();
  document.getElementById('st-total').textContent = all.length;
  document.getElementById('st-amount').textContent = '₹' + all.reduce((s, r) => s + r.amount, 0).toLocaleString('en-IN');
  document.getElementById('st-donations').textContent = all.filter(r => r.type === 'donation').length;
  document.getElementById('st-memberships').textContent = all.filter(r => r.type === 'membership').length;
  renderTable(all.slice(0, 6), document.getElementById('dashTable'), true);
}

function renderTable(rows, el, mini = false) {
  if (!rows.length) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-file-off"></i><p>${t('emptyRecent')}</p></div>`;
    return;
  }
  el.innerHTML = `<table><thead><tr>
    <th>${lang === 'hi' ? 'रसीद नं.' : 'Receipt No.'}</th>
    <th>${lang === 'hi' ? 'दानदाता' : 'Donor'}</th>
    <th>${lang === 'hi' ? 'प्रकार' : 'Type'}</th>
    <th>${lang === 'hi' ? 'भुगतान' : 'Payment'}</th>
    <th>${lang === 'hi' ? 'दिनांक' : 'Date'}</th>
    <th style="text-align:right">${lang === 'hi' ? 'राशि' : 'Amount'}</th>
    ${!mini ? '<th></th>' : ''}
  </tr></thead><tbody>${rows.map(r => `<tr>
    <td><span class="receipt-no">#${r.receiptNo}</span></td>
    <td><div class="donor-name">${r.donorName}</div>${r.phone ? `<div class="donor-phone">${r.phone}</div>` : ''}</td>
    <td><span class="badge ${r.type === 'donation' ? 'badge-donation' : 'badge-membership'}">${r.type === 'donation' ? (lang === 'hi' ? 'दान' : 'Donation') : (lang === 'hi' ? 'सदस्यता' : 'Membership')}</span></td>
    <td style="color:var(--text2);font-size:12px">${r.paymentMode || '—'}</td>
    <td style="color:var(--text2);font-size:12px">${new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
    <td style="text-align:right"><span class="amount-cell">₹${r.amount.toLocaleString('en-IN')}</span></td>
    ${!mini ? `<td><button class="del-btn" onclick="deleteReceipt(${r.id})" aria-label="Delete"><i class="ti ti-trash"></i></button></td>` : ''}
  </tr>`).join('')}</tbody></table>`;
}

/* ── History ── */
async function getFiltered() {
  const all = await loadReceipts();
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;
  const type = document.getElementById('filterType').value;
  return all.filter(r => {
    if (type !== 'all' && r.type !== type) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });
}

async function renderHistory() {
  const rows = await getFiltered();
  const el = document.getElementById('historyTable');
  if (!rows.length) {
    el.innerHTML = `<div class="empty-state"><i class="ti ti-inbox"></i><p>${t('emptyHistory')}</p></div>`;
    return;
  }
  renderTable(rows, el, false);
}

function setQuick(q, btn) {
  document.querySelectorAll('.qf').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const now = new Date();
  let from = '', to = '';
  if (q === 'today') { from = to = now.toISOString().split('T')[0]; }
  else if (q === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); from = d.toISOString().split('T')[0]; to = now.toISOString().split('T')[0]; }
  else if (q === 'month') { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; to = now.toISOString().split('T')[0]; }
  else if (q === 'lastmonth') { const f = new Date(now.getFullYear(), now.getMonth() - 1, 1); const t2 = new Date(now.getFullYear(), now.getMonth(), 0); from = f.toISOString().split('T')[0]; to = t2.toISOString().split('T')[0]; }
  document.getElementById('filterFrom').value = from;
  document.getElementById('filterTo').value = to;
  renderHistory();
}

async function deleteReceipt(id) {
  if (!confirm(lang === 'hi' ? 'यह रसीद हटाएं?' : 'Delete this receipt?')) return;
  const all = await loadReceipts();
  await saveReceipts(all.filter(r => r.id !== id));
  renderDash();
  renderHistory();
}

async function downloadCSV() {
  const rows = await getFiltered();
  if (!rows.length) { alert(lang === 'hi' ? 'कोई डेटा नहीं' : 'No data to export'); return; }
  const headers = ['Receipt No', 'Date', 'Donor Name', 'Phone', 'Address', 'Type', 'Amount', 'Payment Mode'];
  const csv = [headers.join(','), ...rows.map(r => [
    r.receiptNo, r.date, `"${r.donorName}"`, r.phone, `"${r.address}"`, r.type, r.amount, r.paymentMode
  ].join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;
  const type = document.getElementById('filterType').value;
  a.download = `mandir-receipts${type !== 'all' ? '-' + type : ''}${from ? '-' + from : ''}${to ? '-' + to : ''}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

/* ── Upload & AI Scan ── */
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    imageBase64 = ev.target.result.split(',')[1];
    const prev = document.getElementById('imgPreview');
    prev.src = ev.target.result;
    prev.style.display = 'block';
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('uzTitle').textContent = file.name;
    document.getElementById('uzSub').textContent = lang === 'hi' ? 'तैयार — नीचे बटन दबाएं' : 'Ready — click Scan below';
  };
  reader.readAsDataURL(file);
}

async function scanTemplate() {
  document.getElementById('scanBtn').disabled = true;
  document.getElementById('aiScanning').style.display = 'flex';
  document.getElementById('detectedChips').innerHTML = '';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: 'This is a physical receipt template from a Hindu mandir. Detect all fillable fields. Return ONLY a JSON array, no markdown, no backticks. Each object: "key" (camelCase), "label_en", "label_hi", "type" (text/number/tel/date/textarea/select), "options" (array, only if select), "required" (bool). Include donorName, phone, address, amount, receiptNo, date, paymentMode, donationType if visible.' }
          ]
        }]
      })
    });
    const data = await res.json();
    const raw = data.content.map(c => c.text || '').join('').trim();
    detectedFields = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    useDefaultFields();
    return;
  }
  document.getElementById('aiScanning').style.display = 'none';
  document.getElementById('detectedChips').innerHTML = detectedFields.map(f =>
    `<div class="dchip">${lang === 'hi' ? f.label_hi : f.label_en}</div>`
  ).join('');
  setTimeout(() => goStep(2), 800);
}

function useDefaultFields() {
  detectedFields = [
    { key: 'donorName', label_en: 'Donor Name', label_hi: 'दानदाता का नाम', type: 'text', required: true },
    { key: 'phone', label_en: 'Phone Number', label_hi: 'फ़ोन नंबर', type: 'tel', required: false },
    { key: 'address', label_en: 'Address', label_hi: 'पता', type: 'textarea', required: false },
    { key: 'amount', label_en: 'Amount (₹)', label_hi: 'राशि (₹)', type: 'number', required: true },
    { key: 'donationType', label_en: 'Donation Type', label_hi: 'दान का प्रकार', type: 'select', options: ['Donation', 'Membership'], required: true },
    { key: 'paymentMode', label_en: 'Payment Mode', label_hi: 'भुगतान माध्यम', type: 'select', options: ['Cash', 'UPI', 'Cheque', 'Bank Transfer'], required: false },
    { key: 'receiptNo', label_en: 'Receipt No.', label_hi: 'रसीद नं.', type: 'text', required: true },
    { key: 'date', label_en: 'Date', label_hi: 'दिनांक', type: 'date', required: true }
  ];
  goStep(2);
}

/* ── Step Navigation ── */
function goStep(n) {
  document.getElementById('step1').style.display = n === 1 ? 'block' : 'none';
  document.getElementById('step2').style.display = n === 2 ? 'block' : 'none';
  document.getElementById('step3').style.display = n === 3 ? 'block' : 'none';
  [1, 2, 3].forEach(i => {
    const num = document.getElementById('sn' + i);
    const lbl = document.getElementById('sl' + i);
    if (i < n) { num.className = 'step-num done'; lbl.className = 'step-label'; }
    else if (i === n) { num.className = 'step-num active'; lbl.className = 'step-label active'; }
    else { num.className = 'step-num'; lbl.className = 'step-label'; }
    if (i < 3) {
      const line = document.getElementById('sl-line' + i);
      if (line) line.className = 'step-line' + (i < n ? ' done' : '');
    }
  });
  if (n === 2) renderForm();
}

/* ── Form ── */
function renderForm() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('fieldForm').innerHTML = detectedFields.map(f => {
    const lbl = lang === 'hi' ? f.label_hi : f.label_en;
    const full = f.type === 'textarea';
    let inp = '';
    if (f.type === 'select') inp = `<select id="f_${f.key}">${(f.options || []).map(o => `<option>${o}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') inp = `<textarea id="f_${f.key}"></textarea>`;
    else { const val = f.key === 'date' ? today : f.key === 'receiptNo' ? String(receiptCounter).padStart(3, '0') : ''; inp = `<input type="${f.type}" id="f_${f.key}" value="${val}">`; }
    return `<div class="field-group${full ? ' full' : ''}"><label class="field-label">${lbl}</label>${inp}</div>`;
  }).join('');
}

function setType(type, btn) {
  donationType = type;
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
}

function getVal(k) {
  const el = document.getElementById('f_' + k);
  return el ? el.value.trim() : '';
}

/* ── Amount to Words ── */
function toWords(n) {
  const o = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const te = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n === 0) return 'Zero';
  if (n < 20) return o[n];
  if (n < 100) return te[Math.floor(n/10)] + (n%10 ? ' '+o[n%10] : '');
  if (n < 1000) return o[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+toWords(n%100) : '');
  if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+toWords(n%1000) : '');
  if (n < 10000000) return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+toWords(n%100000) : '');
  return toWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' '+toWords(n%10000000) : '');
}

/* ── Generate Receipt ── */
async function generateReceipt() {
  const vals = {};
  detectedFields.forEach(f => { vals[f.key] = getVal(f.key); });
  const name = vals.donorName || vals.name || '';
  const amount = parseFloat(vals.amount) || 0;
  if (!name || !amount) { alert(lang === 'hi' ? 'नाम और राशि भरें' : 'Please enter donor name and amount'); return; }

  const rNo = vals.receiptNo || String(receiptCounter).padStart(3, '0');
  const rawDate = vals.date || new Date().toISOString().split('T')[0];
  const fDate = new Date(rawDate).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const isDonation = donationType === 'donation';
  const amtWords = toWords(Math.round(amount)) + (lang === 'hi' ? ' रुपये मात्र' : ' Rupees Only');

  const extraRows = detectedFields
    .filter(f => !['donorName','name','amount','receiptNo','date','donationType','paymentMode','phone','address'].includes(f.key))
    .map(f => { const v = vals[f.key]; if (!v) return ''; return `<div class="rp-row"><div class="rp-lbl">${lang==='hi'?f.label_hi:f.label_en}</div><div class="rp-val">${v}</div></div>`; })
    .join('');

  lastReceiptHTML = `
    <div class="rp-header">
      <div class="rp-mandir">${t('mandirName')}</div>
      <div class="rp-sub">${t('mandirSub')}</div>
      <div class="rp-meta"><span>${t('receiptNoLbl')}: <strong>${rNo}</strong></span><span>${t('dateLbl')}: <strong>${fDate}</strong></span></div>
      <span class="rp-badge ${isDonation ? 'rp-badge-d' : 'rp-badge-m'}">${isDonation ? (lang==='hi'?'🙏 दान':'🙏 Donation') : (lang==='hi'?'🪷 सदस्यता':'🪷 Membership')}</span>
    </div>
    <div class="rp-row"><div class="rp-lbl">${t('donorLbl')}</div><div class="rp-val" style="font-weight:600">${name}</div></div>
    ${vals.phone ? `<div class="rp-row"><div class="rp-lbl">${t('phoneLbl')}</div><div class="rp-val">${vals.phone}</div></div>` : ''}
    ${vals.address ? `<div class="rp-row"><div class="rp-lbl">${t('addressLbl')}</div><div class="rp-val" style="font-size:11px">${vals.address}</div></div>` : ''}
    ${extraRows}
    ${vals.paymentMode ? `<div class="rp-row"><div class="rp-lbl">${t('payModeLbl')}</div><div class="rp-val">${vals.paymentMode}</div></div>` : ''}
    <div class="rp-amount">
      <div class="rp-amt-lbl">${t('amountLbl')}<small>${t('inWordsLbl')}: ${amtWords}</small></div>
      <div class="rp-amt-val">₹${Math.round(amount).toLocaleString('en-IN')}</div>
    </div>
    <div class="rp-footer">
      <div>ॐ नमः शिवाय • हर हर महादेव</div>
      <div style="margin-top:4px">${t('thankYou')}</div>
      <div class="rp-sig"><span>${t('donorSig')}</span><span>${t('authSig')}</span></div>
    </div>`;

  document.getElementById('receiptPreviewContent').innerHTML = lastReceiptHTML;

  const record = {
    id: Date.now(), receiptNo: rNo, date: rawDate,
    donorName: name, phone: vals.phone || '', address: vals.address || '',
    amount: Math.round(amount), type: isDonation ? 'donation' : 'membership',
    paymentMode: vals.paymentMode || ''
  };
  const all = await loadReceipts();
  all.unshift(record);
  if (await saveReceipts(all)) showToast(t('savedMsg'));

  receiptCounter++;
  try { localStorage.setItem('rcptCount', String(receiptCounter)); } catch(e) {}

  goStep(3);
}

/* ── Print / PDF ── */
function printReceipt() {
  const w = window.open('', '_blank', 'width=700,height=900');
  if (!w) { showToast('Please allow popups for printing'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'DM Sans',Arial,sans-serif;padding:36px;color:#111;background:#fff;max-width:520px;margin:0 auto}
      .rp-header{text-align:center;border-bottom:1.5px solid #e0d5c0;padding-bottom:14px;margin-bottom:14px}
      .rp-mandir{font-family:'Syne',sans-serif;font-size:20px;font-weight:700}
      .rp-sub{font-size:12px;color:#777;margin-top:2px}
      .rp-meta{display:flex;justify-content:space-between;font-size:11px;color:#888;margin-top:10px}
      .rp-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-top:8px}
      .rp-badge-d{background:#FFF3DC;color:#A0692A}
      .rp-badge-m{background:#DCE8FF;color:#2A5CA0}
      .rp-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f0ece4;font-size:12px}
      .rp-row:last-child{border:none}
      .rp-lbl{color:#888}.rp-val{font-weight:500;text-align:right;max-width:55%}
      .rp-amount{background:#FFF8EC;border-radius:8px;padding:12px 16px;margin-top:14px;display:flex;justify-content:space-between;align-items:center}
      .rp-amt-lbl{font-size:12px;color:#A0692A}
      .rp-amt-lbl small{display:block;font-size:10px;color:#c08030;margin-top:2px}
      .rp-amt-val{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:#A0692A}
      .rp-footer{text-align:center;font-size:11px;color:#aaa;margin-top:14px;border-top:1px solid #eee;padding-top:12px}
      .rp-sig{display:flex;justify-content:space-between;font-size:11px;color:#bbb;margin-top:18px;padding-top:12px;border-top:1px solid #eee}
      @media print{body{padding:15px}}
    </style>
  </head><body>${lastReceiptHTML}
  <script>window.onload=function(){setTimeout(function(){window.print();},400);}<\/script>
  </body></html>`);
  w.document.close();
}

/* ── Reset ── */
function resetForm() {
  detectedFields = []; imageBase64 = ''; lastReceiptHTML = ''; donationType = 'donation';
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('fileInput').value = '';
  document.getElementById('scanBtn').disabled = true;
  document.getElementById('detectedChips').innerHTML = '';
  document.getElementById('aiScanning').style.display = 'none';
  document.getElementById('uzTitle').textContent = t('uzTitle');
  document.getElementById('uzSub').textContent = t('uzSub');
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
  document.getElementById('typeCardDonation').classList.add('active');
  goStep(1);
}

/* ── Init ── */
applyLang();
renderDash();
