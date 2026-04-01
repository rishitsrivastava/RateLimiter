import { useState, useRef } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const BASE_URL = "http://localhost:8080/api";

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

export default function App() {
  const [clientId, setClientId] = useState("user-1");
  const [maxRequests, setMaxRequests] = useState(5);
  const [windowSeconds, setWindowSeconds] = useState(30);
  const [configSet, setConfigSet] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [totalSent, setTotalSent] = useState(0);
  const [totalAllowed, setTotalAllowed] = useState(0);
  const [totalRejected, setTotalRejected] = useState(0);
  const stopRef = useRef(false);

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
      setStatus(null);
      addLog({ id: Date.now(), type: "info", message: `Config set — ${maxRequests} requests / ${windowSeconds}s` });
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
    for (let i = 1; i <= count; i++) {
      if (stopRef.current) break;
      const start = Date.now();
      try {
        await axios.post(`${BASE_URL}/ping`, { clientId });
        const ms = Date.now() - start;
        setTotalSent((p) => p + 1);
        setTotalAllowed((p) => p + 1);
        addLog({ id: Date.now() + i, type: "allowed", message: `#${i}  ✅  ALLOWED  ${ms}ms` });
      } catch {
        const ms = Date.now() - start;
        setTotalSent((p) => p + 1);
        setTotalRejected((p) => p + 1);
        addLog({ id: Date.now() + i, type: "rejected", message: `#${i}  ❌  REJECTED 429  ${ms}ms` });
      }
      await fetchStatus();
      await new Promise((r) => setTimeout(r, 200));
    }
    setRunning(false);
  };

  const reset = async () => {
    try {
      await axios.delete(`${BASE_URL}/reset/${clientId}`);
      setLogs([]);
      setTotalSent(0);
      setTotalAllowed(0);
      setTotalRejected(0);
      setStatus(null);
      setConfigSet(false);
    } catch {}
  };

  const usedPct = status ? Math.min(100, (status.used / status.maxRequests) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* Background glow blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-700 opacity-20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600 opacity-15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-cyan-600 opacity-10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial="hidden" animate="visible" variants={fadeUp}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-4"
            variants={fadeUp} custom={0}
          >
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse inline-block" />
            Sliding Window Algorithm
          </motion.div>
          <motion.h1
            className="text-5xl font-bold bg-gradient-to-r from-white via-violet-200 to-indigo-300 bg-clip-text text-transparent"
            variants={fadeUp} custom={1}
          >
            Rate Limiter
          </motion.h1>
          <motion.p
            className="text-gray-400 mt-3 text-lg"
            variants={fadeUp} custom={2}
          >
            Per-client · Real-time · Reject mode
          </motion.p>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-6"
          initial="hidden" animate="visible"
        >
          {[
            { label: "Sent", value: totalSent, color: "text-white" },
            { label: "Allowed", value: totalAllowed, color: "text-emerald-400" },
            { label: "Rejected", value: totalRejected, color: "text-red-400" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp} custom={i}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 text-center"
            >
              <motion.div
                key={s.value}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className={`text-4xl font-bold ${s.color}`}
              >
                {s.value}
              </motion.div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Config Panel */}
          <motion.div
            initial="hidden" animate="visible" variants={scaleIn}
            className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
          >
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
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 transition"
                  />
                </div>
              ))}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={setConfig}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl py-2.5 text-sm font-semibold transition mt-1"
              >
                {configSet ? "✓ Config Active — Update" : "Set Config"}
              </motion.button>
            </div>

            {/* Send buttons */}
            <div className="mt-6">
              <h2 className="text-base font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <span className="text-cyan-400">▶</span> Fire Requests
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => sendRequests(n)}
                    disabled={running}
                    className="bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-xl py-2 text-sm font-medium transition"
                  >
                    Send {n}
                  </motion.button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { stopRef.current = true; setRunning(false); }}
                  disabled={!running}
                  className="bg-red-600/70 hover:bg-red-500 disabled:opacity-30 text-white rounded-xl py-2 text-sm font-medium transition"
                >
                  Stop
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={reset}
                  className="bg-white/10 hover:bg-white/15 text-white rounded-xl py-2 text-sm font-medium transition"
                >
                  Reset
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Right panel */}
          <div className="space-y-4">

            {/* Window Status */}
            <motion.div
              initial="hidden" animate="visible" variants={scaleIn}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
            >
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
                        className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${usedPct}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Remaining", value: status.remaining, color: "text-emerald-400" },
                      { label: "Resets in", value: status.resetsInMs > 0 ? `${(status.resetsInMs / 1000).toFixed(1)}s` : "Now", color: "text-yellow-400" },
                      { label: "Window", value: `${status.windowSeconds}s`, color: "text-violet-300" },
                      { label: "Max", value: status.maxRequests, color: "text-indigo-300" },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/5 rounded-xl p-3">
                        <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Send a request to see window status.</p>
              )}
            </motion.div>

            {/* Running indicator */}
            <AnimatePresence>
              {running && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-violet-500/10 border border-violet-500/30 rounded-2xl px-5 py-3 flex items-center gap-3"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping inline-block" />
                  <span className="text-violet-300 text-sm font-medium">Firing requests...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Request Log */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} custom={4}
          className="mt-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center gap-2">
            <span className="text-indigo-400">≡</span> Request Log
          </h2>
          <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-sm pr-1">
            {logs.length === 0 && (
              <p className="text-gray-600">No requests yet. Set config and fire requests.</p>
            )}
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`px-3 py-1.5 rounded-lg ${
                    log.type === "allowed" ? "text-emerald-400 bg-emerald-950/50" :
                    log.type === "rejected" ? "text-red-400 bg-red-950/50" :
                    "text-violet-300 bg-violet-950/50"
                  }`}
                >
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