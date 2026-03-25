import { useState, useEffect, useRef, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import SignalCard from '../components/SignalCard'
import SearchBar from '../components/SearchBar'
import { fetchSignalCard, fetchLiveQuote, fetchMarketStatus } from '../api'
import { RefreshCw, Wifi, Activity } from 'lucide-react'

const POPULAR = [
  'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'WIPRO', 'BAJFINANCE', 'SUNPHARMA', 'ITC',
]

const TREND_KEYS  = { '1D': '1d', '1W': '1w', '1M': '1m' }
const TREND_LABEL = { '1D': 'Intraday', '1W': '5 Days', '1M': '30 Days' }

// ── Trend Chart ──────────────────────────────────────────────
function TrendChart({ trends, liveIntraday, marketOpen }) {
  const [tab, setTab] = useState('1D')
  if (!trends) return null

  // For 1D: overlay live intraday data when market is open
  const raw =
    tab === '1D' && marketOpen && liveIntraday?.length >= 2
      ? liveIntraday
      : trends[TREND_KEYS[tab]] || []

  const data     = raw.map(d => ({ ...d, price: Number(d.price) }))
  const hasData  = data.length >= 2
  const first    = hasData ? data[0].price : 0
  const last     = hasData ? data[data.length - 1].price : 0
  const isUp     = last >= first
  const pctMove  = first ? (((last - first) / first) * 100).toFixed(2) : null
  const color    = isUp ? '#10b981' : '#ef4444'

  const fmtTick = (v) => {
    if (!v) return ''
    const s = String(v)
    const d = new Date(s)
    if (isNaN(d)) return s.slice(-5)
    // ISO datetime strings (intraday) → show HH:MM in IST
    if (s.includes('T') || (s.includes(':') && !s.includes('-'))) {
      return d.toLocaleTimeString('en-IN', {
        hour:     '2-digit',
        minute:   '2-digit',
        hour12:   false,
        timeZone: 'Asia/Kolkata',
      })
    }
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  const fmtTooltipLabel = (v) => {
    if (!v) return ''
    const s = String(v)
    const d = new Date(s)
    if (isNaN(d)) return s
    if (s.includes('T') || (s.includes(':') && !s.includes('-'))) {
      return d.toLocaleTimeString('en-IN', {
        hour:     '2-digit',
        minute:   '2-digit',
        hour12:   false,
        timeZone: 'Asia/Kolkata',
      }) + ' IST'
    }
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Price Trend</p>
            {tab === '1D' && marketOpen && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded-full border border-green-200 dark:border-green-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                LIVE
              </span>
            )}
          </div>
          {hasData && pctMove !== null && (
            <p className={`text-xs font-semibold mt-0.5 ${isUp ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              {isUp ? '▲ +' : '▼ '}{pctMove}% · {TREND_LABEL[tab]}
            </p>
          )}
        </div>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
          {['1D', '1W', '1M'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150
                ${tab === t
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <XAxis
              dataKey="time"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tickFormatter={fmtTick}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              content={({ payload, label }) =>
                payload?.[0] ? (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
                    <p className="text-gray-500 mb-0.5">{fmtTooltipLabel(label)}</p>
                    <p className="text-gray-900 dark:text-white font-bold">
                      ₹{Number(payload[0].value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
          No {tab} data available
        </div>
      )}
    </div>
  )
}

// ── Loading skeleton ─────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 h-56" />
      <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-36" />
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-52" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />)}
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/5" />
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────
export default function CardPage({ initialSym = '' }) {
  const [sym,        setSym]     = useState('')
  const [card,       setCard]    = useState(null)
  const [loading,    setLoad]    = useState(false)
  const [error,      setError]   = useState(null)

  // Live overlay: price + intraday chart updated every 4 s
  const [liveData,   setLive]    = useState(null)
  const [marketOpen, setMarket]  = useState(false)
  const [timeIST,    setTimeIST] = useState('')

  const cardPollRef = useRef(null)   // full-card refresh (5 min)
  const livePollRef = useRef(null)   // live quote refresh (4 s)
  const marketRef   = useRef(null)   // market status check (60 s)

  // ── Full card load (NOT force-refresh on silent) ───────────
  const loadCard = useCallback(async (ticker, forceRefresh = false) => {
    if (!ticker) return
    setLoad(true); setCard(null); setError(null); setLive(null)
    try {
      const data = await fetchSignalCard(ticker, forceRefresh)
      setCard(data.card)
      setError(null)
    } catch (e) {
      setError(`Could not load ${ticker}: ${e.message}`)
    } finally {
      setLoad(false)
    }
  }, [])

  // ── Background live-price poll ─────────────────────────────
  const fetchLive = useCallback(async (ticker) => {
    if (!ticker) return
    try {
      const data = await fetchLiveQuote(ticker)
      setLive(data)
      setMarket(data.market_open ?? false)
      setTimeIST(data.time_ist ?? '')
    } catch {
      // silent — keep last value
    }
  }, [])

  // ── Market status poll (60 s, to adapt interval) ──────────
  const checkMarket = useCallback(async () => {
    try {
      const data = await fetchMarketStatus()
      setMarket(data.is_open ?? false)
      setTimeIST(data.time_ist ?? '')
    } catch {
      // silent
    }
  }, [])

  // Check market status once on mount, then every 60 s
  useEffect(() => {
    checkMarket()
    marketRef.current = setInterval(checkMarket, 60_000)
    return () => clearInterval(marketRef.current)
  }, [checkMarket])

  // Auto-load when navigated from MarketMovers or external source
  useEffect(() => {
    if (initialSym) {
      clearInterval(cardPollRef.current)
      clearInterval(livePollRef.current)
      loadCard(initialSym, false)
      setSym(initialSym)
    }
  }, [initialSym, loadCard])

  // Live price poll: 4 s when market open, 30 s when closed
  useEffect(() => {
    if (!sym) return
    clearInterval(livePollRef.current)
    fetchLive(sym) // immediate
    const interval = marketOpen ? 4_000 : 30_000
    livePollRef.current = setInterval(() => fetchLive(sym), interval)
    return () => clearInterval(livePollRef.current)
  }, [sym, marketOpen, fetchLive])

  // Adjust live poll interval when market status changes (open ↔ closed)
  useEffect(() => {
    if (!sym) return
    clearInterval(livePollRef.current)
    const interval = marketOpen ? 4_000 : 30_000
    livePollRef.current = setInterval(() => fetchLive(sym), interval)
    return () => clearInterval(livePollRef.current)
  }, [marketOpen, sym, fetchLive])

  // Full-card silent refresh: every 5 min (uses cache — no force refresh)
  useEffect(() => {
    if (!sym) return
    clearInterval(cardPollRef.current)
    cardPollRef.current = setInterval(async () => {
      try {
        const data = await fetchSignalCard(sym, false)
        setCard(data.card)
      } catch {
        // silent — keep last card
      }
    }, 5 * 60_000)
    return () => clearInterval(cardPollRef.current)
  }, [sym])

  const handleSelect = (ticker) => {
    if (!ticker) return
    clearInterval(cardPollRef.current)
    clearInterval(livePollRef.current)
    setSym(ticker)
    setLive(null)
    loadCard(ticker, false)
  }

  // Merge live overlay into display card (price + intraday only)
  const displayCard = card ? {
    ...card,
    current_price: liveData?.price     ?? card.current_price,
    change_pct:    liveData?.change_pct ?? card.change_pct,
    change:        liveData?.change     ?? card.change,
    open:          liveData?.open       ?? card.open,
    high:          liveData?.high       ?? card.high,
    low:           liveData?.low        ?? card.low,
    volume:        liveData?.volume     ?? card.volume,
  } : null

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">NSE Signal Card</h2>
          <p className="text-sm text-gray-500 mt-0.5">AI-powered stock analysis · Live NSE data</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Market status pill */}
          <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border
            ${marketOpen
              ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50'
              : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            <Activity className="w-2.5 h-2.5" />
            {marketOpen ? `OPEN · ${timeIST} IST` : timeIST ? `CLOSED · ${timeIST} IST` : 'Checking…'}
          </span>

          {card && !loading && liveData && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Wifi className="w-3 h-3 animate-pulse text-green-500" />
              Live
            </span>
          )}
          {card && !loading && (
            <button
              onClick={() => loadCard(sym, true)}
              title="Force refresh"
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Smart search */}
      <SearchBar onSelect={handleSelect} />

      {/* Popular stocks */}
      <div className="flex flex-wrap gap-2">
        {POPULAR.filter(Boolean).map(s => (
          <button
            key={s}
            onClick={() => handleSelect(s)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-150
              ${sym === s
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-600 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <Skeleton />}

      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl p-4 flex items-center justify-between">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          <button
            onClick={() => loadCard(sym, false)}
            className="text-xs text-red-600 dark:text-red-400 hover:underline ml-3 flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !card && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">Search for a stock or click a popular ticker above</p>
        </div>
      )}

      {/* Chart + Card */}
      {displayCard && !loading && (
        <div className="space-y-4">
          <TrendChart
            trends={card.trends}
            liveIntraday={liveData?.intraday}
            marketOpen={marketOpen}
          />
          <SignalCard card={displayCard} />
        </div>
      )}
    </div>
  )
}
