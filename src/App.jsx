import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from './supabaseClient';
import AuthScreen from './components/AuthScreen';
import Portfolio from './components/Portfolio';
import { Cat, Search, ShoppingBag, LogOut, Activity, Loader2, Brain } from 'lucide-react';
import { HfInference } from "@huggingface/inference";

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ balance: 0 });
  const [symbol, setSymbol] = useState("");
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [analysis, setAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const lastCallTime = useRef(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) { fetchProfile(); fetchPortfolio(); }
  }, [session]);

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setProfile(data);
  }

  async function fetchPortfolio() {
    const { data } = await supabase.from('trades').select('*').eq('user_id', session.user.id);
    if (data) {
      const summary = data.reduce((acc, trade) => {
        const qty = trade.type === 'BUY' ? trade.quantity : -trade.quantity;
        acc[trade.symbol] = (acc[trade.symbol] || 0) + qty;
        return acc;
      }, {});
      setPortfolio(Object.entries(summary).filter(([_, qty]) => qty > 0));
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${import.meta.env.VITE_TWELVE_DATA_KEY}`);
      const data = await res.json();
      if (data.status === "error") throw new Error();
      setPriceData(data);
    } catch {
      alert("Ticker not found! Try 'NVDA' or 'TSLA'.");
    } finally { setLoading(false); }
  };

  const handleBuy = async () => {
    const cost = parseFloat(priceData.close);
    if (profile.balance < cost) return alert("Not enough treats! 🐾");
    const { error } = await supabase.from('trades').insert([{ user_id: session.user.id, symbol: priceData.symbol, quantity: 1, price_at_trade: cost, type: 'BUY' }]);
    if (!error) {
      await supabase.from('profiles').update({ balance: profile.balance - cost }).eq('id', session.user.id);
      fetchProfile(); fetchPortfolio();
    }
  };

  const handleSell = async (sym) => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${sym}&apikey=${import.meta.env.VITE_TWELVE_DATA_KEY}`);
      const data = await res.json();
      const price = parseFloat(data.price);
      const { error } = await supabase.from('trades').insert([{ user_id: session.user.id, symbol: sym, quantity: 1, price_at_trade: price, type: 'SELL' }]);
      if (!error) {
        await supabase.from('profiles').update({ balance: profile.balance + price }).eq('id', session.user.id);
        fetchProfile(); fetchPortfolio();
      }
    } finally { setLoading(false); }
  };

  // AI
  const handleAIAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);
      const holdings = portfolio.map(([s, q]) => `${q}x ${s}`).join(", ");
  
      const out = await hf.chatCompletion({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [
          { 
            role: "system", 
            content: `You are Snow, an expert financial trading cat. 
            Task: Analyze the user's portfolio risk.
            Style: One brief paragraph. Use 2-3 cat puns. 
            Focus: Tell them if they are too heavy in one sector (like Tech) or if they need more treats (diversification).` 
          },
          { role: "user", content: `Analyze my portfolio risk: ${holdings}` }
        ],
        max_tokens: 150,
      });
  
      // This path is usually more reliable for the 'mapping' style responses
      setAnalysis(out.choices[0].message.content);
      
    } catch (err) {
      console.error("Snow Error:", err);
      setAnalysis("Snow is chasing a red dot! (API busy, try once more).");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!session) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-[#4A4A4A] font-sans antialiased">
      {/* PEACH GLOW BLOBS */}
      <div className="fixed top-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#FF9E7D]/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[5%] right-[-5%] w-[300px] h-[300px] bg-[#FF9E7D]/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="max-w-[1200px] mx-auto min-h-screen p-8 relative z-10">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FF9E7D] rounded-[1.2rem] flex items-center justify-center text-white shadow-lg">
              <Cat size={26} />
            </div>
            <h1 className="text-2xl font-black text-[#2D2D2D] uppercase tracking-tight">Trading Cat</h1>
          </div>
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full shadow-sm border border-orange-50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Treat Jar</span>
            <span className="text-xl font-mono font-black text-[#2D2D2D]">${Number(profile.balance).toLocaleString()}</span>
            <button onClick={() => supabase.auth.signOut()} className="ml-4 text-gray-300 hover:text-red-400"><LogOut size={20} /></button>
          </div>
        </header>

        <main className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <form onSubmit={handleSearch} className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#FF9E7D] opacity-50" size={20} />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Hunt for tickers..." className="w-full bg-white border-none rounded-full py-6 pl-16 pr-6 shadow-sm focus:ring-2 ring-[#FF9E7D]/20 outline-none font-medium" />
            </form>

            {priceData ? (
              <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-orange-100/20 border border-orange-50">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-6xl font-black text-[#2D2D2D]">{priceData.symbol}</h2>
                    <p className="text-gray-400 font-bold mt-1 uppercase text-xs">{priceData.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-mono font-black text-[#2D2D2D]">${parseFloat(priceData.close).toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-2 text-green-500 font-black text-[10px] mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" /> LIVE HUNT
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleBuy}
                  className="w-full bg-[#E88B5B] hover:bg-[#D67A4A] py-6 rounded-[2rem] text-[#2D2D2D] font-black text-xl uppercase tracking-widest shadow-[0_10px_25px_rgba(232,139,91,0.3)] flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <ShoppingBag size={24} />
                  Execute Order
                </button>
              </div>
            ) : (
              <div className="h-64 rounded-[3rem] border-4 border-dashed border-orange-100/30 flex flex-col items-center justify-center text-orange-200">
                <Cat size={48} className="mb-2 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">Ready to pounce?</p>
              </div>
            )}

            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-50 relative">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase text-[#FF9E7D] flex items-center gap-2 tracking-widest">
                  <Brain size={16} /> Snow's Wisdom
                </h3>
                <button
                  onClick={handleAIAnalyze}
                  className="bg-[#EE9D73] text-[#3D2B1F] px-8 py-2 rounded-full text-xs font-black uppercase hover:bg-[#E28A5B] transition-all shadow-md shadow-orange-200/50"
                >
                  {isAnalyzing ? "Thinking..." : "Analyze"}
                </button>
              </div>
              <p className="text-[#5A5A5A] font-medium italic mb-2 tracking-tight">
                {analysis || "Let Snow help you analyze your portfolio!"}
              </p>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-50 h-full min-h-[500px]">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">My Assets</h3>
              <Portfolio portfolio={portfolio} onSell={handleSell} />
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}