#!/usr/bin/env python3
"""Extract ALL text from PDF to find all checkbox labels"""
import pymupdf as fitz

def extract_all_text(pdf_path):
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    # Get all text with positions
    text_dict = page.get_text("dict")
    blocks = text_dict.get("blocks", [])
    
    all_items = []
    for block in blocks:
        if block.get("type") == 0:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if text:
                        bbox = span.get("bbox", [])
                        all_items.append({
                            'text': text,
                            'x': round(bbox[0]),
                            'top': round(bbox[1]),
                            'right': round(bbox[2]),
                            'bottom': round(bbox[3])
                        })
    
    # Sort by vertical position then horizontal
    all_items.sort(key=lambda t: (t['top'], t['x']))
    
    print("=" * 100)
    print("ALL TEXT EXTRACTED FROM PDF (sorted by position)")
    print("=" * 100)
    print(f"{'Y':>6} {'X':>6} | Text")
    print("-" * 100)
    
    current_row = -1
    for item in all_items:
        # Group items by row (within 5 pixels)
        if abs(item['top'] - current_row) > 5:
            print()  # New line for new row
            current_row = item['top']
        print(f"{item['top']:>6} {item['x']:>6} | {item['text']}")
    
    doc.close()
    return all_items

def find_checkbox_rectangles(pdf_path):
    """Find all checkbox rectangles"""
    doc = fitz.open(pdf_path)
    page = doc[0]
    
    drawings = page.get_drawings()
    
    checkboxes = []
    for d in drawings:
        if d["rect"]:
            rect = d["rect"]
            width = rect[2] - rect[0]
            height = rect[3] - rect[1]
            
            # Checkboxes are small squares (10-20 points)
            if 10 <= width <= 20 and 10 <= height <= 20:
                if abs(width - height) < 5:
                    checkboxes.append({
                        'x': round(rect[0]),
                        'top': round(rect[1]),
                        'width': round(width),
                        'height': round(height)
                    })
    
    checkboxes.sort(key=lambda c: (c['top'], c['x']))
    
    print("\n" + "=" * 100)
    print(f"FOUND {len(checkboxes)} CHECKBOX RECTANGLES")
    print("=" * 100)
    print(f"{'Top':>6} {'X':>6} | Size")
    print("-" * 100)
    
    for cb in checkboxes:
        print(f"{cb['top']:>6} {cb['x']:>6} | {cb['width']}x{cb['height']}")
    
    doc.close()
    return checkboxes

if __name__ == "__main__":
    pdf_path = "RMDS REQ Form April 10.pdf"
    
    print("\n" + "=" * 100)
    print("EXTRACTING CHECKBOX RECTANGLES")
    print("=" * 100)
    checkboxes = find_checkbox_rectangles(pdf_path)
    
    print("\n" + "=" * 100)
    print("EXTRACTING ALL TEXT")
    print("=" * 100)
    all_text = extract_all_text(pdf_path)
