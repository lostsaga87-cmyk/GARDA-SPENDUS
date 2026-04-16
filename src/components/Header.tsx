import React from 'react';
import { HelpCircle, LogOut } from 'lucide-react';

interface HeaderProps {
  appName: string;
  onOpenHelp: () => void;
  onLogout: () => void;
}

export default function Header({ appName, onOpenHelp, onLogout }: HeaderProps) {
  return (
    <>
      <header className="bg-white shadow-md p-4 sticky top-0 z-40">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-blue-700">{appName}</h1>
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
            <button onClick={onOpenHelp} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-gray-500 hover:bg-gray-600 transition-colors text-sm md:text-base">
              <HelpCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Bantuan
            </button>
            <button onClick={onLogout} className="flex items-center px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors text-sm md:text-base">
              <LogOut className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Log Out
            </button>
          </div>
        </div>
      </header>
      <div className="bg-slate-800 text-white p-3 overflow-hidden whitespace-nowrap">
        <div className="inline-block pl-[100%] animate-[marquee_20s_linear_infinite]">
          <span className="font-semibold">{appName} | Generator Rencana Pembelajaran Mendalam</span>
        </div>
      </div>
    </>
  );
}
