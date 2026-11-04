"""NONZERO v7.19.0 source-presence smoke checks (no external packages).
Run from repository root: python tests/checks.py
These are static checks, not end-to-end integration tests.
"""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
phone = (root / 'index.html').read_text(encoding='utf-8')
worker = (root / 'workers/nutrition/index.js').read_text(encoding='utf-8')
schema = (root / 'database/migrations/schema-conversational.sql').read_text(encoding='utf-8')
assert 'nzConversationalNutritionScript' in phone
assert 'v3/nutrition/interpret' in phone and 'v3/nutrition/interpret' in worker
assert 'monthly_ai_budget_reached' in worker
assert 'nutrition_ai_usage' in schema
assert 'nz-nutrition-local-saved' in phone
assert 'v2/food/search' in worker
assert '/v1/food/analyze' in worker
assert '7.19.0' in phone
print('PASS: v7.19.0 static package wiring checks')
