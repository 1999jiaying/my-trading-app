import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { TrendingUp, Wallet, Search, BarChart3, ArrowUpRight } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ balance: 0 });
  const [symbol, setSymbol] = useState("");
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Handle Authentication State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch User Profile (Balance) when logged in
  useEffect(() => {
    if (session) fetchProfile();
  }, [session]);

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) setProfile(data);
  }

  // 3. Step 4 Logic: Fetch Real Price from Twelve Data
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!symbol) return;
    setLoading(true);
    const API_KEY = import.meta.env.VITE_TWELVE_DATA_KEY;
    
    try {
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${API_KEY}`);
      const data = await res.json();
      if (data.status === "error") throw new Error("Not found");
      setPriceData(data);
    } catch (err) {
      alert("Symbol not found or API limit reached.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Trade Logic: Deduct money and save trade to Supabase
  const handleBuy = async () => {
    const cost = parseFloat(priceData.close);
    if (profile.balance < cost) return alert("Not enough paper money!");

    const { error: tradeErr } = await supabase.from('trades').insert([
      { user_id: session.user.id, symbol: priceData.symbol, quantity: 1, price_at_trade: cost, type: 'BUY' }
    ]);

    if (!tradeErr) {
      const { error: balErr } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - cost })
        .eq('id', session.user.id);
      
      if (!balErr) {
        fetchProfile(); // Refresh balance on screen
        alert(`Bought 1 share of ${priceData.symbol}!`);
      }
    }
  };

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 p-4">
        <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">PaperTrader v2026</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} theme="dark" />
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN ---
  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <nav className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-green-500" />
          <span className="text-xl font-bold tracking-tight uppercase">MockTrade</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
            <Wallet size={18} className="text-yellow-500" />
            <span className="font-mono font-bold">${Number(profile.balance).toLocaleString()}</span>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-white text-sm transition">Logout</button>
        </div>
      </nav>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {/* Market Search Panel */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-lg">
            <form onSubmit={handleSearch} className="flex gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-500" size={20} />
                <input 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="Enter Stock Symbol (e.g., AAPL, TSLA, BTC/USD)" 
                  className="bg-gray-950 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white w-full focus:ring-2 focus:ring-green-500 transition outline-none"
                />
              </div>
              <button disabled={loading} className="bg-green-600 hover:bg-green-500 px-8 rounded-xl font-bold transition disabled:opacity-50">
                {loading ? '...' : 'Search'}
              </button>
            </form>

            {priceData && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <h2 className="text-4xl font-black">{priceData.symbol}</h2>
                    <p className="text-gray-400">{priceData.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-mono text-green-400">${parseFloat(priceData.close).toFixed(2)}</p>
                    <p className="text-gray-400 text-sm">Real-time Price</p>
                  </div>
                </div>
                <button 
                  onClick={handleBuy}
                  className="w-full bg-white text-black py-4 rounded-xl font-black text-lg hover:bg-gray-200 flex items-center justify-center gap-2 transition"
                >
                  <ArrowUpRight size={20} /> EXECUTE BUY ORDER
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Portfolio Section */}
        <div className="space-y-6">
          <section className="bg-gray-900 p-6 rounded-2xl border border-gray-800 h-full">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-4">
              <BarChart3 size={18} className="text-blue-500" /> Current Assets
            </h2>
            <div className="flex flex-col items-center justify-center h-48 text-gray-600">
              <p className="text-sm">Trades you execute will appear here.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}