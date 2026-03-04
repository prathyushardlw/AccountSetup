(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  let pdfTemplateBytes = null;
  const signaturePads = {};

  // Coordinates extracted from the actual PDF (1364 x 1670 points).
  // pdf-lib origin is bottom-left. y values = page_height - top_from_pdfplumber.
  // To nudge: increase x → right, increase y → up.

  const FIELD_MAP = {
    page1: {
      // Dates — 2mm down
      todaysDate:       { x: 180, y: 1384, size: 14 },
      accountStartDate: { x: 870, y: 1384, size: 14 },

      // Client Information — left column, 1mm down
      clientName:       { x: 200, y: 1269, size: 14 },
      address:          { x: 200, y: 1232, size: 14 },
      cityStateZip:     { x: 200, y: 1195, size: 14 },
      clientEmail:      { x: 200, y: 1158, size: 14 },
      clientPhone:      { x: 200, y: 1121, size: 14 },
      clientFax:        { x: 200, y: 1084, size: 14 },

      // Provider Information — right column, 1mm down
      providerNames:    { x: 900, y: 1269, size: 14 },
      specializations:  { x: 900, y: 1232, size: 14 },
      providerEmails:   { x: 900, y: 1195, size: 14 },
      medicarePtan:     { x: 900, y: 1158, size: 14 },
      npi:              { x: 900, y: 1121, size: 14 },

      // Rejections & Recollections — left column, 1mm down
      rejectName:       { x: 200, y: 954, size: 14 },
      rejectPhone:      { x: 200, y: 917, size: 14 },
      rejectEmail:      { x: 200, y: 880, size: 14 },

      // Critical Reporting — right column, 1mm down
      criticalName:     { x: 900, y: 954, size: 14 },
      criticalPhone:    { x: 900, y: 917, size: 14 },
      criticalEmail:    { x: 900, y: 880, size: 14 },

      // Lab Results — left column, checkboxes unchanged, text 1mm down
      autoFaxYes:       { x: 145, y: 748, size: 14, type: 'check' },
      autoFaxNo:        { x: 222, y: 748, size: 14, type: 'check' },
      autoFaxNumber:    { x: 280, y: 726, size: 14 },

      // Online Portal Access — left column, 1mm down
      user1Name:        { x: 200, y: 652, size: 14 },
      user1Email:       { x: 200, y: 615, size: 14 },
      user2Name:        { x: 200, y: 578, size: 14 },
      user2Email:       { x: 200, y: 541, size: 14 },

      // Lab Results contact — right column, 1mm down
      labContactName:   { x: 920, y: 763, size: 14 },
      labPhone:         { x: 900, y: 726, size: 14 },
      labEmail:         { x: 900, y: 689, size: 14 },

      // Shipping Information — right column, checkboxes unchanged, text 1mm down
      shippingFedEx:    { x: 841, y: 637, size: 14, type: 'check' },
      shippingUPS:      { x: 926, y: 637, size: 14, type: 'check' },
      shippingAddress:  { x: 950, y: 615, size: 14 },

      // Scheduling Pickup — left column, text 1mm down, checkboxes unchanged
      pickupAddress:    { x: 200, y: 425, size: 14 },
      carrierFedEx:     { x: 198, y: 373, size: 14, type: 'check' },
      carrierUPS:       { x: 283, y: 373, size: 14, type: 'check' },
      pickupTimeWindow: { x: 220, y: 351, size: 14 },

      dayMon:           { x: 196, y: 299, size: 14, type: 'check' },
      dayTue:           { x: 303, y: 299, size: 14, type: 'check' },
      dayWed:           { x: 417, y: 299, size: 14, type: 'check' },
      dayThu:           { x: 559, y: 299, size: 14, type: 'check' },
      dayFri:           { x: 676, y: 299, size: 14, type: 'check' },
      daySat:           { x: 773, y: 299, size: 14, type: 'check' },

      // Sales Representative — left column, 1mm down
      salesName:        { x: 200, y: 201, size: 14 },
      salesPhone:       { x: 200, y: 164, size: 14 },
      salesEmail:       { x: 200, y: 127, size: 14 },
    },

    page2: {
      // Clinician 1 — 2mm right, 1mm down
      clin1Sig:         { x: 246, y: 1058, w: 400, h: 45, type: 'sig' },
      clin1Initials:    { x: 416, y: 1009, size: 14 },
      clin1Name:        { x: 266, y: 950, size: 14 },
      clin1Date:        { x: 841, y: 950, size: 14 },
      clin1Credentials: { x: 181, y: 888, size: 14 },
      clin1Email:       { x: 796, y: 887, size: 14 },
      clin1NPI:         { x: 196, y: 821, size: 14 },
      clin1ClinicGroup: { x: 806, y: 820, size: 14 },

      // Clinician 2 — 2mm right, 1mm down
      clin2Sig:         { x: 246, y: 708, w: 400, h: 45, type: 'sig' },
      clin2Initials:    { x: 416, y: 659, size: 14 },
      clin2Name:        { x: 266, y: 600, size: 14 },
      clin2Date:        { x: 841, y: 600, size: 14 },
      clin2Credentials: { x: 181, y: 538, size: 14 },
      clin2Email:       { x: 796, y: 537, size: 14 },
      clin2NPI:         { x: 196, y: 471, size: 14 },
      clin2ClinicGroup: { x: 806, y: 469, size: 14 },

      // Clinician 3 — 2mm right, 1mm down
      clin3Sig:         { x: 246, y: 370, w: 400, h: 45, type: 'sig' },
      clin3Initials:    { x: 416, y: 321, size: 14 },
      clin3Name:        { x: 266, y: 262, size: 14 },
      clin3Date:        { x: 841, y: 262, size: 14 },
      clin3Credentials: { x: 181, y: 200, size: 14 },
      clin3Email:       { x: 796, y: 198, size: 14 },
      clin3NPI:         { x: 196, y: 133, size: 14 },
      clin3ClinicGroup: { x: 806, y: 131, size: 14 },
    }
  };

  // ─── SIGNATURE PAD ──────────────────────────────────────────────────────────

  function initSignaturePad(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0, lastY = 0;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1a2e';
    }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }

    function startDraw(e) {
      e.preventDefault();
      drawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    }

    function draw(e) {
      if (!drawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
    }

    function stopDraw() {
      drawing = false;
    }

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
      clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
      isEmpty() {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 0) return false;
        }
        return true;
      },
      toDataURL() {
        return canvas.toDataURL('image/png');
      }
    };
  }

  // ─── FORM DATA COLLECTION ──────────────────────────────────────────────────

  function getFormData() {
    const val = id => (document.getElementById(id)?.value || '').trim();
    const radio = name => {
      const el = document.querySelector(`input[name="${name}"]:checked`);
      return el ? el.value : '';
    };
    const checked = (name, value) => {
      const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
      return el ? el.checked : false;
    };

    function formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US');
    }

    return {
      todaysDate: formatDate(val('todaysDate')),
      accountStartDate: formatDate(val('accountStartDate')),

      clientName: val('clientName'),
      address: val('address'),
      cityStateZip: val('cityStateZip'),
      clientEmail: val('clientEmail'),
      clientPhone: val('clientPhone'),
      clientFax: val('clientFax'),
      autoFax: radio('autoFax'),
      autoFaxNumber: val('autoFaxNumber'),

      user1Name: val('user1Name'),
      user1Email: val('user1Email'),
      user2Name: val('user2Name'),
      user2Email: val('user2Email'),

      labContactName: val('labContactName'),
      labPhone: val('labPhone'),
      labEmail: val('labEmail'),

      shippingType: radio('shippingType'),
      shippingAddress: val('shippingAddress'),

      pickupAddress: val('pickupAddress'),
      preferredCarrier: radio('preferredCarrier'),
      pickupTimeWindow: val('pickupTimeWindow'),
      dayMon: checked('daysAvailable', 'Monday'),
      dayTue: checked('daysAvailable', 'Tuesday'),
      dayWed: checked('daysAvailable', 'Wednesday'),
      dayThu: checked('daysAvailable', 'Thursday'),
      dayFri: checked('daysAvailable', 'Friday'),
      daySat: checked('daysAvailable', 'Saturday'),

      rejectName: val('rejectName'),
      rejectPhone: val('rejectPhone'),
      rejectEmail: val('rejectEmail'),

      salesName: val('salesName'),
      salesPhone: val('salesPhone'),
      salesEmail: val('salesEmail'),

      criticalName: val('criticalName'),
      criticalPhone: val('criticalPhone'),
      criticalEmail: val('criticalEmail'),

      providerNames: val('providerNames'),
      specializations: val('specializations'),
      providerEmails: val('providerEmails'),
      medicarePtan: val('medicarePtan'),
      npi: val('npi'),

      clin1Name: val('clin1Name'),
      clin1Initials: val('clin1Initials'),
      clin1Credentials: val('clin1Credentials'),
      clin1Date: formatDate(val('clin1Date')),
      clin1Email: val('clin1Email'),
      clin1NPI: val('clin1NPI'),
      clin1ClinicGroup: val('clin1ClinicGroup'),

      clin2Name: val('clin2Name'),
      clin2Initials: val('clin2Initials'),
      clin2Credentials: val('clin2Credentials'),
      clin2Date: formatDate(val('clin2Date')),
      clin2Email: val('clin2Email'),
      clin2NPI: val('clin2NPI'),
      clin2ClinicGroup: val('clin2ClinicGroup'),

      clin3Name: val('clin3Name'),
      clin3Initials: val('clin3Initials'),
      clin3Credentials: val('clin3Credentials'),
      clin3Date: formatDate(val('clin3Date')),
      clin3Email: val('clin3Email'),
      clin3NPI: val('clin3NPI'),
      clin3ClinicGroup: val('clin3ClinicGroup'),
    };
  }

  // ─── PDF GENERATION ─────────────────────────────────────────────────────────

  async function generateFilledPDF() {
    if (!pdfTemplateBytes) {
      alert('Please upload the PDF template first.');
      return;
    }

    const data = getFormData();
    const debug = document.getElementById('debugMode').checked;

    const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const blueInk = rgb(0.0, 0.18, 0.65);
    const checkColor = rgb(0.85, 0.0, 0.15);
    const debugColor = rgb(1, 0, 0);

    function drawField(page, mapping, value) {
      if (!value && mapping.type !== 'check' && mapping.type !== 'sig') return;
      if (mapping.type === 'check' && !value) return;

      if (debug) {
        page.drawCircle({
          x: mapping.x,
          y: mapping.y,
          size: 4,
          color: debugColor,
          opacity: 0.7,
        });
      }

      if (mapping.type === 'check') {
        page.drawText('X', {
          x: mapping.x,
          y: mapping.y,
          size: (mapping.size || 16) + 4,
          font: boldFont,
          color: checkColor,
        });
      } else if (mapping.type !== 'sig') {
        page.drawText(String(value), {
          x: mapping.x,
          y: mapping.y,
          size: (mapping.size || 16) + 2,
          font: font,
          color: blueInk,
        });
      }
    }

    // ── Page 1 ──
    if (pages.length >= 1) {
      const p1 = pages[0];
      const m = FIELD_MAP.page1;

      drawField(p1, m.todaysDate, data.todaysDate);
      drawField(p1, m.accountStartDate, data.accountStartDate);

      drawField(p1, m.clientName, data.clientName);
      drawField(p1, m.address, data.address);
      drawField(p1, m.cityStateZip, data.cityStateZip);
      drawField(p1, m.clientEmail, data.clientEmail);
      drawField(p1, m.clientPhone, data.clientPhone);
      drawField(p1, m.clientFax, data.clientFax);
      drawField(p1, m.autoFaxYes, data.autoFax === 'Yes');
      drawField(p1, m.autoFaxNo, data.autoFax === 'No');
      drawField(p1, m.autoFaxNumber, data.autoFaxNumber);

      drawField(p1, m.user1Name, data.user1Name);
      drawField(p1, m.user1Email, data.user1Email);
      drawField(p1, m.user2Name, data.user2Name);
      drawField(p1, m.user2Email, data.user2Email);

      drawField(p1, m.labContactName, data.labContactName);
      drawField(p1, m.labPhone, data.labPhone);
      drawField(p1, m.labEmail, data.labEmail);

      drawField(p1, m.shippingFedEx, data.shippingType === 'FedEx');
      drawField(p1, m.shippingUPS, data.shippingType === 'UPS');
      drawField(p1, m.shippingAddress, data.shippingAddress);

      drawField(p1, m.pickupAddress, data.pickupAddress);
      drawField(p1, m.carrierFedEx, data.preferredCarrier === 'FedEx');
      drawField(p1, m.carrierUPS, data.preferredCarrier === 'UPS');
      drawField(p1, m.pickupTimeWindow, data.pickupTimeWindow);
      drawField(p1, m.dayMon, data.dayMon);
      drawField(p1, m.dayTue, data.dayTue);
      drawField(p1, m.dayWed, data.dayWed);
      drawField(p1, m.dayThu, data.dayThu);
      drawField(p1, m.dayFri, data.dayFri);
      drawField(p1, m.daySat, data.daySat);

      drawField(p1, m.rejectName, data.rejectName);
      drawField(p1, m.rejectPhone, data.rejectPhone);
      drawField(p1, m.rejectEmail, data.rejectEmail);

      drawField(p1, m.salesName, data.salesName);
      drawField(p1, m.salesPhone, data.salesPhone);
      drawField(p1, m.salesEmail, data.salesEmail);

      drawField(p1, m.criticalName, data.criticalName);
      drawField(p1, m.criticalPhone, data.criticalPhone);
      drawField(p1, m.criticalEmail, data.criticalEmail);

      drawField(p1, m.providerNames, data.providerNames);
      drawField(p1, m.specializations, data.specializations);
      drawField(p1, m.providerEmails, data.providerEmails);
      drawField(p1, m.medicarePtan, data.medicarePtan);
      drawField(p1, m.npi, data.npi);
    }

    // ── Page 2 ──
    if (pages.length >= 2) {
      const p2 = pages[1];
      const m = FIELD_MAP.page2;

      for (let i = 1; i <= 3; i++) {
        const prefix = `clin${i}`;
        drawField(p2, m[prefix + 'Name'], data[prefix + 'Name']);
        drawField(p2, m[prefix + 'Initials'], data[prefix + 'Initials']);
        drawField(p2, m[prefix + 'Credentials'], data[prefix + 'Credentials']);
        drawField(p2, m[prefix + 'Date'], data[prefix + 'Date']);
        drawField(p2, m[prefix + 'Email'], data[prefix + 'Email']);
        drawField(p2, m[prefix + 'NPI'], data[prefix + 'NPI']);
        drawField(p2, m[prefix + 'ClinicGroup'], data[prefix + 'ClinicGroup']);

        const pad = signaturePads[`sigPad${i}`];
        if (pad && !pad.isEmpty()) {
          try {
            const sigDataUrl = pad.toDataURL();
            const sigBytes = await fetch(sigDataUrl).then(r => r.arrayBuffer());
            const sigImage = await pdfDoc.embedPng(sigBytes);
            const sigMapping = m[prefix + 'Sig'];
            p2.drawImage(sigImage, {
              x: sigMapping.x,
              y: sigMapping.y,
              width: sigMapping.w,
              height: sigMapping.h,
            });
          } catch (err) {
            console.warn(`Could not embed signature ${i}:`, err);
          }
        }
      }
    }

    const filledBytes = await pdfDoc.save();
    downloadPDF(filledBytes, 'Account_Setup_Form_Filled.pdf');
  }

  function downloadPDF(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── INITIALIZATION ─────────────────────────────────────────────────────────

  async function autoLoadPDF() {
    const uploadSection = document.querySelector('.pdf-upload-section');
    const uploadStatus = document.getElementById('uploadStatus');
    const generateBtn = document.getElementById('btnGeneratePDF');

    try {
      const resp = await fetch('Account setup form updated.pdf');
      if (!resp.ok) throw new Error('PDF not found on server');
      pdfTemplateBytes = await resp.arrayBuffer();
      uploadSection.classList.add('has-file');
      uploadStatus.textContent = 'Template loaded automatically';
      generateBtn.disabled = false;
    } catch (e) {
      console.warn('Auto-load failed, user must upload manually:', e.message);
    }
  }

  function init() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todaysDate').value = today;

    const pdfInput = document.getElementById('pdfUpload');
    const uploadSection = document.querySelector('.pdf-upload-section');
    const uploadStatus = document.getElementById('uploadStatus');
    const generateBtn = document.getElementById('btnGeneratePDF');

    autoLoadPDF();

    pdfInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      pdfTemplateBytes = await file.arrayBuffer();
      uploadSection.classList.add('has-file');
      uploadStatus.textContent = `Loaded: ${file.name}`;
      generateBtn.disabled = false;
    });

    document.querySelectorAll('input[name="autoFax"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const show = document.querySelector('input[name="autoFax"]:checked')?.value === 'Yes';
        document.getElementById('autoFaxNumberGroup').style.display = show ? '' : 'none';
      });
    });

    ['sigPad1', 'sigPad2', 'sigPad3'].forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        signaturePads[id] = initSignaturePad(canvas);
      }
    });

    document.querySelectorAll('.btn-clear-sig').forEach(btn => {
      btn.addEventListener('click', () => {
        const padId = btn.dataset.pad;
        if (signaturePads[padId]) signaturePads[padId].clear();
      });
    });

    generateBtn.addEventListener('click', async () => {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      try {
        await generateFilledPDF();
      } catch (err) {
        console.error(err);
        alert('Error generating PDF: ' + err.message);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Filled PDF';
      }
    });

    document.getElementById('accountForm').addEventListener('reset', () => {
      setTimeout(() => {
        Object.values(signaturePads).forEach(p => p.clear());
        document.getElementById('autoFaxNumberGroup').style.display = 'none';
      }, 10);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
