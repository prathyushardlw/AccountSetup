#!/usr/bin/env python3
"""
PDF Analyzer for eRequisition Form
Extracts page dimensions and helps measure checkbox positions
"""
import pymupdf as fitz
import json

def find_checkbox_rectangles(pdf_path):
    """Find checkbox rectangles in the PDF by analyzing drawn paths"""
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    # Get all drawings on the page
    drawings = page.get_drawings()
    
    # Filter for small rectangles (likely checkboxes - usually 8-15 points)
    checkboxes = []
    for d in drawings:
        if d["rect"]:
            rect = d["rect"]
            width = rect[2] - rect[0]
            height = rect[3] - rect[1]
            
            # Checkboxes are typically small squares (8-15 points each side)
            if 6 <= width <= 20 and 6 <= height <= 20:
                if abs(width - height) < 3:  # roughly square
                    checkboxes.append({
                        'x': round(rect[0]),
                        'top': round(rect[1]),
                        'width': round(width),
                        'height': round(height)
                    })
    
    # Sort by position (top to bottom, left to right)
    checkboxes.sort(key=lambda c: (c['top'], c['x']))
    
    print(f"\nFound {len(checkboxes)} potential checkbox rectangles:")
    print(f"{'X':>8} {'Top':>8} {'W':>6} {'H':>6}")
    print("-" * 32)
    
    # Group by vertical position for easier analysis
    print("\nGrouped by row (top position):")
    current_row = -1
    for cb in checkboxes:
        if abs(cb['top'] - current_row) > 10:  # New row
            current_row = cb['top']
            print(f"\n--- Row at top={cb['top']} ---")
        print(f"  x={cb['x']}, top={cb['top']}")
    
    doc.close()
    return checkboxes

def analyze_pdf(pdf_path):
    """Analyze PDF and extract page dimensions and structure"""
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    # Get page dimensions
    rect = page.rect
    width = rect.width
    height = rect.height
    
    print(f"PDF Page Dimensions:")
    print(f"  Width: {width:.2f} points")
    print(f"  Height: {height:.2f} points")
    print()
    
    # JavaScript code uses SOURCE_WIDTH=1364, SOURCE_HEIGHT=1670
    source_width = 1364
    source_height = 1670
    
    print(f"Source dimensions used in JS: {source_width} x {source_height}")
    print()
    
    # Extract ALL text with precise positions
    text_dict = page.get_text("dict")
    blocks = text_dict.get("blocks", [])
    
    # Collect all text spans with positions
    all_texts = []
    for block in blocks:
        if block.get("type") == 0:  # text block
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if text and len(text) > 1:
                        bbox = span.get("bbox", [])
                        all_texts.append({
                            "text": text,
                            "x": bbox[0],
                            "top": bbox[1],
                            "right": bbox[2],
                            "bottom": bbox[3]
                        })
    
    # Sort by vertical position then horizontal
    all_texts.sort(key=lambda t: (t['top'], t['x']))
    
    # Print checkbox-related items
    checkbox_labels = [
        "medicare", "medicaid", 
        "homebound", "acute condition", "non ambulatory", "medical condition",
        "abdomen 2v", "abdomen (kub)", "ankle", "toes", "chest", "clavicle", 
        "elbow", "femur", "forearm", "facial", "hand", "hip",
        "humerus", "knee", "mandible", "nasal", "pelvis", "ribs", "shoulder",
        "spine", "sacrum", "sinus", "skull", "wrist", "foot", "tib/fib",
        "echocardiogram", "carotid", "arterial", "venous", "renal", "abdominal",
        "pelvic", "thyroid", "aorta",
        "urine drug", "urinalysis", "screen & confirmation",
        "uti pcr", "respiratory", "wound panel", "nail panel", "gastrointestinal", "pharmacogenomics",
        "comp metabolic", "lipid panel", "hepatic", "basic metabolic", "renal panel", 
        "cbc", "reticulocyte", "rheumatoid",
        "wellness panel", "allergy test"
    ]
    
    print("\n" + "=" * 80)
    print("CHECKBOX LABEL POSITIONS (sorted by position):")
    print("=" * 80)
    print(f"{'Text':<50} {'X':>8} {'Top':>8}")
    print("-" * 80)
    
    found_labels = []
    for item in all_texts:
        text_lower = item['text'].lower()
        for label in checkbox_labels:
            if label in text_lower:
                # Estimate checkbox position (usually 20-30 pixels to the left of text)
                checkbox_x = item['x'] - 22  # checkbox is left of text
                checkbox_top = item['top']
                found_labels.append({
                    'text': item['text'],
                    'label_x': item['x'],
                    'label_top': item['top'],
                    'checkbox_x': max(0, checkbox_x),
                    'checkbox_top': checkbox_top
                })
                print(f"{item['text'][:50]:<50} {item['x']:>8.0f} {item['top']:>8.0f}")
                break
    
    doc.close()
    return width, height, found_labels

