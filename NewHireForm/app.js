(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  let pdfTemplateBytes = null;
  const signaturePads = {};

  // PDF page: 595.32 x 841.92 points (A4).
  // Coordinates extracted via pdfplumber. pdfplumber top -> pdf-lib y = 841.92 - top.
  // All y values shifted ~2mm down (5.7pt added to pdfplumber top).
  const PH = 841.92;
  const S = 5.7;

  // ─── PAGE 1: Field value positions (x, y) ───────────────────────

  const PAGE1_FIELDS = {
    jobTitle:             { x: 168, y: PH - (166.9 + S) },
    department:           { x: 183, y: PH - (181.6 + S) },
    reportingManager:     { x: 222, y: PH - (196.2 + S) },
    facilityName:         { x: 290, y: PH - (210.9 + S) },
    workLocationAddress:  { x: 108, y: PH - (240.1 + S) },
    workSchedule:         { x: 108, y: PH - (269.4 + S) },
  };

  // Checkboxes — Employment Type (2mm up = +5.7pt y)
  const EMPLOYMENT_TYPE_CB = {
    'Full-Time':  { x: 206, y: PH - 303.3 + 2 + 5.7 },
    'Part-Time':  { x: 268, y: PH - 303.3 + 2 + 5.7 },
    'Contract':   { x: 333, y: PH - 303.3 + 2 + 5.7 },
    'Internship': { x: 392, y: PH - 303.3 + 2 + 5.7 },
  };

  // Reason for Requisition — mark next to bullet (shifted 1mm further left = -2.8pt x)
  const REASON_MARKS = {
    'New Position': { x: 90.4, y: PH - (331.2 + S) },
    'Replacement':  { x: 90.4, y: PH - (345.9 + S) },
  };
  const REPLACEMENT_NAME = { x: 375, y: PH - (345.4 + S) };

  // Position Requirements
  const POS_REQ_FIELDS = {
    numPositions:          { x: 232, y: PH - (391.2 + S) },
    expectedDateOfJoining: { x: 250, y: PH - (405.9 + S) },
    keyResponsibilities:   { x: 230, y: PH - (420.5 + S) },
    qualifications:        { x: 268, y: PH - (435.1 + S) },
  };

  // Budget & Compensation checkboxes (prev 2mm + 1mm more up = +2.83pt y)
  const PAY_TYPE_CB = {
    'Salary': { x: 161, y: PH - 514.2 + 2 + 5.7 + 2.83 },
    'Hourly': { x: 206, y: PH - 514.2 + 2 + 5.7 + 2.83 },
  };

  const PAY_RATE_FIELD = { x: 253, y: PH - (511.1 + S) };

  const PAY_FREQ_CB = {
    'Bi-Weekly':     { x: 189, y: PH - 545.0 + 2 + 5.7 + 2.83 },
    'Semi-Monthly':  { x: 254, y: PH - 545.0 + 2 + 5.7 + 2.83 },
    'Monthly':       { x: 339, y: PH - 545.0 + 2 + 5.7 + 2.83 },
  };

  const PAY_BASIS_CB = {
    'Gross': { x: 162, y: PH - 561.1 + 2 + 5.7 + 2.83 },
    'Net':   { x: 205, y: PH - 561.1 + 2 + 5.7 + 2.83 },
  };

  const APPROVED_BUDGET_CB = {
    'Yes': { x: 203, y: PH - 577.3 + 2 + 5.7 + 2.83 },
    'No':  { x: 236, y: PH - 577.3 + 2 + 5.7 + 2.83 },
  };

  // Approvals: Name 1mm down, Sig 2mm up (total +11.37), Date 2mm down
  const APPROVALS = {
    reqByName:       { x: 148, y: PH - (662.1 + S) + 5.7 - 2.83 },
    deptHeadName:    { x: 432, y: PH - (662.1 + S) + 5.7 - 2.83 },
    reqBySig:        { x: 172, y: PH - (691.3 + S) + 5.7 + 5.7 + 5.7, w: 140, h: 25 },
    deptHeadSig:     { x: 452, y: PH - (691.3 + S) + 5.7 + 5.7 + 5.7, w: 140, h: 25 },
    reqByDate:       { x: 142, y: PH - (720.6 + S) + 5.7 - 5.7 },
    deptHeadDate:    { x: 428, y: PH - (720.6 + S) + 5.7 - 5.7 },
  };

  // ─── PAGE 2: New Hire Form positions ────────────────────────────

  const PAGE2_FIELDS = {
    employeeName:  { x: 218, y: PH - (186.1 + S) },
    personalEmail: { x: 210, y: PH - (200.8 + S) },
    phoneNo:       { x: 173, y: PH - (215.4 + S) },
    startDate:     { x: 181, y: PH - (230.2 + S) },
  };

  // Page 2 checkboxes (prev 2mm + 1mm more up = +2.83pt y)
  const TIME_ENTRY_CB = {
    'ADP':    { x: 209, y: PH - 264.0 + 2 + 5.7 + 2.83 },
    'Encore': { x: 245, y: PH - 264.0 + 2 + 5.7 + 2.83 },
    'CLM':    { x: 295, y: PH - 264.0 + 2 + 5.7 + 2.83 },
  };

  const OVERTIME_CB = {
    'Yes': { x: 212, y: PH - 280.2 + 2 + 5.7 + 2.83 },
    'No':  { x: 244, y: PH - 280.2 + 2 + 5.7 + 2.83 },
  };

  const EMP_AUTH_CB = {
    'US Citizen':  { x: 110, y: PH - 311.0 + 2 + 5.7 + 2.83 },
    'Green Card':  { x: 175, y: PH - 311.0 + 2 + 5.7 + 2.83 },
    'H-1B':        { x: 246, y: PH - 311.0 + 2 + 5.7 + 2.83 },
    'CPT':         { x: 286, y: PH - 311.0 + 2 + 5.7 + 2.83 },
    'OPT':         { x: 320, y: PH - 311.0 + 2 + 5.7 + 2.83 },
    'Other':       { x: 355, y: PH - 311.0 + 2 + 5.7 + 2.83 },
  };
  const EMP_AUTH_OTHER_TEXT = { x: 400, y: PH - (293.3 + S) };

  const WORK_MODE_CB = {
    'Onsite': { x: 176, y: PH - 327.2 + 2 + 5.7 + 2.83 },
    'Remote': { x: 223, y: PH - 327.2 + 2 + 5.7 + 2.83 },
    'Hybrid': { x: 277, y: PH - 327.2 + 2 + 5.7 + 2.83 },
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
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a2e1a';

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

    // 1. Position Details
    for (var key in PAGE1_FIELDS) {
      if (data[key]) {
        var p = PAGE1_FIELDS[key];
        drawText(page1, p.x, p.y, data[key]);
      }
    }
    markCheckbox(page1, EMPLOYMENT_TYPE_CB, data.employmentType);

    // 2. Reason for Requisition
    if (data.requisitionReason && REASON_MARKS[data.requisitionReason]) {
      var rm = REASON_MARKS[data.requisitionReason];
      drawText(page1, rm.x, rm.y, 'X', 10);
    }
    if (data.replacementName) {
      drawText(page1, REPLACEMENT_NAME.x, REPLACEMENT_NAME.y, data.replacementName);
    }

    // 3. Position Requirements
    for (var rk in POS_REQ_FIELDS) {
      if (data[rk]) {
        var rp = POS_REQ_FIELDS[rk];
        drawText(page1, rp.x, rp.y, data[rk]);
      }
    }

    // 4. Budget & Compensation
    markCheckbox(page1, PAY_TYPE_CB, data.payType);
    if (data.payRate) drawText(page1, PAY_RATE_FIELD.x, PAY_RATE_FIELD.y, data.payRate);
    markCheckbox(page1, PAY_FREQ_CB, data.payFrequency);
    markCheckbox(page1, PAY_BASIS_CB, data.payBasis);
    markCheckbox(page1, APPROVED_BUDGET_CB, data.approvedBudget);

    // 5. Approvals
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
      drawText(page1, APPROVALS.reqBySig.x, APPROVALS.reqBySig.y, data.reqBySignature);
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
      drawText(page1, APPROVALS.deptHeadSig.x, APPROVALS.deptHeadSig.y, data.deptHeadSignature);
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
    var nameBase = (data.employeeName || data.jobTitle || 'MLX_Form')
      .replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') || 'MLX_Form';
    downloadPdf(filledBytes, 'MLX_Requisition_NewHire_' + nameBase + '.pdf');
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
      var resp = await fetch('MLX_REQUISITION_NEW_HIRE_FORM.pdf');
      if (!resp.ok) throw new Error('PDF not found');
      pdfTemplateBytes = await resp.arrayBuffer();
      btn.disabled = false;
    } catch (e) {
      console.warn('Auto-load failed:', e.message);
      alert('Could not load the PDF template. Place "MLX_REQUISITION_NEW_HIRE_FORM.pdf" in the NewHireForm folder and refresh.');
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
