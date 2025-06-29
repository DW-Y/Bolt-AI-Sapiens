import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { BellIcon, GlobeIcon, UserIcon, Menu, X, LogOut, LogIn, UserPlus } from 'lucide-react';

interface NavBarProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
  onUpgradeClick: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onLoginClick, onSignupClick, onUpgradeClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [hasNewContent, setHasNewContent] = useState(true); // TODO: Connect to actual news update logic
  const { currentUser, userProfile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const isNewsPage = location.pathname.startsWith('/news');
  const isLearningPage = location.pathname.startsWith('/learning') || location.pathname.startsWith('/classroom');
  const isHomePage = location.pathname === '/';

  const handleUserIconClick = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const handleDropdownItemClick = (action: () => void) => {
    setShowUserDropdown(false);
    action();
  };

  const handleGlobeClick = () => {
    navigate('/news');
    if (hasNewContent) {
      setHasNewContent(false); // Mark as read when user visits news
    }
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <header className="bg-[#202020] fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-4 h-[72px] flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center">
          <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick}>
            <img
              src="https://cdn.jsdelivr.net/gh/hajin148/Bolt-AI-Sapiens@5492ed01ad294aebffa564b566ca04d1d36a7cd1/public/logo.png"
              alt="AI Sapiens Logo"
              className="h-10 w-auto"
              onError={({ currentTarget }) => {
                currentTarget.style.display = 'none';
                const fallback = currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
            <div 
              className="hidden text-white text-lg font-bold ml-3"
            >
              AI Sapiens
            </div>
          </div>
        </div>

        {/* Right side content */}
        <div className="flex items-center gap-4">

          {/* Learning Space button - only when logged in */}
          {currentUser && (
            <div className="relative hidden md:block">
              {/* Gradient border container */}
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-[#FF0000] via-[#693CB1] to-[#C22CD2] p-[2px]">
                <div className="h-full w-full bg-[#111111] rounded-[calc(0.375rem-2px)]"></div>
              </div>
              {/* Button content */}
              <Button
                onClick={() => navigate('/learning')}
                variant="ghost"
                className="relative h-[42px] bg-transparent rounded-md border-none text-white text-sm font-normal font-['Pretendard-Regular',Helvetica] tracking-[-0.21px] px-3 hover:bg-transparent hover:text-white"
              >
                Learning Space
              </Button>
            </div>
          )}

          {/* Action icons and auth */}
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-7 h-7 p-0 hover:bg-[#333333] ${
                    isNewsPage ? 'bg-[#333333]' : ''
                  }`}
                  onClick={handleGlobeClick}
                >
                  <GlobeIcon className={`w-7 h-7 ${
                    isNewsPage ? 'text-blue-400' : 'text-white'
                  }`} />
                </Button>
                {/* Red notification dot for new content */}
                {hasNewContent && currentUser && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#202020]" />
                )}
              </div>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 p-0 hover:bg-[#333333]"
                  onClick={handleUserIconClick}
                >
                  <UserIcon className="w-7 h-7 text-white" />
                </Button>
                
                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserDropdown(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        onClick={() => handleDropdownItemClick(handleLogout)}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`w-7 h-7 p-0 hover:bg-[#333333] ${
                    isNewsPage ? 'bg-[#333333]' : ''
                  }`}
                  onClick={handleGlobeClick}
                >
                  <GlobeIcon className={`w-7 h-7 ${
                    isNewsPage ? 'text-blue-400' : 'text-white'
                  }`} />
                </Button>
              </div>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-7 h-7 p-0 hover:bg-[#333333]"
                  onClick={handleUserIconClick}
                >
                  <UserIcon className="w-7 h-7 text-white" />
                </Button>
                
                {/* User Dropdown Menu for non-logged in users */}
                {showUserDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserDropdown(false)}
                    />
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <button
                        onClick={() => handleDropdownItemClick(onLoginClick)}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                        disabled={loading}
                      >
                        <LogIn className="h-4 w-4" />
                        Log in
                      </button>
                      <button
                        onClick={() => handleDropdownItemClick(onSignupClick)}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                        disabled={loading}
                      >
                        <UserPlus className="h-4 w-4" />
                        Register
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white hover:text-blue-400 p-1"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="absolute top-[72px] left-0 right-0 bg-[#202020] border-t border-gray-700 md:hidden">
            <div className="flex flex-col p-3 space-y-3">
              {currentUser && (
                <>
                  <button
                    onClick={() => {
                      navigate('/learning');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`text-left text-sm font-normal font-['Pretendard-Regular',Helvetica] tracking-[-0.21px] transition-colors ${
                      isLearningPage 
                        ? 'text-blue-400' 
                        : 'text-white hover:text-blue-400'
                    }`}
                  >
                    Learning Space
                  </button>
                </>
              )}
              
              {/* Mobile auth buttons */}
              {currentUser ? (
                <div className="pt-3 border-t border-gray-700">
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      onLoginClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 flex items-center gap-2"
                    disabled={loading}
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                  <button
                    onClick={() => {
                      onSignupClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 flex items-center gap-2"
                    disabled={loading}
                  >
                    <UserPlus className="h-4 w-4" />
                    Register
                  </button>
                </div>
              )}
              
              {/* Upgrade button for mobile */}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavBar;