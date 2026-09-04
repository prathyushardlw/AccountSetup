(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const PDF_TEMPLATE = 'RMDS REQ Form April 10.pdf';
  const SOURCE_WIDTH = 1364;
  const SOURCE_HEIGHT = 1670;
  const TEXT_SIZE = 20;
  const SMALL_TEXT_SIZE = 16;
  const CHECK_SIZE = 12;

  let pdfTemplateBytes = null;
  let signaturePad = null;

  const TEXT_FIELDS = {
    practiceName: { x: 575, top: 124, size: TEXT_SIZE, maxWidth: 300 },
    physician: { x: 970, top: 124, size: TEXT_SIZE, maxWidth: 170 },
    npi: { x: 1190, top: 124, size: SMALL_TEXT_SIZE, maxWidth: 130 },
    phoneNo: { x: 535, top: 171, size: SMALL_TEXT_SIZE, maxWidth: 260 },
    practiceAddress: { x: 865, top: 171, size: SMALL_TEXT_SIZE, maxWidth: 450 },
    dateOfService: { x: 1040, top: 293, size: SMALL_TEXT_SIZE, maxWidth: 190 },
    firstName: { x: 220, top: 339, size: TEXT_SIZE, maxWidth: 250 },
    lastName: { x: 650, top: 339, size: TEXT_SIZE, maxWidth: 220 },
    dob: { x: 980, top: 339, size: SMALL_TEXT_SIZE, maxWidth: 130 },
    patientAddress: { x: 160, top: 375, size: SMALL_TEXT_SIZE, maxWidth: 585 },
    patientPhone: { x: 970, top: 375, size: SMALL_TEXT_SIZE, maxWidth: 190 },
    secondaryPhone: { x: 990, top: 412, size: SMALL_TEXT_SIZE, maxWidth: 210 },
    insuranceName: { x: 530, top: 507, size: SMALL_TEXT_SIZE, maxWidth: 500 },
    policyNumber: { x: 190, top: 548, size: TEXT_SIZE, maxWidth: 450 },
    groupNumber: { x: 790, top: 548, size: TEXT_SIZE, maxWidth: 280 },
    diagnosisCodes: { x: 200, top: 589, size: TEXT_SIZE, maxWidth: 1050 },
    otherLabTest: { x: 1145, top: 1449, size: SMALL_TEXT_SIZE, maxWidth: 170, lineHeight: 18 },
    specialInstructions: { x: 165, top: 1626, size: SMALL_TEXT_SIZE, maxWidth: 1110, lineHeight: 18 }
  };

  // Checkbox coordinates - measured from source PDF (1364 x 1670)
  // The drawCheck function adds +4 to x and +12 to top for centering
  const CHECK_FIELDS = [
    // Billing checkboxes
    { id: 'medicare', x: 47, top: 497 }, { id: 'medicaid', x: 166, top: 497 },
    // Gender checkboxes
    { id: 'genderM', x: 1106, top: 337 }, { id: 'genderF', x: 1158, top: 337 },
    // Reason for Mobile X-Ray row
    { id: 'homebound', x: 579, top: 632 }, { id: 'acuteCondition', x: 688, top: 632 }, { id: 'nonAmbulatory', x: 800, top: 632 }, { id: 'medicalConditionUnstable', x: 920, top: 632 },
    // X-Ray Column 1
    { id: 'xrayAbdomen2v', x: 44, top: 678 }, { id: 'xrayAbdomenKub', x: 44, top: 700 }, { id: 'xrayAnkle', x: 44, top: 723 }, { id: 'xrayToes', x: 44, top: 745 }, { id: 'xrayChest1v', x: 44, top: 768 }, { id: 'xrayChestEkg', x: 44, top: 790 }, { id: 'xrayClavicle', x: 44, top: 812 }, { id: 'xrayElbow', x: 44, top: 835 }, { id: 'xrayFemur', x: 44, top: 857 }, { id: 'xrayForearm', x: 44, top: 880 }, { id: 'xrayFacialBones', x: 44, top: 902 }, { id: 'xrayHand', x: 44, top: 925 }, { id: 'xrayHip', x: 44, top: 947 },
    // X-Ray Column 2
    { id: 'xrayHipPelvis', x: 258, top: 678 }, { id: 'xrayBilateralHipPelvis', x: 258, top: 700 }, { id: 'xrayHumerus', x: 258, top: 723 }, { id: 'xrayKnee', x: 258, top: 768 }, { id: 'xrayMandible', x: 258, top: 790 }, { id: 'xrayNasalBones', x: 258, top: 812 }, { id: 'xrayPelvis', x: 258, top: 835 }, { id: 'xrayRibs', x: 258, top: 857 }, { id: 'xrayShoulder', x: 258, top: 880 }, { id: 'xraySpineCervical', x: 258, top: 902 }, { id: 'xraySpineThoracic', x: 258, top: 925 }, { id: 'xraySpineLumbar', x: 258, top: 947 },
    // X-Ray Column 3
    { id: 'xraySacrum', x: 505, top: 678 }, { id: 'xraySinus', x: 505, top: 700 }, { id: 'xraySkull', x: 505, top: 723 }, { id: 'xrayWrist', x: 505, top: 790 }, { id: 'xrayFoot', x: 505, top: 812 }, { id: 'xrayTibFib', x: 505, top: 835 }, { id: 'xrayOther', x: 505, top: 857 },
    // Ultrasound Column
    { id: 'usAdultEcho', x: 846, top: 678 }, { id: 'usCarotid', x: 846, top: 700 }, { id: 'usArterialUpper', x: 846, top: 723 }, { id: 'usArterialLower', x: 846, top: 745 }, { id: 'usArterialAbi', x: 846, top: 790 }, { id: 'usVenousUpper', x: 846, top: 812 }, { id: 'usVenousLower', x: 846, top: 835 }, { id: 'usRenal', x: 846, top: 857 }, { id: 'usAbdominal', x: 846, top: 880 }, { id: 'usPelvic', x: 846, top: 902 }, { id: 'usThyroid', x: 846, top: 925 }, { id: 'usAortaIvc', x: 846, top: 947 },
    // Urine Drug Testing column
    { id: 'urineDrugScreen', x: 44, top: 1020 }, { id: 'urineDrugConfirmation', x: 44, top: 1041 }, { id: 'screenConfirmationEtg', x: 44, top: 1063 }, { id: 'urinalysis', x: 44, top: 1085 },
    // Molecular Testing column
    { id: 'uaUtiNoStd', x: 44, top: 1152 }, { id: 'uaUtiStd', x: 44, top: 1175 }, { id: 'respiratoryPanel', x: 44, top: 1218 }, { id: 'woundPanel', x: 44, top: 1258 }, { id: 'nailPanel', x: 44, top: 1280 }, { id: 'giPanel', x: 44, top: 1303 }, { id: 'pgxComprehensive', x: 44, top: 1360 },
    // Blood Panel section
    { id: 'compMetabolicPanel', x: 310, top: 1002 }, { id: 'lipidPanel', x: 310, top: 1025 }, { id: 'hepaticProfile', x: 470, top: 1002 }, { id: 'basicMetabolicPanel', x: 470, top: 1025 }, { id: 'renalPanel', x: 630, top: 1025 }, { id: 'cbcDiff', x: 820, top: 1002 }, { id: 'reticulocyteCount', x: 820, top: 1025 }, { id: 'rheumatoidFactor', x: 820, top: 1048 },
    // Wellness panels
    { id: 'wellnessFemale', x: 900, top: 1002 }, { id: 'wellnessMen', x: 900, top: 1133 },
    // Allergy panels
    { id: 'allergyInhalant', x: 900, top: 1388 }, { id: 'allergyFood', x: 900, top: 1410 }
  ];

  const CHECKBOX_GROUPS = {
    reasonFields: [['homebound', 'Homebound'], ['acuteCondition', 'Acute Condition'], ['nonAmbulatory', 'Non Ambulatory'], ['medicalConditionUnstable', 'Medical Condition Unstable']],
    xrayFields: [['xrayAbdomen2v', 'Abdomen 2V'], ['xrayAbdomenKub', 'Abdomen (KUB)'], ['xrayAnkle', 'Ankle 2V/3V'], ['xrayToes', 'Toes 2V'], ['xrayChest1v', 'Chest 1V / 2V'], ['xrayChestEkg', 'Chest X-Ray with EKG'], ['xrayClavicle', 'Clavicle'], ['xrayElbow', 'Elbow 2V/3V'], ['xrayFemur', 'Femur 2V'], ['xrayForearm', 'Forearm 2V/3V'], ['xrayFacialBones', 'Facial Bones'], ['xrayHand', 'Hand 2V/3V'], ['xrayHip', 'Hip 2V'], ['xrayHipPelvis', 'Hip with Pelvis'], ['xrayBilateralHipPelvis', 'Bilateral Hip with Pelvis'], ['xrayHumerus', 'Humerus 2V'], ['xrayKnee', 'Knee 2V/3V'], ['xrayMandible', 'Mandible 3V/4V'], ['xrayNasalBones', 'Nasal Bones 3V'], ['xrayPelvis', 'Pelvis'], ['xrayRibs', 'Ribs 2V'], ['xrayShoulder', 'Shoulder 2V'], ['xraySpineCervical', 'Spine - Cervical'], ['xraySpineThoracic', 'Spine - Thoracic'], ['xraySpineLumbar', 'Spine - Lumbar'], ['xraySacrum', 'Sacrum/Coccyx'], ['xraySinus', 'Sinus Series'], ['xraySkull', 'Skull'], ['xrayWrist', 'Wrist 2V/3V'], ['xrayFoot', 'Foot X-Ray'], ['xrayTibFib', 'Tib/Fib X-Ray'], ['xrayOther', 'Other X-Ray']],
    ultrasoundFields: [['usAdultEcho', 'Adult Echocardiogram'], ['usCarotid', 'Carotid Doppler'], ['usArterialUpper', 'Arterial Doppler Upper Extremity'], ['usArterialLower', 'Arterial Doppler Lower Extremity'], ['usArterialAbi', 'Arterial Doppler with ABI / Seg Press'], ['usVenousUpper', 'Venous Doppler Upper Extremity'], ['usVenousLower', 'Venous Doppler Lower Extremity'], ['usRenal', 'Renal / Renal Artery Doppler'], ['usAbdominal', 'Abdominal Ultrasound'], ['usPelvic', 'Pelvic Ultrasound'], ['usThyroid', 'Thyroid Ultrasound'], ['usAortaIvc', 'Aorta/IVC Duplex Doppler']],
    urineFields: [['urineDrugScreen', 'Urine drug screen (16)'], ['urineDrugConfirmation', 'Urine drug confirmation (57)'], ['screenConfirmationEtg', 'Screen & Confirmation with ETG/ETS (74)'], ['urinalysis', 'Urinalysis (10)']],
    molecularFields: [['uaUtiNoStd', 'Urine Analysis & UTI PCR - Without STDs'], ['uaUtiStd', 'Urine Analysis & UTI PCR - With STDs'], ['respiratoryPanel', 'Respiratory Panel with ABR PCR'], ['woundPanel', 'Wound Panel with ABR PCR'], ['nailPanel', 'Nail Panel with ABR PCR'], ['giPanel', 'Gastrointestinal Infection Panel with ABR PCR'], ['pgxComprehensive', 'Pharmacogenomics PGx Comprehensive Panel']],
    bloodFields: [['compMetabolicPanel', 'Comp Metabolic Panel'], ['lipidPanel', 'Lipid Panel'], ['hepaticProfile', 'Hepatic Profile'], ['basicMetabolicPanel', 'Basic Metabolic Panel'], ['renalPanel', 'Renal Panel'], ['cbcDiff', 'CBC w Diff'], ['reticulocyteCount', 'Reticulocyte Count'], ['rheumatoidFactor', 'Rheumatoid Factor']],
    wellnessFields: [['wellnessFemale', 'Wellness Panel - Female'], ['wellnessMen', 'Wellness Panel - Men'], ['allergyInhalant', 'Allergy Test Panel - Inhalant Allergens 36'], ['allergyFood', 'Allergy Test Panel - Food Allergens 25']]
  };

  function byId(id) { return document.getElementById(id); }
  function val(id) { return (byId(id)?.value || '').trim(); }
  function checked(id) { return Boolean(byId(id)?.checked); }
  function radioVal(name) { return document.querySelector('input[name="' + name + '"]:checked')?.value || ''; }

  function activeSignatureMode() {
    return document.querySelector('.sig-tab.active')?.dataset.target === 'providerSigType' ? 'type' : 'draw';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US');
  }

  function renderCheckboxes() {
    Object.entries(CHECKBOX_GROUPS).forEach(([containerId, items]) => {
      const container = byId(containerId);
      items.forEach(([id, labelText]) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = id;
        label.append(input, document.createTextNode(labelText));
        container.appendChild(label);
      });
    });
  }

  function initSignaturePad(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1a2e';
    }

    function pos(event) {
      const rect = canvas.getBoundingClientRect();
      const point = event.touches ? event.touches[0] : event;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    function start(event) { event.preventDefault(); drawing = true; const p = pos(event); lastX = p.x; lastY = p.y; }
    function draw(event) { if (!drawing) return; event.preventDefault(); const p = pos(event); ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke(); lastX = p.x; lastY = p.y; }
    function stop() { drawing = false; }

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop);
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return {
      clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); },
      isEmpty() { const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return false; return true; },
      toDataURL() { return canvas.toDataURL('image/png'); }
    };
  }

  function sourceToPdf(page, x, top) {
    return { x: x / SOURCE_WIDTH * page.getWidth(), y: page.getHeight() - (top / SOURCE_HEIGHT * page.getHeight()) };
  }

  function scaledWidth(page, width) { return width / SOURCE_WIDTH * page.getWidth(); }

  function drawWrappedText(page, text, field, font, color) {
    if (!text) return;
    const start = sourceToPdf(page, field.x, field.top);
    const size = field.size || 8;
    const maxWidth = scaledWidth(page, field.maxWidth || 400);
    const lineHeight = field.lineHeight || size + 3;
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    words.forEach(word => {
      const next = current ? current + ' ' + word : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    lines.slice(0, 6).forEach((line, index) => page.drawText(line, { x: start.x, y: start.y - (index * lineHeight), size, font, color }));
  }

  function drawCheck(page, field, color) {
    // Offset to center X mark inside checkbox square
    const p = sourceToPdf(page, field.x + 2, field.top + 8);
    page.drawText('X', { x: p.x, y: p.y, size: CHECK_SIZE, color });
  }

  async function drawSignature(pdfDoc, page) {
    if (activeSignatureMode() === 'type') return;
    if (!signaturePad || signaturePad.isEmpty()) return;
    const dataUrl = signaturePad.toDataURL();
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const image = await pdfDoc.embedPng(bytes);
    const p = sourceToPdf(page, 300, 423);
    page.drawImage(image, { x: p.x, y: p.y - 18, width: scaledWidth(page, 360), height: 22 });
  }

  function drawTypedSignature(page, font, color) {
    if (activeSignatureMode() !== 'type') return;
    drawWrappedText(page, val('typedProviderSignature'), { x: 300, top: 438, size: 22, maxWidth: 430 }, font, color);
  }

  function hasProviderSignature() {
    if (activeSignatureMode() === 'type') return Boolean(val('typedProviderSignature'));
    return Boolean(signaturePad && !signaturePad.isEmpty());
  }

  function collectTextData() {
    return {
      practiceName: val('practiceName'), physician: val('physician'), npi: val('npi'), phoneNo: val('phoneNo'), practiceAddress: val('practiceAddress'), dateOfService: formatDate(val('dateOfService')), firstName: val('firstName'), lastName: val('lastName'), dob: formatDate(val('dob')), patientAddress: val('patientAddress'), patientPhone: val('patientPhone'), secondaryPhone: val('secondaryPhone'), insuranceName: val('insuranceName'), policyNumber: val('policyNumber'), groupNumber: val('groupNumber'), diagnosisCodes: val('diagnosisCodes'), otherLabTest: val('otherLabTest'), specialInstructions: val('specialInstructions')
    };
  }

  async function generateFilledPDF() {
    if (!hasProviderSignature()) {
      alert('Provider signature is required. Draw the signature or type it manually.');
      return;
    }

    const pdfDoc = await PDFDocument.create();
    const [page1Template, page2Template] = await pdfDoc.embedPdf(pdfTemplateBytes, [0, 1]);
    const page = pdfDoc.addPage([page1Template.width, page1Template.height]);
    page.drawPage(page1Template, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });

    if (page2Template) {
      const page2 = pdfDoc.addPage([page2Template.width, page2Template.height]);
      page2.drawPage(page2Template, { x: 0, y: 0, width: page2.getWidth(), height: page2.getHeight() });
    }

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    const blueInk = rgb(0, 0.18, 0.65);
    const data = collectTextData();

    Object.entries(TEXT_FIELDS).forEach(([id, field]) => drawWrappedText(page, data[id], field, font, blueInk));

    const gender = radioVal('gender');
    CHECK_FIELDS.forEach(field => {
      if (field.id === 'genderM' && gender !== 'M') return;
      if (field.id === 'genderF' && gender !== 'F') return;
      if (field.id !== 'genderM' && field.id !== 'genderF' && !checked(field.id)) return;
      drawCheck(page, field, blueInk);
    });

    await drawSignature(pdfDoc, page);
  drawTypedSignature(page, signatureFont, blueInk);

    const filledBytes = await pdfDoc.save({ addDefaultPage: false });
    const patientName = (data.firstName + '_' + data.lastName).replace(/[^a-zA-Z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'Patient';
    downloadPDF(filledBytes, 'RMDS_eRequisition_' + patientName + '.pdf');
  }

  async function downloadPDF(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function loadTemplate() {
    const generateBtn = byId('btnGeneratePDF');
    try {
      const response = await fetch(PDF_TEMPLATE);
      if (!response.ok) throw new Error('PDF not found');
      pdfTemplateBytes = await response.arrayBuffer();
      generateBtn.disabled = false;
      byId('pdfStatus').textContent = 'Loaded RMDS REQ Form April 10.pdf.';
    } catch (error) {
      console.error(error);
      const status = byId('pdfStatus');
      status.textContent = 'Could not load the PDF template. Place "' + PDF_TEMPLATE + '" in this folder and refresh.';
      status.classList.add('error');
    }
  }

  function init() {
    renderCheckboxes();
    loadTemplate();
    signaturePad = initSignaturePad(byId('providerSignaturePad'));
    byId('clearSignature').addEventListener('click', () => signaturePad.clear());
    document.querySelectorAll('.sig-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sig-tab').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.sig-panel').forEach(panel => panel.classList.remove('active'));
        tab.classList.add('active');
        byId(tab.dataset.target).classList.add('active');
      });
    });
    byId('erequisitionForm').addEventListener('reset', () => setTimeout(() => signaturePad.clear(), 10));
    byId('btnGeneratePDF').addEventListener('click', async () => {
      const button = byId('btnGeneratePDF');
      button.disabled = true;
      button.textContent = 'Generating...';
      try {
        await generateFilledPDF();
      } catch (error) {
        console.error(error);
        alert('Error generating PDF: ' + error.message);
      } finally {
        button.disabled = false;
        button.textContent = 'Generate Filled PDF';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
