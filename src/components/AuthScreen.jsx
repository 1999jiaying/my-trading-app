import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';
import { Cat } from 'lucide-react';

export default function AuthScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFCFB]">
      <div className="w-full max-w-sm p-10 bg-white rounded-[3rem] shadow-sm border border-gray-100 text-center">
        <div className="inline-flex p-4 bg-[#FF9E7D] text-white rounded-2xl mb-6 shadow-lg shadow-orange-100/20">
          <Cat size={32} />
        </div>
        <h1 className="text-2xl font-bold text-[#2D2D2D] mb-2 tracking-tight">Welcome to Trading Cat</h1>
        <p className="text-sm text-gray-400 mb-8 font-medium italic">Your cozy corner for paper trading.</p>
        <Auth 
          supabaseClient={supabase} 
          appearance={{ 
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#FF9E7D',
                  brandAccent: '#2D2D2D',
                }
              }
            }
          }} 
          theme="light" 
        />
      </div>
    </div>
  );
}