def generate_checkbox_coordinates(found_labels):
    """Generate the CHECK_FIELDS array for app.js based on measured positions"""
    
    # Map label text to checkbox IDs
    label_to_id = {
        "medicare": "medicare",
        "medicaid": "medicaid",
        "homebound": "homebound",
        "acute condition": "acuteCondition",
        "non ambulatory": "nonAmbulatory",
        "medical condition unstable": "medicalConditionUnstable",
        "abdomen 2v": "xrayAbdomen2v",
        "abdomen (kub)": "xrayAbdomenKub",
        "ankle 2v/3v": "xrayAnkle",
        "toes 2v": "xrayToes",
        "chest": "xrayChest1v",
        "chest x-ray with ekg": "xrayChestEkg",
        "clavicle": "xrayClavicle",
        "elbow 2v/3v": "xrayElbow",
        "femur 2v": "xrayFemur",
        "forearm 2v/3v": "xrayForearm",
        "facial bones": "xrayFacialBones",
        "hand 2v/3v": "xrayHand",
        "hip 2v": "xrayHip",
        "hip with pelvis": "xrayHipPelvis",
        "bilateral hip with pelvis": "xrayBilateralHipPelvis",
        "humerus 2v": "xrayHumerus",
        "knee 2v/3v": "xrayKnee",
        "mandible 3v/4v": "xrayMandible",
        "nasal bones 3v": "xrayNasalBones",
        "pelvis": "xrayPelvis",
        "ribs 2v": "xrayRibs",
        "shoulder 2v": "xrayShoulder",
        "spine - cervical": "xraySpineCervical",
        "spine - thoracic": "xraySpineThoracic",
        "spine - lumbar": "xraySpineLumbar",
        "sacrum/coccyx": "xraySacrum",
        "sinus series": "xraySinus",
        "skull": "xraySkull",
        "wrist 2v/3v": "xrayWrist",
        "foot x-ray": "xrayFoot",
        "tib/fib x-ray": "xrayTibFib",
        "adult echocardiogram": "usAdultEcho",
        "carotid doppler": "usCarotid",
        "arterial doppler upper extremity": "usArterialUpper",
        "arterial doppler lower extremity": "usArterialLower",
        "arterial doppler with abi": "usArterialAbi",
        "venous doppler upper extremity": "usVenousUpper",
        "venous doppler lower extremity": "usVenousLower",
        "renal / renal artery doppler": "usRenal",
        "abdominal ultrasound": "usAbdominal",
        "pelvic ultrasound": "usPelvic",
        "thyroid ultrasound": "usThyroid",
        "aorta/ivc duplex doppler": "usAortaIvc",
        "urine drug screen": "urineDrugScreen",
        "urine drug confirmation": "urineDrugConfirmation",
        "screen & confirmation with etg/ets": "screenConfirmationEtg",
        "urinalysis": "urinalysis",
        "without stds": "uaUtiNoStd",
        "with stds": "uaUtiStd",
        "respiratory panel": "respiratoryPanel",
        "wound panel": "woundPanel",
        "nail panel": "nailPanel",
        "gastrointestinal infection panel": "giPanel",
        "pharmacogenomics": "pgxComprehensive",
        "comp metabolic panel": "compMetabolicPanel",
        "lipid panel": "lipidPanel",
        "hepatic profile": "hepaticProfile",
        "basic metabolic panel": "basicMetabolicPanel",
        "renal panel": "renalPanel",
        "cbc w diff": "cbcDiff",
        "reticulocyte count": "reticulocyteCount",
        "rheumatoid factor": "rheumatoidFactor",
        "wellness panel - female": "wellnessFemale",
        "wellness panel - men": "wellnessMen",
        "inhalant allergens": "allergyInhalant",
        "food allergens": "allergyFood",
    }
    
    print("\n" + "=" * 80)
    print("GENERATED CHECK_FIELDS COORDINATES:")
    print("=" * 80)
    
    coords = []
    for item in found_labels:
        text_lower = item['text'].lower()
        matched_id = None
        for label, id_name in label_to_id.items():
            if label in text_lower:
                matched_id = id_name
                break
        
        if matched_id:
            # Checkbox is approximately 22px to the left of text and vertically centered
            checkbox_x = round(item['label_x'] - 22)
            checkbox_top = round(item['label_top'])
            coords.append({
                'id': matched_id,
                'x': max(0, checkbox_x),
                'top': checkbox_top,
                'label': item['text']
            })
    
    # Print as JavaScript code
    print("const CHECK_FIELDS = [")
    for coord in coords:
        print(f"    {{ id: '{coord['id']}', x: {coord['x']}, top: {coord['top']} }}, // {coord['label'][:40]}")
    print("];")
    
    return coords

