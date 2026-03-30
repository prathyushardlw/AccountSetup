(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  let pdfTemplateBytes = null;
  const signaturePads = {};

  // PDF page: 612 x 792 points (US Letter).
  // Coordinates extracted via pdfplumber. pdfplumber top -> pdf-lib y = 792 - top.
  // Baseline offset S=5.7 aligns text to field underlines.
  const PH = 792;
  const S = 5.7;

  // ─── PAGE 1: Field value positions (x, y) ───────────────────────

  const PAGE1_FIELDS = {
    jobTitle:             { x: 157, y: PH - (157.36 + S) },
    department:           { x: 175, y: PH - (171.28 + S) },
    reportingManager:     { x: 211, y: PH - (185.20 + S) },
    facilityName:         { x: 263, y: PH - (199.12 + S) },
    workLocationAddress:  { x: 108, y: PH - (226.96 + S) },
    workSchedule:         { x: 108, y: PH - (254.83 + S) },
  };

  // Checkboxes — Employment Type (+1mm up = +2.84pt)
  const EMPLOYMENT_TYPE_CB = {
    'Full-Time':  { x: 205, y: PH - 283.30 + 5.7 - 11.34 - 5.67 + 2.84 },
    'Part-Time':  { x: 267, y: PH - 283.30 + 5.7 - 11.34 - 5.67 + 2.84 },
    'Contract':   { x: 331, y: PH - 283.30 + 5.7 - 11.34 - 5.67 + 2.84 },
    'Internship': { x: 389, y: PH - 283.30 + 5.7 - 11.34 - 5.67 + 2.84 },
  };

  // Reason for Requisition — mark next to bullet (1mm left = -2.8pt x)
  const REASON_MARKS = {
    'New Position': { x: 87.2, y: PH - (311.80 + S) },
    'Replacement':  { x: 87.2, y: PH - (325.72 + S) },
  };
  const REPLACEMENT_NAME = { x: 362, y: PH - (325.63 + S) };

  // Position Requirements
  const POS_REQ_FIELDS = {
    numPositions:          { x: 210, y: PH - (367.39 + S) },
    expectedDateOfJoining: { x: 240, y: PH - (381.31 + S) },
    keyResponsibilities:   { x: 208, y: PH - (395.11 + S) },
    qualifications:        { x: 243, y: PH - (409.05 + S) },
  };

  // Budget & Compensation checkboxes (4mm+2mm down = -17.01pt y)
  const PAY_TYPE_CB = {
    'Salary': { x: 160, y: PH - 451.44 + 8.53 - 11.34 - 5.67 },
    'Hourly': { x: 206, y: PH - 451.44 + 8.53 - 11.34 - 5.67 },
  };

  const PAY_RATE_FIELD = { x: 240, y: PH - (465.93 + S) };

  const PAY_FREQ_CB = {
    'Bi-Weekly':     { x: 188, y: PH - 480.60 + 8.53 - 11.34 - 5.67 },
    'Semi-Monthly':  { x: 254, y: PH - 480.60 + 8.53 - 11.34 - 5.67 },
    'Monthly':       { x: 338, y: PH - 480.60 + 8.53 - 11.34 - 5.67 },
  };

  const PAY_BASIS_CB = {
    'Gross': { x: 162, y: PH - 495.96 + 8.53 - 11.34 - 5.67 },
    'Net':   { x: 205, y: PH - 495.96 + 8.53 - 11.34 - 5.67 },
  };

  const APPROVED_BUDGET_CB = {
    'Yes': { x: 201, y: PH - 511.20 + 8.53 - 11.34 - 5.67 },
    'No':  { x: 234, y: PH - 511.20 + 8.53 - 11.34 - 5.67 },
  };

  // Approvals: Sig 3mm up (+8.5), Date 3mm up (+8.5)
  const APPROVALS = {
    reqByName:       { x: 108, y: PH - (553.53 + S) - 2.83 },
    deptHeadName:    { x: 396, y: PH - (553.53 + S) - 2.83 },
    reqBySig:        { x: 127, y: PH - (567.45 + S) + 5.7 + 8.5 - 2.84 + 2.84, w: 140, h: 28 },
    deptHeadSig:     { x: 415, y: PH - (567.45 + S) + 5.7 + 8.5 - 2.84 + 2.84, w: 140, h: 28 },
    reqByDate:       { x: 102, y: PH - (581.40 + S) - 5.7 + 8.5 - 2.84 },
    deptHeadDate:    { x: 390, y: PH - (581.40 + S) - 5.7 + 8.5 - 2.84 },
  };

  // ─── PAGE 2: New Hire Form positions ────────────────────────────

  const PAGE2_FIELDS = {
    employeeName:  { x: 195, y: PH - (124.00 + S) },
    personalEmail: { x: 189, y: PH - (137.92 + S) },
    phoneNo:       { x: 163, y: PH - (151.84 + S) },
    startDate:     { x: 166, y: PH - (165.76 + S) },
  };

  // Page 2 checkboxes (4mm+2mm down = -17.01pt y)
  const TIME_ENTRY_CB = {
    'ADP':    { x: 209, y: PH - 180.43 + 8.53 - 11.34 - 5.67 },
    'Encore': { x: 245, y: PH - 180.43 + 8.53 - 11.34 - 5.67 },
    'CLM':    { x: 293, y: PH - 180.43 + 8.53 - 11.34 - 5.67 },
  };

  const OVERTIME_CB = {
    'Yes': { x: 211, y: PH - 195.79 + 8.53 - 11.34 - 5.67 },
    'No':  { x: 243, y: PH - 195.79 + 8.53 - 11.34 - 5.67 },
  };

  const EMP_AUTH_CB = {
    'US Citizen':  { x: 108, y: PH - 224.95 + 8.53 - 11.34 - 5.67 },
    'Green Card':  { x: 174, y: PH - 224.95 + 8.53 - 11.34 - 5.67 },
    'H-1B':        { x: 244, y: PH - 224.95 + 8.53 - 11.34 - 5.67 },
    'CPT':         { x: 284, y: PH - 224.95 + 8.53 - 11.34 - 5.67 },
    'OPT':         { x: 318, y: PH - 224.95 + 8.53 - 11.34 - 5.67 },
    'Other':       { x: 353, y: PH - 224.95 + 8.53 - 11.34 - 5.67 },
  };
  const EMP_AUTH_OTHER_TEXT = { x: 399, y: PH - (224.92 + S) };

  const WORK_MODE_CB = {
    'Onsite': { x: 172, y: PH - 240.34 + 8.53 - 11.34 - 5.67 },
    'Remote': { x: 218, y: PH - 240.34 + 8.53 - 11.34 - 5.67 },
    'Hybrid': { x: 272, y: PH - 240.34 + 8.53 - 11.34 - 5.67 },
  };

  // ─── Signature Pad ──────────────────────────────────────────────

  function initSignaturePad(canvas) {
    var ctx = canvas.getContext('2d');
    var drawing = false;
    var lastX = 0, lastY = 0;

    function resizeCanvas() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var newW = Math.round(rect.width * dpr);
      var newH = Math.round(rect.height * dpr);
      if (canvas.width === newW && canvas.height === newH) return;

      var saved = null;
      try { saved = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (_) {}

      canvas.width = newW;
      canvas.height = newH;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';

      if (saved) ctx.putImageData(saved, 0, 0);
    }

    function getPos(e) {
      var rect = canvas.getBoundingClientRect();
      var touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    function startDraw(e) { e.preventDefault(); drawing = true; var p = getPos(e); lastX = p.x; lastY = p.y; }
    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = getPos(e);
      ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
      lastX = p.x; lastY = p.y;
    }
    function stopDraw() { drawing = false; }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return {
      clear: function () { ctx.clearRect(0, 0, canvas.width, canvas.height); },
      isEmpty: function () {
        var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (var i = 3; i < data.length; i += 4) { if (data[i] > 0) return false; }
        return true;
      },
      toDataURL: function () { return canvas.toDataURL('image/png'); }
    };
  }

  // ─── Form Data ──────────────────────────────────────────────────

  function radioVal(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function textVal(id) {
    return (document.getElementById(id)?.value || '').trim();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US');
  }

  function getFormData() {
    return {
      jobTitle: textVal('jobTitle'),
      department: textVal('department'),
      reportingManager: textVal('reportingManager'),
      facilityName: textVal('facilityName'),
      workLocationAddress: textVal('workLocationAddress'),
      workSchedule: textVal('workSchedule'),
      employmentType: radioVal('employmentType'),
      requisitionReason: radioVal('requisitionReason'),
      replacementName: textVal('replacementName'),
      numPositions: textVal('numPositions'),
      expectedDateOfJoining: formatDate(textVal('expectedDateOfJoining')),
      keyResponsibilities: textVal('keyResponsibilities'),
      qualifications: textVal('qualifications'),
      payType: radioVal('payType'),
      payRate: textVal('payRate'),
      payFrequency: radioVal('payFrequency'),
      payBasis: radioVal('payBasis'),
      approvedBudget: radioVal('approvedBudget'),
      reqByName: textVal('reqByName'),
      reqBySignature: textVal('reqBySignature'),
      reqByDate: formatDate(textVal('reqByDate')),
      deptHeadName: textVal('deptHeadName'),
      deptHeadSignature: textVal('deptHeadSignature'),
      deptHeadDate: formatDate(textVal('deptHeadDate')),
      employeeName: textVal('employeeName'),
      personalEmail: textVal('personalEmail'),
      phoneNo: textVal('phoneNo'),
      startDate: formatDate(textVal('startDate')),
      timeEntrySystem: radioVal('timeEntrySystem'),
      overtimeEligibility: radioVal('overtimeEligibility'),
      employmentAuth: radioVal('employmentAuth'),
      employmentAuthOther: textVal('employmentAuthOther'),
      workMode: radioVal('workMode'),
    };
  }

  // ─── PDF Generation ─────────────────────────────────────────────

  async function generateFilledPDF() {
    if (!pdfTemplateBytes) {
      alert('PDF template not loaded. Place the template file in the folder and refresh.');
      return;
    }

    var data = getFormData();
    var pdfDoc = await PDFDocument.load(pdfTemplateBytes);
    var font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    var pages = pdfDoc.getPages();
    if (pages.length < 2) return;

    var page1 = pages[0];
    var page2 = pages[1];
    var blueInk = rgb(0.0, 0.18, 0.65);
    var checkColor = rgb(0.0, 0.18, 0.65);
    var FS = 9;

    function drawText(page, x, y, text, size) {
      if (!text) return;
      page.drawText(String(text), { x: x, y: y, size: size || FS, font: font, color: blueInk });
    }

    function markCheckbox(page, cbMap, selected) {
      if (!selected || !cbMap[selected]) return;
      var pos = cbMap[selected];
      page.drawText('X', { x: pos.x, y: pos.y, size: 10, font: font, color: checkColor });
    }

    // ═══ PAGE 1 ═══

    for (var key in PAGE1_FIELDS) {
      if (data[key]) {
        var p = PAGE1_FIELDS[key];
        drawText(page1, p.x, p.y, data[key]);
      }
    }
    markCheckbox(page1, EMPLOYMENT_TYPE_CB, data.employmentType);

    if (data.requisitionReason && REASON_MARKS[data.requisitionReason]) {
      var rm = REASON_MARKS[data.requisitionReason];
      drawText(page1, rm.x, rm.y, 'X', 10);
    }
    if (data.replacementName) {
      drawText(page1, REPLACEMENT_NAME.x, REPLACEMENT_NAME.y, data.replacementName);
    }

    for (var rk in POS_REQ_FIELDS) {
      if (data[rk]) {
        var rp = POS_REQ_FIELDS[rk];
        drawText(page1, rp.x, rp.y, data[rk]);
      }
    }

    markCheckbox(page1, PAY_TYPE_CB, data.payType);
    if (data.payRate) drawText(page1, PAY_RATE_FIELD.x, PAY_RATE_FIELD.y, data.payRate);
    markCheckbox(page1, PAY_FREQ_CB, data.payFrequency);
    markCheckbox(page1, PAY_BASIS_CB, data.payBasis);
    markCheckbox(page1, APPROVED_BUDGET_CB, data.approvedBudget);

    if (data.reqByName) drawText(page1, APPROVALS.reqByName.x, APPROVALS.reqByName.y, data.reqByName);
    if (data.deptHeadName) drawText(page1, APPROVALS.deptHeadName.x, APPROVALS.deptHeadName.y, data.deptHeadName);
    if (data.reqByDate) drawText(page1, APPROVALS.reqByDate.x, APPROVALS.reqByDate.y, data.reqByDate);
    if (data.deptHeadDate) drawText(page1, APPROVALS.deptHeadDate.x, APPROVALS.deptHeadDate.y, data.deptHeadDate);

    // Signatures — Requested By
    var reqByDrawPanel = document.getElementById('reqBySigDraw');
    var reqByDrawActive = reqByDrawPanel && reqByDrawPanel.classList.contains('active');
    var padReqBy = signaturePads['sigPadReqBy'];
    if (reqByDrawActive && padReqBy && !padReqBy.isEmpty()) {
      try {
        var sigData1 = padReqBy.toDataURL();
        var base64_1 = sigData1.split(',')[1];
        var bin1 = atob(base64_1);
        var sigBytes1 = new Uint8Array(bin1.length);
        for (var b1 = 0; b1 < bin1.length; b1++) sigBytes1[b1] = bin1.charCodeAt(b1);
        var sigImg1 = await pdfDoc.embedPng(sigBytes1);
        var sp1 = APPROVALS.reqBySig;
        page1.drawImage(sigImg1, { x: sp1.x, y: sp1.y - sp1.h, width: sp1.w, height: sp1.h });
      } catch (e) { console.warn('Sig embed error:', e); }
    } else if (data.reqBySignature) {
      drawText(page1, APPROVALS.reqBySig.x, APPROVALS.reqBySig.y, data.reqBySignature, 11);
    }

    // Signatures — Dept Head
    var deptDrawPanel = document.getElementById('deptHeadSigDraw');
    var deptDrawActive = deptDrawPanel && deptDrawPanel.classList.contains('active');
    var padDept = signaturePads['sigPadDeptHead'];
    if (deptDrawActive && padDept && !padDept.isEmpty()) {
      try {
        var sigData2 = padDept.toDataURL();
        var base64_2 = sigData2.split(',')[1];
        var bin2 = atob(base64_2);
        var sigBytes2 = new Uint8Array(bin2.length);
        for (var b2 = 0; b2 < bin2.length; b2++) sigBytes2[b2] = bin2.charCodeAt(b2);
        var sigImg2 = await pdfDoc.embedPng(sigBytes2);
        var sp2 = APPROVALS.deptHeadSig;
        page1.drawImage(sigImg2, { x: sp2.x, y: sp2.y - sp2.h, width: sp2.w, height: sp2.h });
      } catch (e) { console.warn('Sig embed error:', e); }
    } else if (data.deptHeadSignature) {
      drawText(page1, APPROVALS.deptHeadSig.x, APPROVALS.deptHeadSig.y, data.deptHeadSignature, 11);
    }

    // ═══ PAGE 2 ═══

    for (var fk in PAGE2_FIELDS) {
      if (data[fk]) {
        var fp = PAGE2_FIELDS[fk];
        drawText(page2, fp.x, fp.y, data[fk]);
      }
    }
    markCheckbox(page2, TIME_ENTRY_CB, data.timeEntrySystem);
    markCheckbox(page2, OVERTIME_CB, data.overtimeEligibility);
    markCheckbox(page2, EMP_AUTH_CB, data.employmentAuth);
    if (data.employmentAuthOther) {
      drawText(page2, EMP_AUTH_OTHER_TEXT.x, EMP_AUTH_OTHER_TEXT.y, data.employmentAuthOther);
    }
    markCheckbox(page2, WORK_MODE_CB, data.workMode);

    // ─── Save & Download ───
    var filledBytes = await pdfDoc.save();
    var nameBase = (data.employeeName || data.jobTitle || 'TestGO_Form')
      .replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || 'TestGO_Form';
    downloadPdf(filledBytes, 'TestGO_Requisition_NewHire_' + nameBase + '.pdf');
  }

  async function downloadPdf(bytes, filename) {
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isTouchDevice = navigator.maxTouchPoints > 1;

    if ((isIOS || isTouchDevice) && navigator.canShare) {
      var file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: filename });
          return;
        } catch (e) { if (e.name === 'AbortError') return; }
      }
    }

    if (isIOS || isTouchDevice) {
      var reader = new FileReader();
      reader.onload = function () {
        var newTab = window.open('', '_blank');
        if (newTab) {
          newTab.document.write(
            '<html><head><title>' + filename + '</title></head>' +
            '<body style="margin:0"><embed width="100%" height="100%" src="' +
            reader.result + '" type="application/pdf"></body></html>'
          );
          newTab.document.close();
        }
      };
      reader.readAsDataURL(blob);
      return;
    }

    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  // ─── PDF Template Loading ───────────────────────────────────────

  async function autoLoadPDF() {
    var btn = document.getElementById('btnGenerate');
    try {
      var resp = await fetch('TestGO_Hire_Form.pdf');
      if (!resp.ok) throw new Error('PDF not found');
      pdfTemplateBytes = await resp.arrayBuffer();
      btn.disabled = false;
    } catch (e) {
      console.warn('Auto-load failed:', e.message);
      alert('Could not load the PDF template. Place "TestGO_Hire_Form.pdf" in the folder and refresh.');
    }
  }

  // ─── Signature Tab Toggle ───────────────────────────────────────

  function initSigTabs() {
    document.querySelectorAll('.sig-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var wrapper = tab.closest('.form-group');
        wrapper.querySelectorAll('.sig-tab').forEach(function (t) { t.classList.remove('active'); });
        wrapper.querySelectorAll('.sig-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var target = document.getElementById(tab.dataset.target);
        if (target) target.classList.add('active');
      });
    });
  }

  // ─── Init ───────────────────────────────────────────────────────

  function init() {
    var today = new Date().toISOString().split('T')[0];
    ['expectedDateOfJoining', 'startDate', 'reqByDate', 'deptHeadDate'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.value) el.value = today;
    });

    var btn = document.getElementById('btnGenerate');
    btn.disabled = true;

    autoLoadPDF();

    ['sigPadReqBy', 'sigPadDeptHead'].forEach(function (id) {
      var canvas = document.getElementById(id);
      if (canvas) signaturePads[id] = initSignaturePad(canvas);
    });

    document.querySelectorAll('.btn-clear-sig').forEach(function (b) {
      b.addEventListener('click', function () {
        var padId = b.dataset.pad;
        if (signaturePads[padId]) signaturePads[padId].clear();
      });
    });

    initSigTabs();

    btn.addEventListener('click', async function () {
      btn.disabled = true;
      btn.textContent = 'Generating...';
      try {
        await generateFilledPDF();
      } catch (e) {
        console.error(e);
        alert('Error generating PDF: ' + e.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generate Filled PDF';
      }
    });

    document.getElementById('newHireForm').addEventListener('reset', function () {
      setTimeout(function () {
        Object.values(signaturePads).forEach(function (p) { p.clear(); });
      }, 10);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
