#!/usr/bin/env bash
# ============================================================
#  Multi-Session Bootstrap
#  يشغّل Node (مدير السوكيتات والـAPI) و Python (طبقة التخزين
#  والمصادقة) معًا. كل رقم يعمل في مجلده الخاص sessions/<phone>.
# ============================================================
set -e
cd "$(dirname "$0")"

mkdir -p sessions temp tmp data/uploads data/status-media

# 1) Node: خريطة waClients + Express API + ربط بوت تيليجرام
(
  exec node index.js
) &
NODE_PID=$!
echo "✅ Node started (PID $NODE_PID) — WhatsApp socket manager + API"

# 2) Python: استمرارية التخزين (Mongo flush + snapshots)
(
  exec python bot_core.py
) &
PY_PID=$!
echo "✅ Python started (PID $PY_PID) — auth/storage layer"

shutdown_handler() {
    echo "[start.sh] Caught signal, shutting down both processes..."
    kill -TERM "$NODE_PID" 2>/dev/null || true
    kill -TERM "$PY_PID"   2>/dev/null || true
    wait "$NODE_PID" 2>/dev/null || true
    wait "$PY_PID"  2>/dev/null || true
    exit 0
}
trap shutdown_handler SIGINT SIGTERM

# إذا مات أحد الجانبين، نُسقط الآخر (پلتفورم هاستينگ يعيد التشغيل)
wait -n "$NODE_PID" "$PY_PID"
EXIT_CODE=$?
echo "[start.sh] A child exited with code $EXIT_CODE — stopping the other"
kill -TERM "$NODE_PID" 2>/dev/null || true
kill -TERM "$PY_PID"   2>/dev/null || true
exit "$EXIT_CODE"
