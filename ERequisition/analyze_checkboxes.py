import fitz
import json

doc = fitz.open('RMDS REQ Form April 10.pdf')
page = doc[0]

# Get all text with positions for label matching
text_dict = page.get_text("dict")
text_items = []
for block in text_dict["blocks"]:
    if "lines" in block:
        for line in block["lines"]:
            full_line = ""
            line_x = 9999
            line_y = 0
            for span in line["spans"]:
                full_line += span['text']
                if span['bbox'][0] < line_x:
                    line_x = span['bbox'][0]
                    line_y = span['bbox'][1]
            if full_line.strip():
                text_items.append({
                    'text': full_line.strip(),
                    'x': line_x,
                    'y': line_y
                })

# Extract checkboxes
drawings = page.get_drawings()
checkboxes = []
for d in drawings:
    rect = d.get('rect')
    if rect:
        w = round(rect.width)
        h = round(rect.height)
        if 12 <= w <= 22 and 12 <= h <= 22 and abs(w - h) <= 3:
            checkboxes.append({'x': round(rect.x0), 'top': round(rect.y0)})

# Remove duplicates
seen = set()
unique = []
for cb in checkboxes:
    key = (cb['x'], cb['top'])
    if key not in seen:
        seen.add(key)
        unique.append(cb)

unique.sort(key=lambda c: (c['top'], c['x']))

# Find text line near a checkbox
def find_nearby_text(cb_x, cb_top):
    best = []
    for t in text_items:
        # Same row (within 20px vertically)
        if abs(t['y'] - cb_top) < 20:
            best.append((t['x'], t['text']))
    best.sort()
    return best

# Group by vertical position
print("=" * 80)
print("ANALYZING CHECKBOX LAYOUT BY ROWS")
print("=" * 80)

current_row = -100
for cb in unique:
    if cb['top'] > current_row + 20:
        # New row
        current_row = cb['top']
        nearby = find_nearby_text(cb['x'], cb['top'])
        print(f"\n--- ROW at top={cb['top']} ---")
        print(f"    Texts: {nearby[:5]}")
    print(f"    Checkbox at x={cb['x']}")

# Now create the proper mapping
print("\n\n" + "=" * 80)
print("PROPOSED CHECK_FIELDS MAPPING")
print("=" * 80)

