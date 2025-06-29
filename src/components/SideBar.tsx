import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { tools } from '../data/tools';
import { 
  PlusCircle,
  Wallet,
  Menu,
  X,
  ExternalLink,
  BookOpen,
  Loader2,
  Trash2
} from 'lucide-react';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface SideBarProps {
  onUpgradeClick: () => void;
  onLoginClick: () => void;
}

interface LearningClassroom {
  id: string;
  name: string;
  color: string;
  module_count?: number;
}

interface PromptSession {
  id: string;
  title: string;
  updated_at: string;
}

const SideBar: React.FC<SideBarProps> = ({ onUpgradeClick, onLoginClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, userTokens } = useAuth();
  const [learningClassrooms, setLearningClassrooms] = useState<LearningClassroom[]>([]);
  const [promptSessions, setPromptSessions] = useState<PromptSession[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 사용자의 Learning Space 클래스룸들 가져오기 함수
  const fetchLearningClassrooms = useCallback(async () => {
    if (!currentUser) {
      setLearningClassrooms([]);
      return;
    }

    setLoadingClassrooms(true);
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          color,
          modules(count)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const classrooms: LearningClassroom[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        color: item.color,
        module_count: item.modules?.[0]?.count || 0
      }));

      setLearningClassrooms(classrooms);
    } catch (error) {
      console.error('Error fetching learning classrooms:', error);
      setLearningClassrooms([]);
    } finally {
      setLoadingClassrooms(false);
    }
  }, [currentUser]);

  const fetchPromptSessions = useCallback(async () => {
    if (!currentUser) {
      setPromptSessions([]);
      return;
    }

    setLoadingPrompts(true);
    try {
      const { data, error } = await supabase
        .from('prompt_sessions')
        .select('id, title, updated_at')
        .eq('user_id', currentUser.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setPromptSessions(data || []);
    } catch (error) {
      console.error('Error fetching prompt sessions:', error);
      setPromptSessions([]);
    } finally {
      setLoadingPrompts(false);
    }
  }, [currentUser]);

  // Real-time subscription for learning classrooms
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to classroom changes for current user
    const classroomSubscription = supabase
      .channel(`classrooms_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classrooms',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('Classroom change detected:', payload);
          // Always refetch to ensure we have the latest data
          fetchLearningClassrooms();
        }
      )
      .subscribe();


    return () => {
      classroomSubscription.unsubscribe();
    };
  }, [currentUser]);

  // Listen for custom refresh events for learning classrooms
  useEffect(() => {
    const handleRefreshClassrooms = () => {
      console.log('Custom refresh event triggered for classrooms');
      fetchLearningClassrooms();
    };

    window.addEventListener('refreshLearningClassrooms', handleRefreshClassrooms);
    return () => {
      window.removeEventListener('refreshLearningClassrooms', handleRefreshClassrooms);
    };
  }, [fetchLearningClassrooms]);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setIsExpanded(false); // 데스크톱에서는 항상 펼쳐진 상태
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 사용자의 Learning Space 클래스룸들 가져오기
  useEffect(() => {
    fetchLearningClassrooms();
  }, [fetchLearningClassrooms]);

  // Real-time subscription for prompt sessions
  useEffect(() => {
    if (!currentUser) {
      setPromptSessions([]);
      return;
    }

    fetchPromptSessions();

    const promptSubscription = supabase
      .channel(`prompt_sessions_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prompt_sessions',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('Prompt session change detected:', payload);
          fetchPromptSessions();
        }
      )
      .subscribe();

    return () => {
      promptSubscription.unsubscribe();
    };
  }, [currentUser]);

  // Listen for custom refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log('Custom refresh event triggered for prompt sessions');
      fetchPromptSessions();
    };

    window.addEventListener('refreshPromptSessions', handleRefresh);
    return () => {
      window.removeEventListener('refreshPromptSessions', handleRefresh);
    };
  }, [fetchPromptSessions]);

  const getFavoriteTools = () => {
    if (!currentUser || !userProfile?.favorites) return [];
    
    return userProfile.favorites
      .map(favoriteName => {
        const tool = tools.find(t => t.name.toLowerCase() === favoriteName.toLowerCase());
        return tool ? { name: tool.name } : null;
      })
      .filter(Boolean);
  };

  const getToolIcon = (toolName: string) => {
    const tool = tools.find(t => t.name.toLowerCase() === toolName.toLowerCase());
    return tool?.iconUrl || null;
  };

  const handleNewPrompt = () => {
    handleCreateNewPrompt();
    if (isMobile) setIsExpanded(false);
  };

  const handleCreateNewPrompt = async () => {
    if (!currentUser) {
      navigate('/prompts');
      return;
    }
    
    try {
      const { data: newSession, error } = await supabase
        .from('prompt_sessions')
        .insert({
          title: 'New Conversation',
          tags: [],
          user_id: currentUser.id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Refresh prompt sessions to update sidebar
      await fetchPromptSessions();
      
      navigate(`/prompts/${newSession.id}`);
    } catch (error) {
      console.error('Error creating new prompt session:', error);
      // Fallback to prompts page if creation fails
      navigate('/prompts');
    }
  };

  const handleToolClick = (toolName: string) => {
    const tool = tools.find(t => t.name.toLowerCase() === toolName.toLowerCase());
    if (tool) {
      window.open(tool.url, '_blank', 'noopener,noreferrer');
    }
    if (isMobile) setIsExpanded(false);
  };

  const handleClassroomClick = (classroomId: string) => {
    navigate(`/classroom/${classroomId}`);
    if (isMobile) setIsExpanded(false);
  };

  const handleLearningSpaceClick = () => {
    navigate('/learning');
    if (isMobile) setIsExpanded(false);
  };

  const handleAllLearningClick = () => {
    navigate('/learning');
    if (isMobile) setIsExpanded(false);
  };

  const handleAllPromptsClick = () => {
    navigate('/prompts');
    if (isMobile) setIsExpanded(false);
  };

  const handlePromptClick = (sessionId: string) => {
    navigate(`/prompts/${sessionId}`);
    if (isMobile) setIsExpanded(false);
  };

  const handleDeletePrompt = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        const { error } = await supabase
          .from('prompt_sessions')
          .delete()
          .eq('id', sessionId);

        if (error) throw error;
        
        // Remove from local state immediately
        setPromptSessions(prev => prev.filter(session => session.id !== sessionId));
        
        // If currently viewing this session, navigate away
        if (location.pathname.includes(sessionId)) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error deleting prompt session:', error);
      }
    }
  };

  // Reusable menu item component
  const MenuItem = ({ 
    name, 
    section, 
    sessionId, 
    classroomId, 
    color,
    moduleCount 
  }: { 
    name: string; 
    section: 'recent' | 'favorite' | 'learn' | 'prompt'; 
    sessionId?: string;
    classroomId?: string;
    color?: string;
    moduleCount?: number;
  }) => {
    const iconUrl = section === 'favorite' ? getToolIcon(name) : null;
    
    return (
      <div 
        className="group flex items-center gap-2 px-[18px] py-2 w-full cursor-pointer hover:bg-[#4c4c4d] transition-colors rounded-md"
        onClick={() => {
          if (section === 'favorite') {
            handleToolClick(name);
          } else if (section === 'learn' && classroomId) {
            handleClassroomClick(classroomId);
          } else if (section === 'prompt' && sessionId) {
            handlePromptClick(sessionId);
          }
        }}
      >
        {/* Icons for different sections */}
        {section === 'favorite' && (
          <>
            {iconUrl ? (
              <img 
                src={iconUrl} 
                alt={`${name} icon`}
                className="w-6 h-6 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`w-6 h-6 bg-[#565656] rounded flex-shrink-0 ${iconUrl ? 'hidden' : 'flex'} items-center justify-center`}>
              <span className="text-white text-xs font-bold">{name.charAt(0)}</span>
            </div>
          </>
        )}
        
        <div className="flex-1 min-w-0">
          <span 
            className="font-['Pretendard-Regular',Helvetica] font-normal text-[#d5d5d5] text-[13px] tracking-[-0.20px] leading-[22px] truncate block"
            title={name}
          >
            {name}
          </span>
        </div>
        
        {/* Delete button for prompt sessions */}
        {section === 'prompt' && sessionId && (
          <button
            onClick={(e) => handleDeletePrompt(sessionId, e)}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2 p-1 hover:bg-red-600/20 hover:text-red-400 text-[#d5d5d5] rounded flex-shrink-0"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  // Show more/less button component
  const ShowMoreButton = ({ 
    showAll, 
    onToggle, 
    totalCount, 
    displayedCount,
    section 
  }: {
    showAll: boolean;
    onToggle: () => void;
    totalCount: number;
    displayedCount: number;
    section: string;
  }) => (
    <button
      onClick={onToggle}
      className="px-[18px] py-2 w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors"
    >
      {showAll ? 'Show less' : `See more (${totalCount - displayedCount})`}
    </button>
  );

  // View all button component
  const ViewAllButton = ({ onClick, text }: { onClick: () => void; text: string }) => (
    <button
      onClick={onClick}
      className="px-[18px] py-1 w-full text-left text-xs text-gray-500 hover:text-gray-400 transition-colors"
    >
      View all {text} →
    </button>
  );

  const allFavoriteItems = getFavoriteTools();
  const displayedFavoriteItems = showAllFavorites ? allFavoriteItems : allFavoriteItems.slice(0, 5);
  const hasMoreFavorites = allFavoriteItems.length > 5;

  const learnSpaceItems = learningClassrooms.map(classroom => ({ 
    name: classroom.name,
    id: classroom.id,
    color: classroom.color,
    moduleCount: classroom.module_count
  }));

  // 모바일에서 햄버거 메뉴만 표시
  if (isMobile) {
    return (
      <>
        {/* 햄버거 메뉴 버튼 - NavBar 아래에 위치 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="fixed top-20 left-4 z-40 w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors lg:hidden shadow-lg"
        >
          {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* 오버레이 */}
        {isExpanded && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            style={{ top: '72px' }} // NavBar 높이만큼 아래에서 시작
            onClick={() => setIsExpanded(false)}
          />
        )}

        {/* 모바일 사이드바 - NavBar 아래에 위치 */}
        <div className={`fixed left-0 w-[280px] bg-[#3c3c3d] z-30 transform transition-transform duration-300 lg:hidden shadow-2xl ${
          isExpanded ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ 
          top: '72px', // NavBar 높이만큼 아래에서 시작
          height: 'calc(100vh - 72px)' // NavBar 높이를 제외한 전체 높이
        }}>
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col w-full items-start pt-[20px]">
                {/* New Prompt Button - Only show when logged in */}
                {currentUser && (
                  <Button
                    variant="ghost"
                    className="relative self-stretch w-full h-11 justify-start px-[18px] text-white hover:bg-[#4c4c4d]"
                    onClick={handleCreateNewPrompt}
                  >
                    <PlusCircle className="w-5 h-5 mr-[23px] flex-shrink-0" />
                    <span className="font-['Pretendard-Regular',Helvetica] font-normal text-sm tracking-[-0.21px] leading-[22px]">
                      New Prompt
                    </span>
                  </Button>
                )}

                {/* Favorites Section */}
                <div className="relative self-stretch w-full border-b border-[#575757] pb-4">
                  <h3 className="px-[18px] pt-4 font-['Pretendard-Medium',Helvetica] font-medium text-white text-sm tracking-[-0.21px] leading-[22px]">
                    Favorites
                  </h3>
                  <div className="flex flex-col w-full items-start mt-3">
                    {displayedFavoriteItems.length > 0 ? (
                      <>
                        {displayedFavoriteItems.map((item, index) => (
                          <MenuItem key={`favorite-${index}`} name={item.name} section="favorite" />
                        ))}
                        {hasMoreFavorites && (
                          <ShowMoreButton
                            showAll={showAllFavorites}
                            onToggle={() => setShowAllFavorites(!showAllFavorites)}
                            totalCount={allFavoriteItems.length}
                            displayedCount={5}
                            section="favorites"
                          />
                        )}
                      </>
                    ) : (
                      <div className="px-[18px] py-2">
                        <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                          No favorites yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Learning Space Section */}
                <div className="relative self-stretch w-full border-b border-[#575757] pb-4">
                  <div className="flex items-center justify-between px-[18px] pt-[15px] mb-3">
                    <h3 className="font-['Pretendard-Medium',Helvetica] font-medium text-white text-sm tracking-[-0.21px] leading-[22px]">
                      Learning Space
                    </h3>
                    <button
                      onClick={handleLearningSpaceClick}
                      className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-col w-full items-start">
                    {loadingClassrooms ? (
                      <div className="px-[18px] py-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#999999] flex-shrink-0" />
                        <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                          Loading...
                        </span>
                      </div>
                    ) : learnSpaceItems.length > 0 ? (
                      <>
                        {learnSpaceItems.map((item, index) => (
                          <MenuItem 
                            key={`learn-${index}`} 
                            name={item.name} 
                            section="learn" 
                            classroomId={item.id}
                            color={item.color}
                            moduleCount={item.moduleCount}
                          />
                        ))}
                        {learnSpaceItems.length >= 5 && (
                          <ViewAllButton onClick={handleAllLearningClick} text="classrooms" />
                        )}
                      </>
                    ) : (
                      <div className="px-[18px] py-2">
                        <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                          No classrooms yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prompt History Section */}
                <div className="relative self-stretch w-full pb-4">
                  <div className="flex items-center justify-between px-[18px] pt-[15px] mb-3">
                    <h3 className="font-['Pretendard-Medium',Helvetica] font-medium text-white text-sm tracking-[-0.21px] leading-[22px]">
                      Prompt History
                    </h3>
                  </div>
                  <div className="flex flex-col w-full items-start">
                    {loadingPrompts ? (
                      <div className="px-[18px] py-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#999999] flex-shrink-0" />
                        <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                          Loading...
                        </span>
                      </div>
                    ) : promptSessions.length > 0 ? (
                      <>
                        {promptSessions.map((session) => (
                          <MenuItem 
                            key={`prompt-${session.id}`} 
                            name={session.title} 
                            section="prompt" 
                            sessionId={session.id}
                          />
                        ))}
                        {promptSessions.length >= 5 && (
                          <ViewAllButton onClick={handleAllPromptsClick} text="conversations" />
                        )}
                      </>
                    ) : (
                      <div className="px-[18px] py-2">
                        <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                          No conversations yet
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Points Display - Fixed at bottom */}
            <div className="p-2.5 pb-[46px]">
              <div 
                className={`w-full h-[38px] bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-[40px] overflow-hidden flex items-center justify-between px-3 transition-colors ${
                  currentUser ? 'cursor-pointer hover:from-yellow-600/30 hover:to-orange-600/30' : 'cursor-default'
                }`}
                onClick={currentUser ? onUpgradeClick : undefined}
              >
                <Wallet className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span className="font-['Pretendard-Medium',Helvetica] font-medium text-yellow-300 text-sm text-right tracking-[-0.21px] leading-[22px] truncate">
                  {userTokens.toLocaleString()}pt
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 데스크톱 사이드바 (항상 고정, 더 넓은 너비)
  return (
    <div className="fixed top-16 left-0 w-[280px] h-[calc(100vh-4rem)] bg-[#3c3c3d] z-30 hidden lg:block">
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col w-full items-start pt-[20px]">
            {/* New Prompt Button - Only show when logged in */}
            {currentUser && (
              <Button
                variant="ghost"
                className="relative self-stretch w-full h-11 justify-start px-[18px] text-white hover:bg-[#4c4c4d]"
                onClick={handleCreateNewPrompt}
              >
                <PlusCircle className="w-5 h-5 mr-[23px] flex-shrink-0" />
                <span className="font-['Pretendard-Regular',Helvetica] font-normal text-sm tracking-[-0.21px] leading-[22px]">
                  New Prompt
                </span>
              </Button>
            )}

            {/* Favorites Section */}
            <div className="relative self-stretch w-full border-b border-[#575757] pb-4">
              <div className="flex items-center justify-between px-[18px] pt-4 mb-3">
                <h3 className="font-['Pretendard-Medium',Helvetica] font-medium text-white text-sm tracking-[-0.21px] leading-[22px]">
                  Favorites
                </h3>
              </div>
              <div className="flex flex-col w-full items-start">
                {displayedFavoriteItems.length > 0 ? (
                  <>
                    {displayedFavoriteItems.map((item, index) => (
                      <MenuItem key={`favorite-${index}`} name={item.name} section="favorite" />
                    ))}
                    {hasMoreFavorites && (
                      <ShowMoreButton
                        showAll={showAllFavorites}
                        onToggle={() => setShowAllFavorites(!showAllFavorites)}
                        totalCount={allFavoriteItems.length}
                        displayedCount={5}
                        section="favorites"
                      />
                    )}
                  </>
                ) : (
                  <div className="px-[18px] py-2">
                    {currentUser ? (
                      <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                        No favorites yet
                      </span>
                    ) : (
                      <button
                        onClick={onLoginClick}
                        className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] hover:text-blue-400 text-[13px] tracking-[-0.20px] leading-[22px] transition-colors cursor-pointer"
                      >
                        Login to see favorites
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Learning Space Section */}
            <div className="relative self-stretch w-full border-b border-[#575757] pb-4">
              <div className="flex items-center justify-between px-[18px] pt-[15px] mb-3">
                <h3 className="font-['Pretendard-Medium',Helvetica] font-medium text-white text-sm tracking-[-0.21px] leading-[22px]">
                  Learning Space
                </h3>
                <button
                  onClick={handleLearningSpaceClick}
                  className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex flex-col w-full items-start">
                {loadingClassrooms ? (
                  <div className="px-[18px] py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#999999] flex-shrink-0" />
                    <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                      Loading...
                    </span>
                  </div>
                ) : learnSpaceItems.length > 0 ? (
                  <>
                    {learnSpaceItems.map((item, index) => (
                      <MenuItem 
                        key={`learn-${index}`} 
                        name={item.name} 
                        section="learn" 
                        classroomId={item.id}
                        color={item.color}
                        moduleCount={item.moduleCount}
                      />
                    ))}
                    {learnSpaceItems.length >= 5 && (
                      <ViewAllButton onClick={handleAllLearningClick} text="classrooms" />
                    )}
                  </>
                ) : (
                  <div className="px-[18px] py-2">
                    {currentUser ? (
                      <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                        No classrooms yet
                      </span>
                    ) : (
                      <button
                        onClick={onLoginClick}
                        className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] hover:text-blue-400 text-[13px] tracking-[-0.20px] leading-[22px] transition-colors cursor-pointer"
                      >
                        Login to see classrooms
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Prompt History Section */}
            <div className="relative self-stretch w-full pb-4">
              <div className="flex items-center justify-between px-[18px] pt-[15px] mb-3">
                <h3 className="font-['Pretendard-Medium',Helvetica] font-medium text-white text-sm tracking-[-0.21px] leading-[22px]">
                  Prompt History
                </h3>
              </div>
              <div className="flex flex-col w-full items-start">
                {loadingPrompts ? (
                  <div className="px-[18px] py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#999999] flex-shrink-0" />
                    <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                      Loading...
                    </span>
                  </div>
                ) : promptSessions.length > 0 ? (
                  <>
                    {promptSessions.map((session) => (
                      <MenuItem 
                        key={`prompt-${session.id}`} 
                        name={session.title} 
                        section="prompt" 
                        sessionId={session.id}
                      />
                    ))}
                    {promptSessions.length >= 5 && (
                      <ViewAllButton onClick={handleAllPromptsClick} text="conversations" />
                    )}
                  </>
                ) : (
                  <div className="px-[18px] py-2">
                    {currentUser ? (
                      <span className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] text-[13px] tracking-[-0.20px] leading-[22px]">
                        No conversations yet
                      </span>
                    ) : (
                      <button
                        onClick={onLoginClick}
                        className="font-['Pretendard-Regular',Helvetica] font-normal text-[#999999] hover:text-blue-400 text-[13px] tracking-[-0.20px] leading-[22px] transition-colors cursor-pointer"
                      >
                        Login to see conversations
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Points Display - Fixed at bottom */}
        <div className="p-2.5 pb-[46px]">
          <div 
            className={`w-full h-[38px] bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-[40px] overflow-hidden flex items-center justify-between px-3 transition-colors ${
              currentUser ? 'cursor-pointer hover:from-yellow-600/30 hover:to-orange-600/30' : 'cursor-default'
            }`}
            onClick={currentUser ? onUpgradeClick : undefined}
          >
            <Wallet className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <span className="font-['Pretendard-Medium',Helvetica] font-medium text-yellow-300 text-sm text-right tracking-[-0.21px] leading-[22px] truncate">
              {userTokens.toLocaleString()}pt
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideBar;