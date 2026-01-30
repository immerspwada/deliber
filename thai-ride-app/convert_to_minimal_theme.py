#!/usr/bin/env python3
"""
Automated Color Conversion Script for Minimal Theme
Converts colorful designs to minimal black-white-gray theme
"""

import re
import sys

def convert_colors(content: str) -> tuple[str, dict]:
    """Convert colors to minimal theme variables"""
    changes = {
        'green_to_black': 0,
        'light_green_to_gray': 0,
        'blue_to_black': 0,
        'light_blue_to_gray': 0,
        'orange_bg_to_gray': 0,
        'rgba_green_to_black': 0
    }
    
    # Green colors → Black (accent)
    green_patterns = [
        (r'#00[Aa]86[Bb]', 'var(--cm-accent)'),
        (r'#00[Cc]77[Bb]', 'var(--cm-accent)'),
    ]
    
    for pattern, replacement in green_patterns:
        matches = len(re.findall(pattern, content))
        if matches > 0:
            content = re.sub(pattern, replacement, content)
            changes['green_to_black'] += matches
    
    # Light green backgrounds → Gray
    light_green_patterns = [
        (r'#[Ee]8[Ff]5[Ee][Ff]', 'var(--cm-bg-hover)'),
        (r'#[Ff]0[Ff][Dd][Ff]4', 'var(--cm-bg-hover)'),
        (r'#[Ff]8[Ff][Dd][Ff]9', 'var(--cm-bg-hover)'),
        (r'#[Ff][Aa][Ff][Ff][Ff][Ee]', 'var(--cm-bg-hover)'),
    ]
    
    for pattern, replacement in light_green_patterns:
        matches = len(re.findall(pattern, content))
        if matches > 0:
            content = re.sub(pattern, replacement, content)
            changes['light_green_to_gray'] += matches
    
    # Blue colors → Black
    blue_patterns = [
        (r'#1976[Dd]2', 'var(--cm-accent)'),
        (r'#2196[Ff]3', 'var(--cm-accent)'),
    ]
    
    for pattern, replacement in blue_patterns:
        matches = len(re.findall(pattern, content))
        if matches > 0:
            content = re.sub(pattern, replacement, content)
            changes['blue_to_black'] += matches
    
    # Light blue backgrounds → Gray
    light_blue_patterns = [
        (r'#[Ee]3[Ff]2[Ff][Dd]', 'var(--cm-bg-hover)'),
    ]
    
    for pattern, replacement in light_blue_patterns:
        matches = len(re.findall(pattern, content))
        if matches > 0:
            content = re.sub(pattern, replacement, content)
            changes['light_blue_to_gray'] += matches
    
    # Orange backgrounds → Gray
    orange_bg_patterns = [
        (r'#[Ff][Ff][Ff]3[Ee]0', 'var(--cm-bg-hover)'),
    ]
    
    for pattern, replacement in orange_bg_patterns:
        matches = len(re.findall(pattern, content))
        if matches > 0:
            content = re.sub(pattern, replacement, content)
            changes['orange_bg_to_gray'] += matches
    
    # RGBA green → RGBA black
    rgba_patterns = [
        (r'rgba\(0,\s*168,\s*107,\s*0\.1\)', 'rgba(0, 0, 0, 0.05)'),
        (r'rgba\(0,\s*168,\s*107,\s*0\.3\)', 'rgba(0, 0, 0, 0.1)'),
        (r'rgba\(0,\s*168,\s*107,\s*0\.5\)', 'rgba(0, 0, 0, 0.15)'),
    ]
    
    for pattern, replacement in rgba_patterns:
        matches = len(re.findall(pattern, content))
        if matches > 0:
            content = re.sub(pattern, replacement, content)
            changes['rgba_green_to_black'] += matches
    
    return content, changes

def main():
    if len(sys.argv) != 2:
        print("Usage: python convert_to_minimal_theme.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        converted_content, changes = convert_colors(content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(converted_content)
        
        print(f"✅ Conversion complete for {file_path}")
        print(f"\nChanges made:")
        print(f"  - Green (#00a86b) → Black: {changes['green_to_black']} instances")
        print(f"  - Light green backgrounds → Gray: {changes['light_green_to_gray']} instances")
        print(f"  - Blue (#1976d2) → Black: {changes['blue_to_black']} instances")
        print(f"  - Light blue backgrounds → Gray: {changes['light_blue_to_gray']} instances")
        print(f"  - Orange backgrounds → Gray: {changes['orange_bg_to_gray']} instances")
        print(f"  - RGBA green → RGBA black: {changes['rgba_green_to_black']} instances")
        
        total = sum(changes.values())
        print(f"\n📊 Total conversions: {total}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
