#!/usr/bin/env python3
import json

# Load the raw (broken) JSON as text
with open('blog-articles.json.bak', 'r', encoding='utf-8') as f:
    text = f.read()

# Use a regex-based approach to find article boundaries and fix each one
import re

# Find all {...} blocks at the top level
# This is tricky because of nested quotes, so we'll use a state machine

articles_raw = []
depth = 0
start = None

for i, char in enumerate(text):
    if char == '{' and depth == 0:
        start = i
    
    if char == '{':
        depth += 1
    elif char == '}':
        depth -= 1
        if depth == 0 and start is not None:
            articles_raw.append(text[start:i+1])
            start = None

print(f'Found {len(articles_raw)} article blocks')

# Now fix each article by parsing and re-serializing with proper escaping
fixed_articles = []

for idx, article_text in enumerate(articles_raw):
    try:
        # Try to parse as-is
        article = json.loads(article_text)
        fixed_articles.append(article)
        print(f'  Article {idx+1}: OK (already valid)')
    except json.JSONDecodeError as e:
        # Try to fix by replacing problematic sequences
        # The issue is raw newlines in string values
        print(f'  Article {idx+1}: Invalid JSON, attempting fix...')
        
        # Use regex to find and fix content/excerpt fields
        # Replace raw newlines with escaped versions
        fixed_text = article_text
        
        # Replace raw newlines in "content" field
        def fix_field(text, field_name):
            # Pattern: "fieldname": "...stuff..." where stuff might have raw newlines
            # This is complex, so we use a different approach:
            # Find field, then find the closing quote, handling escapes
            pattern = f'"({field_name})"\\s*:\\s*"'
            # Find all matches
            result = text
            offset = 0
            for match in re.finditer(pattern, text):
                start_pos = match.end()
                # Find the closing unescaped quote
                pos = start_pos
                while pos < len(text):
                    if text[pos] == '"' and (pos == 0 or text[pos-1] != '\\'):
                        # Found closing quote
                        field_value = text[start_pos:pos]
                        # Escape newlines
                        escaped = field_value.replace('\\', '\\\\').replace('\n', '\\n').replace('\r', '\\r').replace('"', '\\"')
                        # Replace in result
                        result = result[:start_pos] + escaped + result[pos:]
                        break
                    pos += 1
            return result
        
        fixed_text = fix_field(fixed_text, 'content')
        fixed_text = fix_field(fixed_text, 'excerpt')
        
        try:
            article = json.loads(fixed_text)
            fixed_articles.append(article)
            print(f'    ✓ Fixed successfully')
        except json.JSONDecodeError as e2:
            print(f'    ✗ Still invalid: {e2}')
            # Last resort: try parsing from the error position onwards
            continue

# Rebuild JSON
if fixed_articles:
    output_json = json.dumps(fixed_articles, ensure_ascii=False, indent=2)
    
    # Validate
    try:
        json.loads(output_json)
        print(f'\n✓ Output JSON valid. Articles: {len(fixed_articles)}')
        with open('blog-articles.json', 'w', encoding='utf-8') as f:
            f.write(output_json)
        print('✓ Written to blog-articles.json')
    except json.JSONDecodeError as e:
        print(f'\n✗ Output JSON invalid: {e}')
else:
    print('\n✗ No articles fixed')
