import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, User, MessageSquare, LogOut, BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface SidebarProps {
    isOpen: boolean;
    isMobile: boolean;
    onToggle: () => void;
    onCloseMobile: () => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    isMobile,
    onToggle,
    onCloseMobile,
    onLogout
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = useMemo(() => [
        { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
        { id: 'profile', label: 'Profile', icon: User, path: '/dashboard/profile' },
        { id: 'forum', label: 'Forum', icon: MessageSquare, path: '/dashboard/forum' },
    ], []);

    const isActive = (path: string) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
                    onClick={onCloseMobile}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
          fixed top-0 bottom-0 left-0 z-50
          bg-white shadow-2xl border-r border-gray-100
          transition-all duration-300 ease-in-out
          flex flex-col
          ${isMobile ? (isOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full w-[280px]') : (isOpen ? 'w-[280px]' : 'w-[80px]')}
        `}
            >
                {/* Header / Logo Area */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100/50">
                    <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0">
                            <BookOpen size={20} />
                        </div>
                        <div className={`transition-opacity duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100'}`}>
                            <h1 className="text-xl font-bold text-gray-800 tracking-tight">AfyaClass</h1>
                        </div>
                    </div>

                    {/* Mobile Close Button */}
                    {isMobile && (
                        <button
                            onClick={onCloseMobile}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation Items */}
                <div className="flex-1 py-6 px-4 overflow-y-auto overflow-x-hidden space-y-2">
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) onCloseMobile();
                                }}
                                className={`
                    w-full flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden
                    ${active
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                 `}
                                title={!isOpen ? item.label : ''}
                            >
                                {/* Icon Wrapper */}
                                <div className={`
                     flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                     ${active ? 'bg-white/20' : 'bg-transparent group-hover:bg-gray-100'}
                  `}>
                                    <item.icon size={20} />
                                </div>

                                {/* Label */}
                                <span className={`font-medium whitespace-nowrap transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0' : 'opacity-100'}`}>
                                    {item.label}
                                </span>

                                {/* Active Indicator (Right Border) for collapsed state */}
                                {!isOpen && !isMobile && active && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    {/* Desktop Toggle */}
                    {!isMobile && (
                        <button
                            onClick={onToggle}
                            className="w-full flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 mb-2 transition-colors"
                        >
                            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </button>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={onLogout}
                        className={`
                 w-full flex items-center gap-4 px-3 py-3 rounded-2xl text-red-600 hover:bg-red-50 transition-all duration-300 group
                 ${!isOpen && !isMobile ? 'justify-center' : ''}
              `}
                    >
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 group-hover:bg-red-200 transition-colors">
                            <LogOut size={18} />
                        </div>
                        <span className={`font-medium whitespace-nowrap transition-all duration-300 ${!isOpen && !isMobile ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
};
