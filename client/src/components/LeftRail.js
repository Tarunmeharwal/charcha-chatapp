import React from "react";
import { MessageSquare, Phone, Users, Sparkles, Bookmark, Sliders, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getAvatarSrc } from "@/lib/avatar";

export default function LeftRail({ activeTab, setActiveTab }) {
    const { user } = useAuth();

    return (
        <aside className="hidden md:flex flex-col items-center justify-between w-16 lg:w-[68px] bg-white/90 backdrop-blur-xl border border-black/[0.06] rounded-[26px] py-5 shadow-bento z-20 flex-shrink-0" data-purpose="global-sidebar">
            {/* Top: App Icon & Navigation Stack */}
            <div className="flex flex-col items-center gap-7">
                <a className="relative group block" href="#" title="Charcha">
                    <div className="w-11 h-11 rounded-[14px] bg-[#0071E3] flex items-center justify-center shadow-pill transition-transform duration-200 group-hover:scale-[1.03] active:scale-95">
                        <MessageCircle className="w-5 h-5 text-white stroke-[2.3]" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                </a>

                {/* Primary Dock Items */}
                <nav className="flex flex-col items-center gap-2">
                    {/* Active Chats */}
                    <button
                        className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 group ${activeTab === 'chats' ? 'bg-blue-50/90 text-[#0071E3]' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100/70'}`}
                        title="Chats"
                        onClick={() => setActiveTab("chats")}
                    >
                        {activeTab === 'chats' && <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0071E3] rounded-r-full"></div>}
                        <MessageSquare className="w-5 h-5 stroke-[2.2]" />
                        <span className="absolute left-16 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-[11px] rounded-lg font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap shadow-md z-30">Chats</span>
                    </button>

                    {/* Status/Stories */}
                    <button
                        className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 group ${activeTab === 'status' ? 'bg-blue-50/90 text-[#0071E3]' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100/70'}`}
                        title="Status"
                        onClick={() => setActiveTab("status")}
                    >
                        {activeTab === 'status' && <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0071E3] rounded-r-full"></div>}
                        <Sparkles className="w-5 h-5 stroke-[1.8]" />
                        <span className="absolute left-16 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-[11px] rounded-lg font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap shadow-md z-30">Status</span>
                    </button>

                    {/* Contacts */}
                    <button className="w-11 h-11 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-all duration-150 group relative" title="Contacts">
                        <Users className="w-5 h-5 stroke-[1.8]" />
                        <span className="absolute left-16 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-[11px] rounded-lg font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap shadow-md z-30">Contacts</span>
                    </button>

                    {/* Calls */}
                    <button className="w-11 h-11 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-all duration-150 group relative" title="Calls">
                        <Phone className="w-5 h-5 stroke-[1.8]" />
                        <span className="absolute left-16 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-[11px] rounded-lg font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap shadow-md z-30">Calls</span>
                    </button>

                    {/* Vault / Saved */}
                    <button className="w-11 h-11 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-all duration-150 group relative" title="Vault">
                        <Bookmark className="w-5 h-5 stroke-[1.8]" />
                        <span className="absolute left-16 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-[11px] rounded-lg font-medium opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap shadow-md z-30">Saved</span>
                    </button>
                </nav>
            </div>

            {/* Bottom: Settings & User Profile Squircle */}
            <div className="flex flex-col items-center gap-3.5">
                <button className="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 flex items-center justify-center transition" title="Preferences">
                    <Sliders className="w-4 h-4 stroke-[1.8]" />
                </button>

                {/* Authenticated User Avatar */}
                <div className="relative cursor-pointer group" title={user?.username || "User"}>
                    <div className="w-10 h-10 rounded-full ring-2 ring-black/[0.06] overflow-hidden group-hover:ring-[#0071E3] transition">
                        <img src={getAvatarSrc(user)} alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
                </div>
            </div>
        </aside>
    );
}
