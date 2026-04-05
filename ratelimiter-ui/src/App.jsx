import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" }
  })
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

// ── Queue Visualizer Component ──────────────────────────────────────────────
function QueueVisualizer({ items }) {
  const waiting = items.filter((r) => r.stage === "waiting");
  const processing = items.filter((r) => r.stage === "processing");
  const done = items.filter((r) => r.stage === "done").slice(0, 5);

  const Bubble = ({ req, color, pulse }) => (
    <motion.div
      layout
      key={req.id}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative flex flex-col items-center justify-center rounded-2xl border px-3 py-2.5 min-w-[80px] text-center ${color} ${pulse ? "animate-pulse" : ""}`}
    >
      <div className="text-xs font-bold">#{req.num}</div>
      <div className="text-[10px] mt-0.5 opacity-70">pos {req.position}</div>
      <div className="text-[10px] opacity-60">
        {req.stage === "done"
          ? `✓ ${(req.waitedMs / 1000).toFixed(1)}s`
          : `${((Date.now() - req.startedAt) / 1000).toFixed(1)}s`}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial="hidden" animate="visible" variants={scaleIn}
      className="mt-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
    >
      <h2 className="text-base font-semibold text-gray-200 mb-5 flex items-center gap-2">
        <span className="text-violet-400">⬡</span> Live Queue Visualizer
      </h2>

      <div className="grid grid-cols-3 gap-3">

        {/* Waiting Lane */}
        <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-4 min-h-[140px]">
          <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
            Waiting ({waiting.length})
          </div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {waiting.map((r) => (
                <Bubble
                  key={r.id}
                  req={r}
                  color="bg-yellow-900/60 border-yellow-500/40 text-yellow-300"
                  pulse={true}
                />
              ))}
            </AnimatePresence>
            {waiting.length === 0 && (
              <p className="text-yellow-900 text-xs">Empty</p>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="text-violet-400 text-2xl"
          >
            →
          </motion.div>

          {/* Processing Lane */}
          <div className="bg-violet-950/40 border border-violet-500/20 rounded-xl p-3 w-full min-h-[80px]">
            <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping inline-block" />
              Processing
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <AnimatePresence>
                {processing.map((r) => (
                  <Bubble
                    key={r.id}
                    req={r}
                    color="bg-violet-900/60 border-violet-500/40 text-violet-300"
                    pulse={false}
                  />
                ))}
              </AnimatePresence>
              {processing.length === 0 && (
                <p className="text-violet-900 text-xs">Idle</p>
              )}
            </div>
          </div>

          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", delay: 0.3 }}
            className="text-emerald-400 text-2xl"
          >
            →
          </motion.div>
        </div>

        {/* Done Lane */}
        <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 min-h-[140px]">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Done ({done.length})
          </div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {done.map((r) => (
                <Bubble
                  key={r.id}
                  req={r}
                  color="bg-emerald-900/60 border-emerald-500/40 text-emerald-300"
                  pulse={false}
                />
              ))}
            </AnimatePresence>
            {done.length === 0 && (
              <p className="text-emerald-900 text-xs">Empty</p>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [clientId, setClientId] = useState("user-1");
  const [maxRequests, setMaxRequests] = useState(5);
  const [windowSeconds, setWindowSeconds] = useState(30);
  const [mode, setMode] = useState("REJECT");
  const [configSet, setConfigSet] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [totalSent, setTotalSent] = useState(0);
  const [totalAllowed, setTotalAllowed] = useState(0);
  const [totalRejected, setTotalRejected] = useState(0);
  const [totalQueued, setTotalQueued] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const stopRef = useRef(false);
  const reqCounterRef = useRef(0);
  const cancelTokensRef = useRef([]);

  // Live timer re-render for bubble wait times
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const addLog = (entry) => setLogs((prev) => [entry, ...prev].slice(0, 50));

  const setConfig = async () => {
    try {
      await axios.post(`${BASE_URL}/config`, {
        clientId,
        maxRequests: parseInt(maxRequests),
        windowSeconds: parseInt(windowSeconds),
      });
      setConfigSet(true);
      setLogs([]);
      setTotalSent(0);
      setTotalAllowed(0);
      setTotalRejected(0);
      setTotalQueued(0);
      setTotalProcessed(0);
      setQueueItems([]);
      setStatus(null);
      reqCounterRef.current = 0;
      addLog({ id: Date.now(), type: "info", message: `⚙ Config set — ${maxRequests} requests / ${windowSeconds}s · Mode: ${mode}` });
    } catch {
      addLog({ id: Date.now(), type: "error", message: "Failed to set config" });
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/status/${clientId}`);
      setStatus(res.data);
    } catch {}
  };

  const sendRequests = async (count) => {
    if (!configSet) return alert("Set config first!");
    setRunning(true);
    stopRef.current = false;

    const promises = [];

    for (let i = 1; i <= count; i++) {
      if (stopRef.current) break;

      reqCounterRef.current += 1;
      const reqNum = reqCounterRef.current;
      const reqId = `req-${reqNum}-${Date.now()}`;
      const startedAt = Date.now();

      setTotalSent((p) => p + 1);

      const promise = (async () => {
        // Add to waiting
        setQueueItems((prev) => [...prev, {
          id: reqId, num: reqNum,
          position: reqNum, stage: "waiting", startedAt
        }]);

        addLog({ id: startedAt + reqNum, type: "pending", message: `#${reqNum}  ⏳  Sending...` });

        try {
          // Move to processing
          // setQueueItems((prev) =>
          //   prev.map((r) => r.id === reqId ? { ...r, stage: "processing" } : r)
          // );

          const source = axios.CancelToken.source();
          cancelTokensRef.current.push(source);

          const res = await axios.post(
            `${BASE_URL}/ping`,
            { clientId, mode },
            { cancelToken: source.token }
          );
          const waitedMs = Date.now() - startedAt;
          const data = res.data;

          if (data.status === "ALLOWED") {
            setTotalAllowed((p) => p + 1);
            addLog({ id: Date.now() + reqNum, type: "allowed", message: `#${reqNum}  ✅  ALLOWED  ${waitedMs}ms` });
            setQueueItems((prev) => prev.filter((r) => r.id !== reqId));
          } else if (data.status === "QUEUED_AND_PROCESSED") {
            setTotalProcessed((p) => p + 1);
              setTotalQueued((p) => Math.max(0, p - 1));
              addLog({ id: Date.now() + reqNum, type: "processed", message: `#${reqNum}  ✅  QUEUED → PROCESSED  waited ${waitedMs}ms` });
              // Move from waiting → processing briefly → done
              setQueueItems((prev) =>
                prev.map((r) => r.id === reqId ? { ...r, stage: "processing" } : r)
              );
              await new Promise((r) => setTimeout(r, 600)); // show in processing briefly
              setQueueItems((prev) =>
                prev.map((r) => r.id === reqId ? { ...r, stage: "done", waitedMs } : r)
              );
          }

          // Move to done
          setQueueItems((prev) =>
            prev.map((r) => r.id === reqId ? { ...r, stage: "done", waitedMs } : r)
          );

        } catch (err) {
          const waitedMs = Date.now() - startedAt;

          if (axios.isCancel(err)) {
            // Silently remove from queue visualizer
            setQueueItems((prev) => prev.filter((r) => r.id !== reqId));
            return;
          }

          if (err.response?.status === 429) {
            setTotalRejected((p) => p + 1);
            addLog({ id: Date.now() + reqNum, type: "rejected", message: `#${reqNum}  ❌  REJECTED 429  ${waitedMs}ms` });
          }
          setQueueItems((prev) => prev.filter((r) => r.id !== reqId));
        }

        await fetchStatus();
      })();

      if (mode === "QUEUE") {
        promises.push(promise);
        setTotalQueued((p) => p + 1);
        await new Promise((r) => setTimeout(r, 150));
      } else {
        await promise;
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (mode === "QUEUE") await Promise.all(promises);
    setRunning(false);
  };

  const reset = async () => {
    try {
      await axios.delete(`${BASE_URL}/reset/${clientId}`);
      setLogs([]);
      setTotalSent(0);
      setTotalAllowed(0);
      setTotalRejected(0);
      setTotalQueued(0);
      setTotalProcessed(0);
      setQueueItems([]);
      setStatus(null);
      setConfigSet(false);
      reqCounterRef.current = 0;
      addLog({ id: Date.now(), type: "info", message: "🔄 Rate limiter reset!" });
    } catch {}
  };

  const usedPct = status ? Math.min(100, (status.used / status.maxRequests) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-700 opacity-20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600 opacity-15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-cyan-600 opacity-10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div className="text-center mb-12" initial="hidden" animate="visible" variants={fadeUp}>
          <motion.div
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-4"
            variants={fadeUp} custom={0}
          >
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse inline-block" />
            Sliding Window · Per Client
          </motion.div>
          <motion.h1
            className="text-5xl font-bold bg-gradient-to-r from-white via-violet-200 to-indigo-300 bg-clip-text text-transparent"
            variants={fadeUp} custom={1}
          >
            Rate Limiter
          </motion.h1>
          <motion.p className="text-gray-400 mt-3 text-lg" variants={fadeUp} custom={2}>
            Reject or Queue — you decide
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-5 gap-3 mb-6" initial="hidden" animate="visible">
          {[
            { label: "Sent", value: totalSent, color: "text-white" },
            { label: "Allowed", value: totalAllowed, color: "text-emerald-400" },
            { label: "Rejected", value: totalRejected, color: "text-red-400" },
            { label: "Queued", value: totalQueued, color: "text-yellow-400" },
            { label: "Processed", value: totalProcessed, color: "text-cyan-400" },
          ].map((s, i) => (
            <motion.div key={s.label} variants={fadeUp} custom={i}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 text-center">
              <motion.div key={s.value}
                initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`text-3xl font-bold ${s.color}`}>
                {s.value}
              </motion.div>
              <div className="text-gray-400 text-xs mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Config */}
          <motion.div initial="hidden" animate="visible" variants={scaleIn}
            className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-violet-400">⚙</span> Configuration
            </h2>
            <div className="space-y-3">
              {[
                { label: "Client ID", value: clientId, setter: setClientId, type: "text" },
                { label: "Max Requests", value: maxRequests, setter: setMaxRequests, type: "number" },
                { label: "Window (seconds)", value: windowSeconds, setter: setWindowSeconds, type: "number" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={(e) => f.setter(e.target.value)}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition" />
                </div>
              ))}

              {/* Mode Toggle */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">Mode</label>
                <div className="mt-1 flex rounded-xl overflow-hidden border border-white/10">
                  {["REJECT", "QUEUE"].map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex-1 py-2.5 text-sm font-semibold transition ${
                        mode === m
                          ? m === "REJECT" ? "bg-red-600 text-white" : "bg-violet-600 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}>
                      {m === "REJECT" ? "❌ Reject" : "⏳ Queue"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1.5">
                  {mode === "REJECT"
                    ? "Excess requests are immediately rejected with 429"
                    : "Excess requests wait in queue until window has space"}
                </p>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={setConfig}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition mt-1">
                {configSet ? "✓ Config Active — Update" : "Set Config"}
              </motion.button>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <span className="text-cyan-400">▶</span> Fire Requests
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((n) => (
                  <motion.button key={n} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => sendRequests(n)} disabled={running}
                    className="bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-xl py-2 text-sm font-medium transition">
                    Send {n}
                  </motion.button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => {
                  stopRef.current = true;
                  cancelTokensRef.current.forEach((s) => s.cancel("Stopped by user"));
                  cancelTokensRef.current = [];
                  setRunning(false);
                  setQueueItems([]);
                  addLog({ id: Date.now(), type: "info", message: "⛔ Stopped by user" });
                  }}
                  disabled={!running}
                  className="bg-red-600/70 hover:bg-red-500 disabled:opacity-30 text-white rounded-xl py-2 text-sm font-medium transition">
                  Stop
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={reset}
                  className="bg-white/10 hover:bg-white/15 text-white rounded-xl py-2 text-sm font-medium transition">
                  Reset
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Right Panel */}
          <div className="space-y-4">
            <motion.div initial="hidden" animate="visible" variants={scaleIn}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <span className="text-cyan-400">◎</span> Window Status
              </h2>
              {status ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>Usage</span>
                      <span>{status.used} / {status.maxRequests}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        className={`h-2.5 rounded-full ${usedPct >= 100 ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-indigo-400"}`}
                        initial={{ width: 0 }} animate={{ width: `${usedPct}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Remaining", value: status.remaining, color: "text-emerald-400" },
                      { label: "Resets in", value: status.resetsInMs > 0 ? `${(status.resetsInMs / 1000).toFixed(1)}s` : "Now", color: "text-yellow-400" },
                      { label: "In Queue", value: status.queued ?? 0, color: "text-violet-300" },
                      { label: "Window", value: `${status.windowSeconds}s`, color: "text-indigo-300" },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/5 rounded-xl p-3">
                        <motion.div key={s.value}
                          initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className={`text-xl font-bold ${s.color}`}>
                          {s.value}
                        </motion.div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Send a request to see window status.</p>
              )}
            </motion.div>

            <AnimatePresence>
              {running && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={`border rounded-2xl px-5 py-3 flex items-center gap-3 ${
                    mode === "QUEUE" ? "bg-violet-500/10 border-violet-500/30" : "bg-red-500/10 border-red-500/30"
                  }`}>
                  <span className={`w-2.5 h-2.5 rounded-full animate-ping inline-block ${mode === "QUEUE" ? "bg-violet-400" : "bg-red-400"}`} />
                  <span className={`text-sm font-medium ${mode === "QUEUE" ? "text-violet-300" : "text-red-300"}`}>
                    {mode === "QUEUE" ? "Firing requests — some may be queued..." : "Firing requests — excess will be rejected..."}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Queue Visualizer — only in QUEUE mode */}
        <AnimatePresence>
          {mode === "QUEUE" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
            >
              <QueueVisualizer items={queueItems} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Log */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
          className="mt-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <span className="text-indigo-400">≡</span> Request Log
          </h2>
          <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-sm pr-1">
            {logs.length === 0 && <p className="text-gray-600">No requests yet. Set config and fire requests.</p>}
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div key={log.id}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                  className={`px-3 py-1.5 rounded-lg ${
                    log.type === "allowed" ? "text-emerald-400 bg-emerald-950/50" :
                    log.type === "rejected" ? "text-red-400 bg-red-950/50" :
                    log.type === "processed" ? "text-cyan-400 bg-cyan-950/50" :
                    log.type === "pending" ? "text-yellow-400 bg-yellow-950/30" :
                    "text-violet-300 bg-violet-950/50"
                  }`}>
                  {log.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  );
}