def create_coordinate_grid(pdf_path, output_path):
    """Create a PDF with coordinate grid overlay for precise measurement"""
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    rect = page.rect
    width = rect.width
    height = rect.height
    
    source_width = 1364
    source_height = 1670
    
    # Draw grid lines every 100 source units
    for source_x in range(0, source_width + 100, 100):
        pdf_x = source_x * width / source_width
        page.draw_line((pdf_x, 0), (pdf_x, height), color=(1, 0, 0), width=0.5)
        # Add label
        page.insert_text((pdf_x + 2, 15), f"{source_x}", fontsize=8, color=(1, 0, 0))
    
    for source_y in range(0, source_height + 100, 100):
        pdf_y = source_y * height / source_height
        page.draw_line((0, pdf_y), (width, pdf_y), color=(0, 0, 1), width=0.5)
        # Add label
        page.insert_text((5, pdf_y + 10), f"{source_y}", fontsize=8, color=(0, 0, 1))
    
    doc.save(output_path)
    doc.close()
    print(f"\nGrid overlay saved to: {output_path}")

def mark_current_positions(pdf_path, output_path):
    """Mark the current checkbox positions from app.js"""
    # Current CHECK_FIELDS from app.js
    check_fields = [
        # Billing checkboxes
        {'id': 'medicare', 'x': 60, 'top': 493},
        {'id': 'medicaid', 'x': 180, 'top': 493},
        # Gender checkboxes
        {'id': 'genderM', 'x': 1106, 'top': 337},
        {'id': 'genderF', 'x': 1158, 'top': 337},
        # Reason for Mobile X-Ray
        {'id': 'homebound', 'x': 610, 'top': 632},
        {'id': 'acuteCondition', 'x': 688, 'top': 632},
        {'id': 'nonAmbulatory', 'x': 800, 'top': 632},
        {'id': 'medicalConditionUnstable', 'x': 920, 'top': 632},
        # X-Ray Column 1
        {'id': 'xrayAbdomen2v', 'x': 44, 'top': 678},
        {'id': 'xrayAbdomenKub', 'x': 44, 'top': 700},
        {'id': 'xrayAnkle', 'x': 44, 'top': 723},
        {'id': 'xrayToes', 'x': 44, 'top': 745},
        {'id': 'xrayChest1v', 'x': 44, 'top': 768},
        {'id': 'xrayChestEkg', 'x': 44, 'top': 790},
        {'id': 'xrayClavicle', 'x': 44, 'top': 812},
        {'id': 'xrayElbow', 'x': 44, 'top': 835},
        {'id': 'xrayFemur', 'x': 44, 'top': 857},
        {'id': 'xrayForearm', 'x': 44, 'top': 880},
        {'id': 'xrayFacialBones', 'x': 44, 'top': 902},
        {'id': 'xrayHand', 'x': 44, 'top': 925},
        {'id': 'xrayHip', 'x': 44, 'top': 947},
        # X-Ray Column 2
        {'id': 'xrayHipPelvis', 'x': 258, 'top': 678},
        {'id': 'xrayBilateralHipPelvis', 'x': 258, 'top': 700},
        {'id': 'xrayHumerus', 'x': 258, 'top': 723},
        {'id': 'xrayKnee', 'x': 258, 'top': 768},
        {'id': 'xrayMandible', 'x': 258, 'top': 790},
        {'id': 'xrayNasalBones', 'x': 258, 'top': 812},
        {'id': 'xrayPelvis', 'x': 258, 'top': 835},
        {'id': 'xrayRibs', 'x': 258, 'top': 857},
        {'id': 'xrayShoulder', 'x': 258, 'top': 880},
        {'id': 'xraySpineCervical', 'x': 258, 'top': 902},
        {'id': 'xraySpineThoracic', 'x': 258, 'top': 925},
        {'id': 'xraySpineLumbar', 'x': 258, 'top': 947},
        # X-Ray Column 3
        {'id': 'xraySacrum', 'x': 505, 'top': 678},
        {'id': 'xraySinus', 'x': 505, 'top': 700},
        {'id': 'xraySkull', 'x': 505, 'top': 723},
        {'id': 'xrayWrist', 'x': 505, 'top': 790},
        {'id': 'xrayFoot', 'x': 505, 'top': 812},
        {'id': 'xrayTibFib', 'x': 505, 'top': 835},
        {'id': 'xrayOther', 'x': 505, 'top': 857},
        # Ultrasound
        {'id': 'usAdultEcho', 'x': 846, 'top': 678},
        {'id': 'usCarotid', 'x': 846, 'top': 700},
        {'id': 'usArterialUpper', 'x': 846, 'top': 723},
        {'id': 'usArterialLower', 'x': 846, 'top': 745},
        {'id': 'usArterialAbi', 'x': 846, 'top': 790},
        {'id': 'usVenousUpper', 'x': 846, 'top': 812},
        {'id': 'usVenousLower', 'x': 846, 'top': 835},
        {'id': 'usRenal', 'x': 846, 'top': 857},
        {'id': 'usAbdominal', 'x': 846, 'top': 880},
        {'id': 'usPelvic', 'x': 846, 'top': 902},
        {'id': 'usThyroid', 'x': 846, 'top': 925},
        {'id': 'usAortaIvc', 'x': 846, 'top': 947},
        # Urine Drug Testing
        {'id': 'urineDrugScreen', 'x': 44, 'top': 1020},
        {'id': 'urineDrugConfirmation', 'x': 44, 'top': 1041},
        {'id': 'screenConfirmationEtg', 'x': 44, 'top': 1063},
        {'id': 'urinalysis', 'x': 44, 'top': 1085},
        # Molecular
        {'id': 'uaUtiNoStd', 'x': 44, 'top': 1152},
        {'id': 'uaUtiStd', 'x': 44, 'top': 1175},
        {'id': 'respiratoryPanel', 'x': 44, 'top': 1218},
        {'id': 'woundPanel', 'x': 44, 'top': 1258},
        {'id': 'nailPanel', 'x': 44, 'top': 1280},
        {'id': 'giPanel', 'x': 44, 'top': 1303},
        {'id': 'pgxComprehensive', 'x': 44, 'top': 1360},
        # Blood Panel
        {'id': 'compMetabolicPanel', 'x': 310, 'top': 1002},
        {'id': 'lipidPanel', 'x': 310, 'top': 1025},
        {'id': 'hepaticProfile', 'x': 470, 'top': 1002},
        {'id': 'basicMetabolicPanel', 'x': 470, 'top': 1025},
        {'id': 'renalPanel', 'x': 630, 'top': 1025},
        {'id': 'cbcDiff', 'x': 820, 'top': 1002},
        {'id': 'reticulocyteCount', 'x': 820, 'top': 1025},
        {'id': 'rheumatoidFactor', 'x': 820, 'top': 1048},
        # Wellness
        {'id': 'wellnessFemale', 'x': 900, 'top': 1002},
        {'id': 'wellnessMen', 'x': 900, 'top': 1133},
        # Allergy
        {'id': 'allergyInhalant', 'x': 900, 'top': 1388},
        {'id': 'allergyFood', 'x': 900, 'top': 1410},
    ]
    
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    rect = page.rect
    width = rect.width
    height = rect.height
    
    source_width = 1364
    source_height = 1670
    
    # Mark each checkbox position
    for field in check_fields:
        # Convert source coords to PDF coords
        pdf_x = (field['x'] + 3) * width / source_width  # +3 as in drawCheck
        pdf_y = (field['top'] + 4) * height / source_height  # +4 as in drawCheck
        
        # Draw a red X marker
        page.insert_text((pdf_x, pdf_y), "X", fontsize=10, color=(1, 0, 0))
    
    doc.save(output_path)
    doc.close()
    print(f"\nMarked positions saved to: {output_path}")

if __name__ == "__main__":
    import os
    
    pdf_path = "RMDS REQ Form April 10.pdf"
    
    if os.path.exists(pdf_path):
        print("=" * 80)
        print("Finding checkbox rectangles in PDF...")
        print("=" * 80)
        checkboxes = find_checkbox_rectangles(pdf_path)
        
        print("\n" + "=" * 80)
        print("Analyzing PDF text positions...")
        print("=" * 80)
        width, height, found_labels = analyze_pdf(pdf_path)
        
        print("\n" + "=" * 80)
        print("Creating grid overlay for manual verification...")
        print("=" * 80)
        create_coordinate_grid(pdf_path, "grid_overlay.pdf")
        
        print("\n" + "=" * 80)
        print("Marking current checkbox positions...")
        print("=" * 80)
        mark_current_positions(pdf_path, "marked_positions.pdf")
    else:
        print(f"ERROR: PDF not found: {pdf_path}")
        print(f"Current directory: {os.getcwd()}")
        print(f"Files: {os.listdir('.')}")
