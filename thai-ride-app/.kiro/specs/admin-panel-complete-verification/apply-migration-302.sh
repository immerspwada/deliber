#!/bin/bash

# ============================================================================
# Auto-Apply Migration 302 Script
# ============================================================================
# สคริปต์นี้จะเปิด Supabase Dashboard และ copy SQL ให้คุณอัตโนมัติ
# ============================================================================

set -e

PROJECT_REF="onsflqhkgqhydeupiqyt"
SQL_FILE=".kiro/specs/admin-panel-complete-verification/EXECUTE-MIGRATION-302.sql"

echo "🚀 กำลัง apply Migration 302..."
echo ""

# 1. เปิด Supabase SQL Editor
echo "📂 เปิด Supabase SQL Editor..."
open "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"

# รอ 2 วินาที
sleep 2

# 2. Copy SQL ไปยัง clipboard
echo "📋 Copy SQL ไปยัง clipboard..."
cat "$SQL_FILE" | pbcopy

echo ""
echo "✅ เสร็จสิ้น!"
echo ""
echo "📝 ขั้นตอนถัดไป:"
echo "   1. Supabase SQL Editor เปิดแล้วใน browser"
echo "   2. SQL ถูก copy ไปยัง clipboard แล้ว"
echo "   3. กด Cmd+V เพื่อ paste SQL"
echo "   4. กด Cmd+Enter หรือคลิก 'Run' เพื่อ execute"
echo "   5. รอจนเห็นข้อความ 'Success'"
echo ""
echo "🎯 หลังจากนั้น refresh หน้า Admin Providers:"
echo "   http://localhost:5173/admin/providers"
echo ""
