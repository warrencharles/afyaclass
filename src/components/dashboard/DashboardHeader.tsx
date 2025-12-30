import React, { useRef, useState, useEffect } from 'react';
import { Search, Menu, Filter, ChevronDown, User as UserIcon, LogOut, Sparkles, Home, MessageSquare, Check } from 'lucide-react';
import { User } from '../../types';
import NotificationIcon from '../layout/NotificationIcon';
import { Link, useLocation } from 'react-router-dom';

interface DashboardHeaderProps {
    user: User | null;
    selectedClassLevel: string;
    setSelectedClassLevel: (value: string) => void;
    selectedSemester: string;
    setSelectedSemester: (value: string) => void;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    classLevelOptions: { value: string; label: string }[];
    semesterOptions: { value: string; label: string }[];
    isMobile?: boolean;
    onMenuToggle?: () => void;
    onLogout: () => void; // Added logout handler for dropdown
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    user,
    selectedClassLevel,
    setSelectedClassLevel,
    selectedSemester,
    setSelectedSemester,
    searchTerm,
    setSearchTerm,
    classLevelOptions,
    semesterOptions,
    isMobile,
    onMenuToggle,
    onLogout
}) => {
    const [showFilters, setShowFilters] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<'class' | 'semester' | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);
    const classDropdownRef = useRef<HTMLDivElement>(null);
    const semDropdownRef = useRef<HTMLDivElement>(null);
    const filterToggleRef = useRef<HTMLButtonElement>(null);

    // Onboarding State
    const [showFilterTip, setShowFilterTip] = useState(false);

    useEffect(() => {
        const hasSeenTip = localStorage.getItem('hasSeenFilterTip');
        if (!hasSeenTip) {
            // Show tip after a short delay for attention
            const timer = setTimeout(() => setShowFilterTip(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissFilterTip = () => {
        setShowFilterTip(false);
        localStorage.setItem('hasSeenFilterTip', 'true');
    };

    const navItems = [
        { label: 'Home', path: '/dashboard', icon: Home },
        { label: 'Forum', path: '/dashboard/forum', icon: MessageSquare },
        // Profile removed as requested (accessible via dropdown)
    ];

    const location = useLocation();
    const isActive = (path: string) => {
        if (path === '/dashboard' && location.pathname === '/dashboard') return true;
        if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
        return false;
    };

    // Close menus when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                filterRef.current &&
                !filterRef.current.contains(event.target as Node) &&
                filterToggleRef.current &&
                !filterToggleRef.current.contains(event.target as Node)
            ) {
                setShowFilters(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
            if (classDropdownRef.current && !classDropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(prev => prev === 'class' ? null : prev);
            }
            if (semDropdownRef.current && !semDropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(prev => prev === 'semester' ? null : prev);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [filterRef, profileRef, classDropdownRef, semDropdownRef]);

    // Auto-expand filters on mobile if class level is not selected (UX for new users)
    useEffect(() => {
        if (isMobile && !selectedClassLevel) {
            setShowFilters(true);
        }
    }, [isMobile, selectedClassLevel]);

    return (
        <div className="bg-white/90 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-100 shadow-sm transition-all duration-300">
            <div className="px-4 py-3 lg:px-8 lg:py-4 flex flex-col gap-4">

                {/* Top Row: Brand/Menu + Search + Actions */}
                <div className="flex items-center justify-between">
                    {/* Left: Mobile Toggle & Greeting */}
                    <div className="flex items-center gap-4">
                        {isMobile && onMenuToggle && (
                            <button
                                onClick={onMenuToggle}
                                className="p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
                            >
                                <Menu size={20} />
                            </button>
                        )}

                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="hidden md:inline">Welcome back,</span>
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    {user?.username?.split(' ')[0] || 'Scholar'}
                                </span>
                                <span className="text-2xl">👋</span>
                            </h1>
                            <p className="text-xs text-gray-500 hidden md:block font-medium">Let's continue learning today.</p>
                        </div>
                    </div>

                    {/* Center: Navigation Pill (Desktop) */}
                    <div className="hidden md:flex items-center bg-gray-100/50 p-1.5 rounded-full border border-gray-200/50 backdrop-blur-md absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                      flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                      ${isActive(item.path)
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-100 transform scale-105'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'}
                    `}
                            >
                                <item.icon size={16} className={isActive(item.path) ? 'fill-blue-600/10' : ''} />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Mobile Navigation (Visible only on small screens) */}
                    <div className="md:hidden flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`p-2 rounded-xl transition-colors ${isActive(item.path) ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
                                title={item.label}
                            >
                                <item.icon size={20} />
                            </Link>
                        ))}
                    </div>

                    {/* Right: Search, Notifications, Profile */}
                    <div className="flex items-center gap-3 md:gap-4">

                        {/* Search Bar - Desktop */}
                        <div className="relative hidden lg:block w-72 group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-400">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search subjects, books, notes..."
                                className="pl-10 pr-4 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium placeholder:font-normal"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Mobile Search Toggle (Optional, can just show input if space permits) */}
                        <button
                            ref={filterToggleRef}
                            className="lg:hidden p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 relative transition-colors"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={20} className={showFilters ? 'text-blue-600' : 'text-gray-500'} />

                            {/* Onboarding Tooltip (Mobile) */}
                            {showFilterTip && (
                                <div className="absolute top-full right-0 mt-3 w-48 bg-blue-600 text-white p-3 rounded-xl shadow-xl z-[60] animate-bounce-gentle">
                                    <div className="absolute -top-1.5 right-3 w-3 h-3 bg-blue-600 rotate-45"></div>
                                    <p className="text-xs font-medium mb-2">Tap here to select your Class Level & Semester!</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); dismissFilterTip(); }}
                                        className="text-[10px] uppercase font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg w-full"
                                    >
                                        Got it
                                    </button>
                                </div>
                            )}
                        </button>


                        <div className="h-8 w-[1px] bg-gray-200 hidden md:block"></div>

                        {/* Notification Bell */}
                        <NotificationIcon />

                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2 p-1 md:p-1.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all"
                            >
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
                                    {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon size={16} />}
                                </div>
                                <ChevronDown size={14} className="text-gray-400 hidden md:block" />
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fade-in-down origin-top-right">
                                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                        <p className="text-sm font-bold text-gray-800">{user?.username}</p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>

                                    <Link to="/dashboard/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                                        <UserIcon size={16} />
                                        My Profile
                                    </Link>


                                    <div className="my-1 border-t border-gray-50"></div>

                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Filters (Desktop: Inline, Mobile: Collapsible) */}
                {/* Only show this row if we are on the main dashboard tab (implied by usage) OR if mobile filters are toggled */}
                <div
                    ref={filterRef}
                    className={`
            lg:flex lg:items-center lg:justify-between
            ${showFilters ? 'flex flex-col gap-4 pt-2 border-t border-gray-100 animate-fade-in-down' : 'hidden'} 
          `}
                >
                    {/* Mobile Search input (Expanded) */}
                    <div className="relative lg:hidden w-full">
                        <input
                            type="text"
                            placeholder="Search materials..."
                            className="pl-4 pr-10 py-2.5 w-full bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto items-center">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mr-2 hidden lg:flex relative">
                            <Filter size={16} />
                            <span>Filters:</span>

                            {/* Onboarding Tooltip (Hidden on Desktop as requested) */}
                            {showFilterTip && false && (
                                <div className="absolute bottom-full left-0 mb-3 w-56 bg-blue-600 text-white p-4 rounded-xl shadow-xl z-[60]">
                                    <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-blue-600 rotate-45"></div>
                                    <p className="text-sm font-medium mb-2">Select your settings here to see relevant content.</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); dismissFilterTip(); }}
                                        className="text-xs uppercase font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg w-full"
                                    >
                                        Don't show again
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Class Level Dropdown */}
                        <div className="w-full lg:w-48 relative" ref={classDropdownRef}>
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'class' ? null : 'class')}
                                className={`w-full flex items-center justify-between text-left bg-gray-50 border transition-all text-sm font-medium py-2 px-3 rounded-xl 
                                    ${activeDropdown === 'class' ? 'bg-white border-blue-500 shadow-sm ring-2 ring-blue-500/10' : 'border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                            >
                                <span className={selectedClassLevel ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedClassLevel ? classLevelOptions.find(o => o.value === selectedClassLevel)?.label : 'Select Class'}
                                </span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'class' ? 'rotate-180 text-blue-500' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {activeDropdown === 'class' && (
                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-fade-in-down">
                                    <div className="p-1 space-y-0.5">
                                        {classLevelOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setSelectedClassLevel(opt.value);
                                                    setActiveDropdown(null);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
                                                     ${selectedClassLevel === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <span>{opt.label}</span>
                                                {selectedClassLevel === opt.value && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Semester Dropdown */}
                        <div className="w-full lg:w-48 relative" ref={semDropdownRef}>
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'semester' ? null : 'semester')}
                                className={`w-full flex items-center justify-between text-left bg-gray-50 border transition-all text-sm font-medium py-2 px-3 rounded-xl 
                                    ${activeDropdown === 'semester' ? 'bg-white border-blue-500 shadow-sm ring-2 ring-blue-500/10' : 'border-gray-200 hover:bg-gray-100 hover:border-gray-300'}`}
                            >
                                <span className={selectedSemester ? 'text-gray-900' : 'text-gray-500'}>
                                    {selectedSemester ? semesterOptions.find(o => o.value === selectedSemester)?.label : 'Select Semester'}
                                </span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'semester' ? 'rotate-180 text-blue-500' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {activeDropdown === 'semester' && (
                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-50 animate-fade-in-down">
                                    <div className="p-1 space-y-0.5">
                                        {semesterOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setSelectedSemester(opt.value);
                                                    setActiveDropdown(null);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
                                                     ${selectedSemester === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                <span>{opt.label}</span>
                                                {selectedSemester === opt.value && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Active Filters Summary */}
                    <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                        <Sparkles size={12} />
                        <span>
                            Showing: {selectedClassLevel || 'All'} • Sem {selectedSemester}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
