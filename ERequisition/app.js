(function () {
  'use strict';

  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const PDF_TEMPLATE = 'RMDS REQ Form April 10.pdf';
  const SOURCE_WIDTH = 1364;
  const SOURCE_HEIGHT = 1670;
  const TEXT_SIZE = 20;
  const SMALL_TEXT_SIZE = 16;
  const CHECK_SIZE = 14;

  let pdfTemplateBytes = null;
  let signaturePad = null;

  const TEXT_FIELDS = {
    practiceName: { x: 575, top: 116, size: TEXT_SIZE, maxWidth: 300 },
    physician: { x: 970, top: 116, size: TEXT_SIZE, maxWidth: 170 },
    npi: { x: 1190, top: 116, size: SMALL_TEXT_SIZE, maxWidth: 130 },
    phoneNo: { x: 546, top: 157, size: SMALL_TEXT_SIZE, maxWidth: 260 },
    practiceAddress: { x: 865, top: 157, size: SMALL_TEXT_SIZE, maxWidth: 450 },
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
    diagnosisCodes: { x: 230, top: 577, size: TEXT_SIZE, maxWidth: 1020 },
    otherLabTest: { x: 1054, top: 1449, size: SMALL_TEXT_SIZE, maxWidth: 170, lineHeight: 18 },
    specialInstructions: { x: 231, top: 1626, size: SMALL_TEXT_SIZE, maxWidth: 1050, lineHeight: 18 }
  };

  // Checkbox coordinates - extracted from source PDF (1364 x 1670) using PyMuPDF
  // These are the top-left corner coordinates of checkbox rectangles
  // The drawCheck function adds offsets to center the X mark
  const CHECK_FIELDS = [
    // Gender checkboxes (top=316)
    { id: 'genderM', x: 1194, top: 316 }, { id: 'genderF', x: 1252, top: 316 },
    // Billing checkboxes (top=493)
    { id: 'medicare', x: 64, top: 493 }, { id: 'medicaid', x: 182, top: 493 }, { id: 'otherInsurance', x: 301, top: 493 },
    // Reason for Mobile X-Ray row (top=614)
    { id: 'homebound', x: 341, top: 614 }, { id: 'acuteCondition', x: 449, top: 614 }, { id: 'nonAmbulatory', x: 591, top: 614 }, { id: 'medicalConditionUnstable', x: 736, top: 614 },
    
    // X-Ray Column 1 (x=67) - Main checkboxes
    { id: 'xrayAbdomen2v', x: 67, top: 676 }, { id: 'xrayAbdomenKub', x: 67, top: 699 },
    { id: 'xrayAnkle', x: 67, top: 723 }, { id: 'xrayChest', x: 67, top: 747 }, { id: 'xrayChestEkg', x: 67, top: 770 },
    { id: 'xrayClavicle', x: 67, top: 794 }, { id: 'xrayElbow', x: 67, top: 820 }, { id: 'xrayFemur', x: 67, top: 846 },
    { id: 'xrayForearm', x: 67, top: 871 }, { id: 'xrayFacialBones', x: 67, top: 897 }, { id: 'xrayHand', x: 67, top: 921 },
    { id: 'xrayHip', x: 67, top: 944 },
    
    // X-Ray Column 1 - L checkboxes (x=256)
    { id: 'xrayAnkleL', x: 256, top: 723 }, { id: 'xrayChest1v', x: 256, top: 746 },
    { id: 'xrayElbowL', x: 256, top: 818 }, { id: 'xrayFemurL', x: 256, top: 846 }, { id: 'xrayForearmL', x: 256, top: 871 },
    { id: 'xrayHandL', x: 256, top: 922 }, { id: 'xrayHipL', x: 256, top: 945 },
    
    // X-Ray Column 1 - R checkboxes (x=308 or x=309)
    { id: 'xrayAnkleR', x: 308, top: 723 }, { id: 'xrayChest2v', x: 309, top: 746 },
    { id: 'xrayElbowR', x: 308, top: 819 }, { id: 'xrayFemurR', x: 308, top: 846 }, { id: 'xrayForearmR', x: 308, top: 872 },
    { id: 'xrayHandR', x: 309, top: 921 }, { id: 'xrayHipR', x: 309, top: 945 },
    
    // X-Ray Column 2 (x=370)
    { id: 'xrayHipPelvis', x: 370, top: 682 },
    { id: 'xrayHipPelvisL', x: 595, top: 682 }, { id: 'xrayHipPelvisR', x: 640, top: 680 },
    { id: 'xrayBilateralHipPelvis', x: 362, top: 700 },
    { id: 'xrayHumerus', x: 370, top: 730 },
    { id: 'xrayHumerusL', x: 595, top: 728 }, { id: 'xrayHumerusR', x: 640, top: 728 },
    { id: 'xrayKnee', x: 369, top: 753 },
    { id: 'xrayKneeL', x: 594, top: 752 }, { id: 'xrayKneeR', x: 640, top: 752 },
    { id: 'xrayMandible', x: 362, top: 771 }, { id: 'xrayNasalBones', x: 362, top: 794 },
    { id: 'xrayPelvis', x: 362, top: 818 },
    { id: 'xrayRibs', x: 370, top: 852 },
    { id: 'xrayRibsL', x: 555, top: 848 }, { id: 'xrayRibsR', x: 595, top: 849 }, { id: 'xrayRibsB', x: 640, top: 848 },
    { id: 'xrayShoulder', x: 369, top: 878 },
    { id: 'xrayShoulderL', x: 556, top: 877 }, { id: 'xrayShoulderR', x: 596, top: 878 }, { id: 'xrayShoulderB', x: 640, top: 879 },
    { id: 'xraySpineCervical', x: 362, top: 895 }, { id: 'xraySpineThoracic', x: 362, top: 919 }, { id: 'xraySpineLumbar', x: 362, top: 942 },
    
    
    
    // X-Ray Column 3 (x=685)
    { id: 'xraySacrum', x: 676, top: 674 }, { id: 'xraySinus', x: 676, top: 698 }, { id: 'xraySkull', x: 676, top: 721 },
    { id: 'xrayToes', x: 685, top: 750 },
    { id: 'xrayToesL', x: 846, top: 748 }, { id: 'xrayToesR', x: 891, top: 748 }, { id: 'xrayToesB', x: 936, top: 746 },
    { id: 'xrayWrist', x: 685, top: 775 },
    { id: 'xrayWristL', x: 849, top: 773 }, { id: 'xrayWristR', x: 891, top: 772 }, { id: 'xrayWristB', x: 936, top: 774 },
    { id: 'xrayFoot', x: 685, top: 797 },
    { id: 'xrayFootL', x: 892, top: 799 }, { id: 'xrayFootR', x: 937, top: 798 },
    { id: 'xrayTibFib', x: 685, top: 822 },
    { id: 'xrayTibFibL', x: 891, top: 822 }, { id: 'xrayTibFibR', x: 937, top: 822 },
    { id: 'xrayOther', x: 676, top: 841 },
    
    // Ultrasound Column (moved 2mm left, 1mm up total)
    { id: 'usAdultEcho', x: 973, top: 676 }, { id: 'usCarotid', x: 973, top: 700 },
    { id: 'usArterialUpper', x: 972, top: 720 }, { id: 'usArterialLower', x: 972, top: 745 },
    { id: 'usArterialAbi', x: 974, top: 770 }, { id: 'usVenousUpper', x: 974, top: 794 },
    { id: 'usVenousLower', x: 972, top: 820 }, { id: 'usRenal', x: 975, top: 846 },
    { id: 'usAbdominal', x: 972, top: 872 }, { id: 'usPelvic', x: 972, top: 897 },
    { id: 'usThyroid', x: 974, top: 923 }, { id: 'usAortaIvc', x: 974, top: 947 },
    
    // Wellness panels (x=1011)
    { id: 'wellnessFemale', x: 1011, top: 1007 }, { id: 'wellnessMen', x: 1011, top: 1195 },
    
    // Urine Drug Testing column (x=71)
    { id: 'urineDrugScreen', x: 71, top: 1052 }, { id: 'urineDrugConfirmation', x: 71, top: 1073 },
    { id: 'screenConfirmationEtg', x: 71, top: 1093 }, { id: 'urinalysis', x: 71, top: 1112 },
    
    // Molecular Testing column (x=70-95)
    { id: 'uaUtiPcr', x: 70, top: 1165 }, { id: 'uaUtiPcrWithoutStd', x: 95, top: 1212 }, { id: 'uaUtiPcrWithStd', x: 95, top: 1234 },
    { id: 'respiratoryPanel', x: 70, top: 1266 }, { id: 'woundPanel', x: 70, top: 1312 },
    { id: 'nailPanel', x: 70, top: 1343 }, { id: 'giPanel', x: 70, top: 1373 }, { id: 'pgxComprehensive', x: 70, top: 1444 },
    
    // Blood Panel Column 1 (x=381-382)
    { id: 'compMetabolicPanel', x: 381, top: 1027 }, { id: 'lipidPanel', x: 380, top: 1044 },
    { id: 'albumin', x: 382, top: 1066 }, { id: 'aldosterone', x: 382, top: 1083 },
    { id: 'alkPhos', x: 382, top: 1101 }, { id: 'alt', x: 382, top: 1119 },
    { id: 'amylase', x: 382, top: 1136 }, { id: 'antiHav', x: 382, top: 1155 },
    { id: 'antiHavIgm', x: 382, top: 1172 }, { id: 'antiHbc', x: 382, top: 1190 },
    { id: 'antiHbcIgm', x: 382, top: 1208 }, { id: 'antiHbs', x: 382, top: 1225 },
    { id: 'antiHcv', x: 382, top: 1243 }, { id: 'antiTg', x: 382, top: 1261 },
    { id: 'antiTpo', x: 382, top: 1279 }, { id: 'aptt', x: 382, top: 1297 },
    { id: 'ast', x: 382, top: 1315 }, { id: 'bilirubinDirect', x: 382, top: 1332 },
    { id: 'bilirubinTotal', x: 382, top: 1350 }, { id: 'bun', x: 382, top: 1368 },
    { id: 'cbcWithDiff', x: 382, top: 1386 }, { id: 'c3', x: 382, top: 1403 },
    { id: 'c4', x: 382, top: 1421 }, { id: 'ca125', x: 382, top: 1439 },
    { id: 'ca153', x: 382, top: 1457 }, { id: 'ca199', x: 382, top: 1475 },
    { id: 'calcium', x: 382, top: 1493 }, { id: 'chloride', x: 382, top: 1511 },
    { id: 'cholesterolTotal', x: 382, top: 1528 }, { id: 'ck', x: 382, top: 1546 },
    { id: 'co2', x: 382, top: 1563 }, { id: 'cortisolAm', x: 382, top: 1582 },
    
    // Blood Panel Column 2 (x=519-534)
    { id: 'hepaticProfile', x: 534, top: 1027 }, { id: 'basicMetabolicPanel', x: 534, top: 1044 },
    { id: 'cortisolPm', x: 519, top: 1066 }, { id: 'cPeptide', x: 519, top: 1083 },
    { id: 'creatinine', x: 519, top: 1101 }, { id: 'dheaS', x: 519, top: 1119 },
    { id: 'digoxin', x: 519, top: 1136 }, { id: 'eaIgG', x: 519, top: 1155 },
    { id: 'ebnaIgG', x: 519, top: 1172 }, { id: 'ebvIgM', x: 519, top: 1190 },
    { id: 'esr', x: 519, top: 1208 }, { id: 'estradiol', x: 519, top: 1225 },
    { id: 'ferritin', x: 519, top: 1243 }, { id: 'folate', x: 519, top: 1261 },
    { id: 'freeT3', x: 519, top: 1297 },
    { id: 'freeT4', x: 519, top: 1315 }, { id: 'fsh', x: 519, top: 1332 },
    { id: 'ggt', x: 519, top: 1350 }, { id: 'glucose', x: 519, top: 1368 },
    { id: 'hPyloriIgG', x: 519, top: 1385 }, { id: 'hbsAg', x: 519, top: 1421 },
    { id: 'hcgB', x: 519, top: 1439 }, { id: 'hdl', x: 519, top: 1457 },
    { id: 'hematocrit', x: 519, top: 1475 }, { id: 'hemoglobin', x: 519, top: 1493 },
    { id: 'hepatitis', x: 519, top: 1511 }, { id: 'hgbA1c', x: 519, top: 1528 },
    { id: 'hivScreening', x: 519, top: 1546 }, { id: 'hsCrp', x: 519, top: 1563 },
    { id: 'hsv1IgG', x: 519, top: 1582 },
    
    // Blood Panel Column 3 (x=668-691)
    { id: 'renalPanel', x: 691, top: 1044 }, { id: 'hsv2IgG', x: 668, top: 1066 },
    { id: 'igA', x: 668, top: 1083 }, { id: 'igG', x: 668, top: 1101 },
    { id: 'igM', x: 668, top: 1119 }, { id: 'insulin', x: 668, top: 1136 },
    { id: 'ironTibc', x: 668, top: 1155 }, { id: 'lactate', x: 668, top: 1172 },
    { id: 'ldh', x: 668, top: 1190 }, { id: 'ldl', x: 668, top: 1208 },
    { id: 'lh', x: 668, top: 1225 }, { id: 'lipase', x: 668, top: 1243 },
    { id: 'lithium', x: 668, top: 1261 }, { id: 'magnesium', x: 668, top: 1279 },
    { id: 'measlesIgG', x: 668, top: 1297 }, { id: 'mononucleosis', x: 668, top: 1314 },
    { id: 'mumpsIgG', x: 668, top: 1350 }, { id: 'phosphorus', x: 668, top: 1368 },
    { id: 'potassium', x: 668, top: 1386 }, { id: 'prealbumin', x: 668, top: 1403 },
    { id: 'proBnpII', x: 668, top: 1421 }, { id: 'procalcitonin', x: 668, top: 1439 },
    { id: 'progesterone', x: 668, top: 1457 }, { id: 'prolactin', x: 668, top: 1475 },
    { id: 'psaFree', x: 668, top: 1493 }, { id: 'psaTotal', x: 668, top: 1511 },
    { id: 'pt', x: 668, top: 1528 }, { id: 'pth', x: 668, top: 1546 },
    { id: 'quantiferonTbGold', x: 668, top: 1565 },
    
    // Blood Panel Column 4 (x=827)
    { id: 'reticulocyteCount', x: 827, top: 1031 }, { id: 'rheumatoidFactor', x: 827, top: 1048 },
    { id: 'rubellaIgG', x: 827, top: 1065 }, { id: 'rubellaIgM', x: 827, top: 1080 },
    { id: 'shbg', x: 827, top: 1097 }, { id: 'sodium', x: 827, top: 1114 },
    { id: 'syphilis', x: 827, top: 1131 }, { id: 'testosterone', x: 827, top: 1148 },
    { id: 'totalProtein', x: 827, top: 1163 }, { id: 'totalPsa', x: 827, top: 1180 },
    { id: 'totalT3', x: 827, top: 1197 }, { id: 'totalT4', x: 827, top: 1212 },
    { id: 'transferrin', x: 827, top: 1230 }, { id: 'triglycerides', x: 827, top: 1245 },
    { id: 'tsh', x: 827, top: 1262 }, { id: 'tUptake', x: 827, top: 1279 },
    { id: 'uibc', x: 827, top: 1296 }, { id: 'uricAcid', x: 827, top: 1312 },
    { id: 'urineMicroalbumin', x: 827, top: 1329 }, { id: 'valproicAcid', x: 827, top: 1363 },
    { id: 'vancomycin', x: 827, top: 1379 }, { id: 'vcaIgG', x: 827, top: 1396 },
    { id: 'vitaminB12', x: 827, top: 1411 }, { id: 'vitaminD', x: 827, top: 1428 },
    { id: 'vzvIgG', x: 827, top: 1445 }, { id: 'wbc', x: 827, top: 1461 },
    { id: 'albuminCreatinineRandomUrine', x: 827, top: 1490 },
    { id: 'allergyTestPanel', x: 827, top: 1529 }, { id: 'allergyTestPanelInhalant', x: 849, top: 1546 },
    { id: 'allergyTestPanelFood', x: 849, top: 1561 }
  ];

  const CHECKBOX_GROUPS = {
    reasonFields: [['homebound', 'Homebound'], ['acuteCondition', 'Acute Condition'], ['nonAmbulatory', 'Non Ambulatory'], ['medicalConditionUnstable', 'Medical Condition Unstable']],
    xrayFields: [
      ['xrayAbdomen2v', 'Abdomen 2V'], ['xrayAbdomenKub', 'Abdomen (KUB)'],
      ['xrayAnkle', 'Ankle 2V/3V'], ['xrayAnkleL', 'Ankle - L'], ['xrayAnkleR', 'Ankle - R'],
      ['xrayChest', 'Chest'], ['xrayChest1v', 'Chest 1V'], ['xrayChest2v', 'Chest 2V'],
      ['xrayChestEkg', 'Chest X-Ray with EKG'],
      ['xrayClavicle', 'Clavicle'],
      ['xrayElbow', 'Elbow 2V/3V'], ['xrayElbowL', 'Elbow - L'], ['xrayElbowR', 'Elbow - R'],
      ['xrayFemur', 'Femur 2V'], ['xrayFemurL', 'Femur - L'], ['xrayFemurR', 'Femur - R'],
      ['xrayForearm', 'Forearm 2V/3V'], ['xrayForearmL', 'Forearm - L'], ['xrayForearmR', 'Forearm - R'],
      ['xrayFacialBones', 'Facial Bones'],
      ['xrayHand', 'Hand 2V/3V'], ['xrayHandL', 'Hand - L'], ['xrayHandR', 'Hand - R'],
      ['xrayHip', 'Hip 2V'], ['xrayHipL', 'Hip - L'], ['xrayHipR', 'Hip - R'],
      ['xrayHipPelvis', 'Hip with Pelvis'], ['xrayHipPelvisL', 'Hip Pelvis - L'], ['xrayHipPelvisR', 'Hip Pelvis - R'],
      ['xrayBilateralHipPelvis', 'Bilateral Hip with Pelvis'],
      ['xrayHumerus', 'Humerus 2V'], ['xrayHumerusL', 'Humerus - L'], ['xrayHumerusR', 'Humerus - R'],
      ['xrayKnee', 'Knee 2V/3V'], ['xrayKneeL', 'Knee - L'], ['xrayKneeR', 'Knee - R'],
      ['xrayMandible', 'Mandible 3V/4V'], ['xrayNasalBones', 'Nasal Bones 3V'], ['xrayPelvis', 'Pelvis'],
      ['xrayRibs', 'Ribs 2V'], ['xrayRibsL', 'Ribs - L'], ['xrayRibsR', 'Ribs - R'], ['xrayRibsB', 'Ribs - B'],
      ['xrayShoulder', 'Shoulder 2V'], ['xrayShoulderL', 'Shoulder - L'], ['xrayShoulderR', 'Shoulder - R'], ['xrayShoulderB', 'Shoulder - B'],
      ['xraySpineCervical', 'Spine - Cervical'], ['xraySpineThoracic', 'Spine - Thoracic'], ['xraySpineLumbar', 'Spine - Lumbar'],
      ['xraySacrum', 'Sacrum/Coccyx'],
      ['xraySinus', 'Sinus Series'], ['xraySkull', 'Skull'],
      ['xrayToes', 'Toes 2V'], ['xrayToesL', 'Toes - L'], ['xrayToesR', 'Toes - R'], ['xrayToesB', 'Toes - B'],
      ['xrayWrist', 'Wrist 2V/3V'], ['xrayWristL', 'Wrist - L'], ['xrayWristR', 'Wrist - R'], ['xrayWristB', 'Wrist - B'],
      ['xrayFoot', 'Foot X-Ray'], ['xrayFootL', 'Foot - L'], ['xrayFootR', 'Foot - R'],
      ['xrayTibFib', 'Tib/Fib X-Ray'], ['xrayTibFibL', 'Tib/Fib - L'], ['xrayTibFibR', 'Tib/Fib - R'],
      ['xrayOther', 'Other X-Ray']
    ],
    ultrasoundFields: [
      ['usAdultEcho', 'Adult Echocardiogram'], ['usCarotid', 'Carotid Doppler'],
      ['usArterialUpper', 'Arterial Doppler Upper Extremity'],
      ['usArterialLower', 'Arterial Doppler Lower Extremity'],
      ['usArterialAbi', 'Arterial Doppler with ABI / Seg Press'],
      ['usVenousUpper', 'Venous Doppler Upper Extremity'],
      ['usVenousLower', 'Venous Doppler Lower Extremity'],
      ['usRenal', 'Renal / Renal Artery Doppler'], ['usAbdominal', 'Abdominal Ultrasound'],
      ['usPelvic', 'Pelvic Ultrasound'], ['usThyroid', 'Thyroid Ultrasound'], ['usAortaIvc', 'Aorta/IVC Duplex Doppler']
    ],
    urineFields: [['urineDrugScreen', 'Urine drug screen (16)'], ['urineDrugConfirmation', 'Urine drug confirmation (57)'], ['screenConfirmationEtg', 'Screen & Confirmation with ETG/ETS (74)'], ['urinalysis', 'Urinalysis (10)']],
    molecularFields: [
      ['uaUtiPcr', 'Urine Analysis & UTI PCR'], ['uaUtiPcrWithoutStd', 'UTI - Without STDs'], ['uaUtiPcrWithStd', 'UTI - With STDs'],
      ['respiratoryPanel', 'Respiratory Panel with ABR PCR'], ['woundPanel', 'Wound Panel with ABR PCR'], ['nailPanel', 'Nail Panel with ABR PCR'], ['giPanel', 'Gastrointestinal Infection Panel with ABR PCR'], ['pgxComprehensive', 'Pharmacogenomics PGx Comprehensive Panel']
    ],
    bloodFields: [
      // Panel headers
      ['compMetabolicPanel', 'Comp Metabolic Panel'], ['lipidPanel', 'Lipid Panel'],
      ['hepaticProfile', 'Hepatic Profile'], ['basicMetabolicPanel', 'Basic Metabolic Panel'],
      ['renalPanel', 'Renal Panel'], ['reticulocyteCount', 'Reticulocyte Count'],
      // Column 1 (A-C)
      ['albumin', 'Albumin'], ['aldosterone', 'Aldosterone'], ['alkPhos', 'Alk Phos'], ['alt', 'ALT'],
      ['amylase', 'Amylase'], ['antiHav', 'Anti-HAV'], ['antiHavIgm', 'Anti-HAV IgM'],
      ['antiHbc', 'Anti-Hbc'], ['antiHbcIgm', 'Anti-Hbc IgM'], ['antiHbs', 'Anti-HBs'],
      ['antiHcv', 'Anti-HCV'], ['antiTg', 'Anti-Tg'], ['antiTpo', 'Anti-TPO'],
      ['aptt', 'APTT'], ['ast', 'AST'], ['bilirubinDirect', 'Bilirubin, Direct'],
      ['bilirubinTotal', 'Bilirubin, Total'], ['bun', 'BUN'], ['cbcWithDiff', 'CBC w Diff'], ['c3', 'C3'],
      ['c4', 'C4'], ['ca125', 'CA 125'], ['ca153', 'CA 15-3'], ['ca199', 'CA 19-9'],
      ['calcium', 'Calcium'], ['chloride', 'Chloride'], ['cholesterolTotal', 'Cholesterol Total'],
      ['ck', 'CK'], ['co2', 'CO2'], ['cortisolAm', 'Cortisol AM'],
      // Column 2 (C-H)
      ['cortisolPm', 'Cortisol PM'], ['cPeptide', 'C-Peptide'], ['creatinine', 'Creatinine'],
      ['dheaS', 'DHEA-S'], ['digoxin', 'Digoxin'], ['eaIgG', 'EA IgG'],
      ['ebnaIgG', 'EBNA IgG'], ['ebvIgM', 'EBV IgM'], ['esr', 'ESR'], ['estradiol', 'Estradiol'],
      ['ferritin', 'Ferritin'], ['folate', 'Folate'],
      ['freeT3', 'Free T3'], ['freeT4', 'Free T4'], ['fsh', 'FSH'], ['ggt', 'GGT'],
      ['glucose', 'Glucose'], ['hPyloriIgG', 'H. pylori IgG'], ['hbsAg', 'HBsAg'],
      ['hcgB', 'HCG+B'], ['hdl', 'HDL'], ['hematocrit', 'Hematocrit'], ['hemoglobin', 'Hemoglobin'],
      ['hepatitis', 'Hepatitis'], ['hgbA1c', 'HgbA1C'], ['hivScreening', 'HIV Screening'],
      ['hsCrp', 'hsCRP'], ['hsv1IgG', 'HSV 1 IgG'],
      // Column 3 (H-P)
      ['hsv2IgG', 'HSV 2 IgG'], ['igA', 'IgA'], ['igG', 'IgG'], ['igM', 'IgM'], ['insulin', 'Insulin'],
      ['ironTibc', 'Iron and TIBC'], ['lactate', 'Lactate'], ['ldh', 'LDH'], ['ldl', 'LDL'],
      ['lh', 'LH'], ['lipase', 'Lipase'], ['lithium', 'Lithium'], ['magnesium', 'Magnesium'],
      ['measlesIgG', 'Measles IgG'], ['mononucleosis', 'Mononucleosis'], ['mumpsIgG', 'Mumps IgG'],
      ['phosphorus', 'Phosphorus'], ['potassium', 'Potassium'], ['prealbumin', 'Prealbumin'],
      ['proBnpII', 'proBNP II'], ['procalcitonin', 'Procalcitonin'], ['progesterone', 'Progesterone'],
      ['prolactin', 'Prolactin'], ['psaFree', 'PSA, Free'], ['psaTotal', 'PSA, Total'],
      ['pt', 'PT'], ['pth', 'PTH'], ['quantiferonTbGold', 'QuantiFERON TB GOLD'],
      // Column 4 (R-V)
      ['rheumatoidFactor', 'Rheumatoid Factor'], ['rubellaIgG', 'Rubella IgG'], ['rubellaIgM', 'Rubella IgM'],
      ['shbg', 'SHBG'], ['sodium', 'Sodium'], ['syphilis', 'Syphilis'], ['testosterone', 'Testosterone'],
      ['totalProtein', 'Total Protein'], ['totalPsa', 'TOTAL PSA'], ['totalT3', 'Total T3'], ['totalT4', 'Total T4'],
      ['transferrin', 'Transferrin'], ['triglycerides', 'Triglycerides'], ['tsh', 'TSH'], ['tUptake', 'T-Uptake'],
      ['uibc', 'UIBC'], ['uricAcid', 'Uric Acid'], ['urineMicroalbumin', 'Urine Microalbumin'],
      ['valproicAcid', 'Valproic Acid'], ['vancomycin', 'Vancomycin'], ['vcaIgG', 'VCA IgG'], ['vitaminB12', 'Vitamin B12'],
      ['vitaminD', 'Vitamin D'], ['vzvIgG', 'VZV IgG'], ['wbc', 'WBC'],
      ['albuminCreatinineRandomUrine', 'Albumin Creatinine Random Urine'],
      ['allergyTestPanel', 'Allergy Test Panel'], ['allergyTestPanelInhalant', 'Allergy - Inhalant Allergens-36'], ['allergyTestPanelFood', 'Allergy - Food Allergens-25']
    ],
    wellnessFields: [['wellnessFemale', 'Wellness Panel - Female'], ['wellnessMen', 'Wellness Panel - Men']]
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
      
      // Group items by base name (e.g., xrayChest -> [xrayChest, xrayChest1v, xrayChest2v])
      const groups = {};
      const standalone = [];
      
      items.forEach(([id, labelText]) => {
        // Check if this is a sub-option (ends with L, R, B, or has 1v/2v pattern)
        const suffixMatch = id.match(/^(.+?)(L|R|B|1v|2v)$/i);
        if (suffixMatch) {
          const baseId = suffixMatch[1];
          // Find if parent exists
          const parentItem = items.find(([pid]) => pid === baseId || pid === baseId.replace(/([A-Z])/g, '$1'));
          if (parentItem) {
            if (!groups[parentItem[0]]) {
              groups[parentItem[0]] = { main: parentItem, subs: [] };
            }
            groups[parentItem[0]].subs.push([id, labelText]);
          } else {
            standalone.push([id, labelText]);
          }
        } else {
          // Check if this has sub-options
          const hasSubs = items.some(([sid]) => sid.startsWith(id) && sid !== id);
          if (hasSubs) {
            if (!groups[id]) {
              groups[id] = { main: [id, labelText], subs: [] };
            } else {
              groups[id].main = [id, labelText];
            }
          } else {
            standalone.push([id, labelText]);
          }
        }
      });
      
      // Render grouped items
      Object.values(groups).forEach(group => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-with-options';
        
        // Main checkbox
        const mainLabel = document.createElement('label');
        mainLabel.className = 'main-checkbox';
        const mainInput = document.createElement('input');
        mainInput.type = 'checkbox';
        mainInput.id = group.main[0];
        mainLabel.append(mainInput, document.createTextNode(group.main[1]));
        wrapper.appendChild(mainLabel);
        
        // Sub-options container
        if (group.subs.length > 0) {
          const subsContainer = document.createElement('span');
          subsContainer.className = 'sub-options';
          group.subs.forEach(([subId, subLabel]) => {
            const subLabelEl = document.createElement('label');
            subLabelEl.className = 'sub-checkbox';
            const subInput = document.createElement('input');
            subInput.type = 'checkbox';
            subInput.id = subId;
            // Extract just L/R/B or 1V/2V from the label
            const shortLabel = subLabel.match(/- ([LRB]|1V|2V)$/i)?.[1] || subLabel.split(' - ').pop() || subLabel;
            subLabelEl.append(subInput, document.createTextNode(shortLabel));
            subsContainer.appendChild(subLabelEl);
          });
          wrapper.appendChild(subsContainer);
        }
        
        container.appendChild(wrapper);
      });
      
      // Render standalone items
      standalone.forEach(([id, labelText]) => {
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

  function drawCheck(page, field, font, color) {
    // Special offsets for X-ray checkboxes
    const xrayMainCol2 = [
      'xrayHipPelvis', 'xrayHumerus', 'xrayKnee', 'xrayRibs', 'xrayShoulder'
    ];
    const xrayMainCol3 = [
      'xrayToes', 'xrayWrist', 'xrayFoot', 'xrayTibFib'
    ];
    const xrayLRBFields = [
      'xrayHipPelvisL', 'xrayHipPelvisR',
      'xrayHumerusL', 'xrayHumerusR',
      'xrayKneeL', 'xrayKneeR',
      'xrayRibsL', 'xrayRibsR', 'xrayRibsB',
      'xrayShoulderL', 'xrayShoulderR', 'xrayShoulderB',
      'xrayToesL', 'xrayToesR', 'xrayToesB',
      'xrayWristL', 'xrayWristR', 'xrayWristB',
      'xrayFootL', 'xrayFootR',
      'xrayTibFibL', 'xrayTibFibR'
    ];
    
    let offsetX = 4, offsetY = 12; // default offset
    if (xrayMainCol2.includes(field.id)) {
      offsetX = 1;
      offsetY = 9;
    } else if (xrayMainCol3.includes(field.id)) {
      // Move 1mm left (~2.8pt) and 0.4mm up (~1.1pt)
      offsetX = -2;
      offsetY = 10;
    } else if (xrayLRBFields.includes(field.id)) {
      offsetX = -2;
      offsetY = 6;
    }
    
    const p = sourceToPdf(page, field.x + offsetX, field.top + offsetY);
    page.drawText('X', { x: p.x, y: p.y, size: CHECK_SIZE, font, color });
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
      drawCheck(page, field, font, blueInk);
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
    } catch (error) {
      console.error(error);
      alert('Could not load the PDF template. Place "' + PDF_TEMPLATE + '" in this folder and refresh.');
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