# Define the mapping based on visual analysis
FIELD_MAPPING = [
    # Gender (top ~316)
    {'id': 'genderM', 'x': 1194, 'top': 316},
    {'id': 'genderF', 'x': 1252, 'top': 316},
    
    # Billing (top ~493)
    {'id': 'medicare', 'x': 64, 'top': 493},
    {'id': 'medicaid', 'x': 182, 'top': 493},
    {'id': 'otherInsurance', 'x': 301, 'top': 493},
    
    # Reason for X-Ray (top ~614)
    {'id': 'homebound', 'x': 341, 'top': 614},
    {'id': 'acuteCondition', 'x': 449, 'top': 614},
    {'id': 'nonAmbulatory', 'x': 591, 'top': 614},
    {'id': 'medicalConditionUnstable', 'x': 736, 'top': 614},
    
    # Section headers
    {'id': 'xrayOrderHeader', 'x': 67, 'top': 643},
    {'id': 'ultrasoundOrderHeader', 'x': 949, 'top': 641},
    
    # X-Ray Column 1 (x=67)
    {'id': 'xrayAbdomen2v', 'x': 67, 'top': 676},
    {'id': 'xrayAbdomenKub', 'x': 67, 'top': 699},
    {'id': 'xrayAnkle', 'x': 67, 'top': 723},
    {'id': 'xrayChest', 'x': 67, 'top': 747},
    {'id': 'xrayChest2v', 'x': 67, 'top': 770},
    {'id': 'xrayClavicle', 'x': 67, 'top': 794},
    {'id': 'xrayElbow', 'x': 67, 'top': 820},
    {'id': 'xrayFemur', 'x': 67, 'top': 846},
    {'id': 'xrayForearm', 'x': 67, 'top': 871},
    {'id': 'xrayFacialBones', 'x': 67, 'top': 897},
    {'id': 'xrayHand', 'x': 67, 'top': 921},
    {'id': 'xrayHip', 'x': 67, 'top': 944},
    
    # X-Ray Column 1 - L checkboxes (x=256)
    {'id': 'xrayAnkleL', 'x': 256, 'top': 723},
    {'id': 'xrayChestL', 'x': 256, 'top': 746},
    {'id': 'xrayPelvisL', 'x': 256, 'top': 818},
    {'id': 'xrayRibsL', 'x': 256, 'top': 846},
    {'id': 'xrayShoulderL', 'x': 256, 'top': 871},
    {'id': 'xraySpineThoracicL', 'x': 256, 'top': 922},
    {'id': 'xraySpineLumbarL', 'x': 256, 'top': 945},
    
    # X-Ray Column 2 (x=362)
    {'id': 'xrayHipPelvis', 'x': 362, 'top': 674},
    {'id': 'xrayBilateralHipPelvis', 'x': 362, 'top': 700},
    {'id': 'xrayHumerus', 'x': 362, 'top': 723},
    {'id': 'xrayKnee', 'x': 362, 'top': 747},
    {'id': 'xrayMandible', 'x': 362, 'top': 771},
    {'id': 'xrayNasalBones', 'x': 362, 'top': 794},
    {'id': 'xrayPelvis', 'x': 362, 'top': 818},
    {'id': 'xrayRibs', 'x': 362, 'top': 846},
    {'id': 'xrayShoulder', 'x': 362, 'top': 872},
    {'id': 'xraySpineCervical', 'x': 362, 'top': 895},
    {'id': 'xraySpineThoracic', 'x': 362, 'top': 919},
    {'id': 'xraySpineLumbar', 'x': 362, 'top': 942},
    
    # X-Ray R checkboxes (x=547-631 area)
    {'id': 'xrayRibsR', 'x': 547, 'top': 844},
    {'id': 'xrayRibsB', 'x': 586, 'top': 844},
    {'id': 'xrayShoulderR', 'x': 547, 'top': 871},
    {'id': 'xrayShoulderB', 'x': 586, 'top': 871},
    
    # X-Ray Column 3 (x=587-631)
    {'id': 'xraySacrumL', 'x': 587, 'top': 674},
    {'id': 'xrayHumerusR', 'x': 587, 'top': 723},
    {'id': 'xrayKneeR', 'x': 587, 'top': 746},
    
    # X-Ray Column 4 (x=676)
    {'id': 'xraySacrum', 'x': 676, 'top': 674},
    {'id': 'xraySinus', 'x': 676, 'top': 698},
    {'id': 'xraySkull', 'x': 676, 'top': 721},
    {'id': 'xrayToes', 'x': 676, 'top': 743},
    {'id': 'xrayWrist', 'x': 676, 'top': 769},
    {'id': 'xrayFoot', 'x': 676, 'top': 793},
    {'id': 'xrayTibFib', 'x': 676, 'top': 816},
    {'id': 'xrayOther', 'x': 676, 'top': 841},
    
    # Ultrasound with R/B options (x=839-928)
    {'id': 'usArterialLowerL', 'x': 839, 'top': 742},
    {'id': 'usArterialLowerR', 'x': 868, 'top': 742},
    {'id': 'usArterialLowerB', 'x': 883, 'top': 742},
    {'id': 'usArterialAbiL', 'x': 839, 'top': 768},
    {'id': 'usArterialAbiR', 'x': 868, 'top': 768},
    {'id': 'usArterialAbiB', 'x': 883, 'top': 767},
    {'id': 'usVenousUpperL', 'x': 883, 'top': 793},
    {'id': 'usVenousLowerL', 'x': 883, 'top': 816},
    
    # Ultrasound Column (x=971)
    {'id': 'usAdultEcho', 'x': 971, 'top': 674},
    {'id': 'usCarotid', 'x': 971, 'top': 697},
    {'id': 'usArterialUpper', 'x': 971, 'top': 720},
    {'id': 'usArterialLower', 'x': 971, 'top': 743},
    {'id': 'usArterialAbi', 'x': 971, 'top': 768},
    {'id': 'usVenousUpper', 'x': 971, 'top': 794},
    {'id': 'usVenousLower', 'x': 971, 'top': 819},
    {'id': 'usRenal', 'x': 971, 'top': 844},
    {'id': 'usAbdominal', 'x': 971, 'top': 870},
    {'id': 'usPelvic', 'x': 971, 'top': 895},
    {'id': 'usThyroid', 'x': 971, 'top': 920},
    {'id': 'usAortaIvc', 'x': 971, 'top': 944},
    
    # Wellness (x=1011)
    {'id': 'wellnessFemale', 'x': 1011, 'top': 1007},
    {'id': 'wellnessMen', 'x': 1011, 'top': 1195},
    
    # Urine Drug Testing (x=71)
    {'id': 'urineDrugScreen', 'x': 71, 'top': 1052},
    {'id': 'urineDrugConfirmation', 'x': 71, 'top': 1073},
    {'id': 'screenConfirmationEtg', 'x': 71, 'top': 1093},
    {'id': 'urinalysis', 'x': 71, 'top': 1112},
    
    # Molecular (x=70)
    {'id': 'uaUtiPcr', 'x': 70, 'top': 1165},
    {'id': 'uaUtiWithStd', 'x': 95, 'top': 1212},
    {'id': 'uaUtiWithoutStd', 'x': 95, 'top': 1234},
    {'id': 'respiratoryPanel', 'x': 70, 'top': 1266},
    {'id': 'woundPanel', 'x': 70, 'top': 1312},
    {'id': 'nailPanel', 'x': 70, 'top': 1343},
    {'id': 'giPanel', 'x': 70, 'top': 1373},
    {'id': 'pgxComprehensive', 'x': 70, 'top': 1444},
]

print("\nconst CHECK_FIELDS = [")
for f in FIELD_MAPPING:
    print(f"  {{ id: '{f['id']}', x: {f['x']}, top: {f['top']} }},")
print("];")

# Save
with open('mapped_checkboxes.json', 'w') as f:
    json.dump(FIELD_MAPPING, f, indent=2)

print(f"\nTotal fields mapped: {len(FIELD_MAPPING)}")
