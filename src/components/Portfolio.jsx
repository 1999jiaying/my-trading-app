import { PieChart, Cat, Fish, ChevronRight } from 'lucide-react';

export default function Portfolio({ portfolio, onSell }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-50 shadow-sm h-full transition-all">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 mb-8 flex items-center gap-2">
        <PieChart size={14} /> My Assets
      </h3>
      
      {portfolio.length === 0 ? (
        <div className="py-20 text-center opacity-10 flex flex-col items-center">
          <Cat size={40} className="mb-2" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D2D2D]">Bowl is empty</p>
        </div>
      ) : (
        <div className="space-y-3">
          {portfolio.map(([sym, qty]) => (
            <div key={sym} className="group flex justify-between items-center p-4 rounded-2xl bg-[#FDFCFB] hover:bg-white transition-all border border-transparent hover:border-gray-100 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-[11px] shadow-sm border border-gray-50">
                  {sym.substring(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-sm text-[#2D2D2D]">{sym}</p>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{qty} Shares Owned</p>
                </div>
              </div>
              
              {/* Sell Button - Hidden until hover */}
              <button 
                onClick={() => onSell(sym)}
                className="opacity-0 group-hover:opacity-100 flex items-center gap-2 bg-[#7DE2D1]/10 hover:bg-[#7DE2D1] text-[#1E3A34] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
              >
                <Fish size={14} /> Sell
              </button>

              <ChevronRight size={14} className="text-gray-200 group-hover:hidden" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}