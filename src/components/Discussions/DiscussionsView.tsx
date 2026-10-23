import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  Video as VideoIcon,
  FileText,
  Music,
  BarChart2, 
  HelpCircle, 
  Search, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  User, 
  MoreVertical, 
  ChevronRight, 
  Play, 
  Pause, 
  Check, 
  CheckCheck, 
  UserX, 
  UserCheck, 
  X, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  Users, 
  Settings2,
  AlertCircle,
  Download,
  ArrowRight,
  Eye,
  Radio
} from 'lucide-react';
import { 
  CommunityMessage, 
  ChatMessageType, 
  ChannelInfo, 
  PollData, 
  MCQData, 
  UserProfile 
} from '../../types';
import { REGISTERED_STUDENTS_MOCK } from '../../initialData';
import { InAppSelect } from '../Common/InAppSelect';

export const DiscussionsView: React.FC = () => {
  const { 
    user, 
    isAdmin, 
    channels, 
    activeChannelId, 
    setActiveChannelId, 
    communityMessages, 
    sendCommunityMessage, 
    votePoll, 
    answerMCQInChat, 
    requestChannelAccess, 
    approveJoinRequest, 
    joinRequests, 
    toggleChannelRestriction, 
    createChannel,
    blockedUsers, 
    toggleBlockUser, 
    updateUserExamNumber, 
    setIsAuthModalOpen,
    setActiveSection
  } = useApp();

  // Mobile navigation: false = sidebar (channels/chats), true = viewing conversation
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(false);

  // Supervisor Channel Creation Modal
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanDescription, setNewChanDescription] = useState('');
  const [newChanBadge, setNewChanBadge] = useState<'all' | '2' | '3' | 'admin'>('all');
  const [newChanIsLocked, setNewChanIsLocked] = useState(false);
  const [newChanIsSupervisorOnly, setNewChanIsSupervisorOnly] = useState(false);

  // Active view: either channel ID or direct chat user UID
  const [selectedChatType, setSelectedChatType] = useState<'channel' | 'direct'>('channel');
  const [activeDirectUserId, setActiveDirectUserId] = useState<string | null>(null);

  // Search input in sidebar
  const [searchQuery, setSearchQuery] = useState('');

  // Message input state
  const [textInput, setTextInput] = useState('');
  
  // Real voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Real audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Attachment menu toggle
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);

  // Hidden File Inputs for real device uploads
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals for Poll, MCQ, and Exam verification
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [isMCQModalOpen, setIsMCQModalOpen] = useState(false);
  const [mcqQuestion, setMCQQuestion] = useState('');
  const [mcqOptions, setMCQOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrectIndex, setMCQCorrectIndex] = useState(0);

  // Quick media caption modal when uploading from device
  const [stagedFile, setStagedFile] = useState<{
    file: File;
    dataUrl: string;
    type: 'image' | 'video' | 'voice' | 'file';
    name: string;
    size: string;
  } | null>(null);
  const [stagedCaption, setStagedCaption] = useState('');

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examInput, setExamInput] = useState('');

  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showBlockedListModal, setShowBlockedListModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active Channel Object
  const currentChannel = useMemo(() => {
    return channels.find(c => c.id === activeChannelId) || channels[0];
  }, [channels, activeChannelId]);

  // Active Direct Partner
  const currentDirectPartner = useMemo(() => {
    if (!activeDirectUserId) return null;
    return REGISTERED_STUDENTS_MOCK.find(s => s.uid === activeDirectUserId) || null;
  }, [activeDirectUserId]);

  // Determine user year badge: '2', '3', or '0'
  const userBadge: '2' | '3' | '0' = useMemo(() => {
    if (isAdmin) return '0';
    if (user?.yearBadge) return user.yearBadge;
    if (user?.academicYear?.includes('ثالثة')) return '3';
    if (user?.academicYear?.includes('ثانية')) return '2';
    return '0';
  }, [user, isAdmin]);

  // Check if student has permission to enter current channel
  const hasChannelAccess = useMemo(() => {
    if (isAdmin) return true;
    if (!currentChannel.isLocked) return true; // General channel open
    if (!user) return false;
    
    // Check if user has an approved join request
    const approved = joinRequests.some(
      r => r.userId === user.uid && r.targetChannelId === currentChannel.id && r.status === 'approved'
    );
    if (approved) return true;

    // Check year requirement
    if (currentChannel.requiredYear === 'year-2' && userBadge === '2') return true;
    if (currentChannel.requiredYear === 'year-3' && userBadge === '3') return true;

    return false;
  }, [isAdmin, currentChannel, user, userBadge, joinRequests]);

  // Filtered Messages for current active conversation
  const displayedMessages = useMemo(() => {
    if (selectedChatType === 'channel') {
      return communityMessages.filter(m => m.channelId === currentChannel.id);
    } else if (selectedChatType === 'direct' && currentDirectPartner && user) {
      return communityMessages.filter(m => 
        !m.channelId && (
          (m.senderId === user.uid && m.receiverId === currentDirectPartner.uid) ||
          (m.senderId === currentDirectPartner.uid && m.receiverId === user.uid)
        )
      );
    }
    return [];
  }, [selectedChatType, currentChannel.id, currentDirectPartner, user, communityMessages]);

  // Search classmates by name or exam number
  const searchedClassmates = useMemo(() => {
    if (!searchQuery.trim()) return REGISTERED_STUDENTS_MOCK;
    const q = searchQuery.trim().toLowerCase();
    return REGISTERED_STUDENTS_MOCK.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.lastName.toLowerCase().includes(q) || 
      s.examNumber.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages.length, selectedChatType, activeChannelId, isMobileConversationOpen]);

  // Clean up audio playback on unmount
  useEffect(() => {
    return () => {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Format bytes helper
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Start Real Voice Recording
  const handleStartVoiceRecording = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedChatType === 'channel' && !currentChannel.restrictions.allowVoice && !isAdmin) {
      alert('المشرف قام بتقييد إرسال التسجيلات الصوتية في هذه القناة.');
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.start(200);
      }
    } catch (err) {
      console.warn('Microphone permission or hardware unavailable, using timer fallback:', err);
    }

    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);
  };

  // Cancel Voice Recording
  const handleCancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Stop & Send Real Voice Message
  const handleStopAndSendVoice = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const duration = recordingSeconds > 0 ? recordingSeconds : 3;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await sendCommunityMessage({
            channelId: selectedChatType === 'channel' ? currentChannel.id : undefined,
            receiverId: selectedChatType === 'direct' ? currentDirectPartner?.uid : undefined,
            type: 'voice',
            content: 'تسجيل صوتي',
            mediaUrl: base64Audio,
            voiceDuration: duration
          });
        };
        reader.readAsDataURL(audioBlob);

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
        }
      };
      mediaRecorderRef.current.stop();
    } else {
      // Soft fallback if real mic was not active
      await sendCommunityMessage({
        channelId: selectedChatType === 'channel' ? currentChannel.id : undefined,
        receiverId: selectedChatType === 'direct' ? currentDirectPartner?.uid : undefined,
        type: 'voice',
        content: 'تسجيل صوتي استفساري',
        voiceDuration: duration
      });
    }

    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Play / Pause Audio helper
  const handleTogglePlayAudio = (msgId: string, audioUrl?: string) => {
    if (playingAudioId === msgId) {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
    }

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      currentAudioElementRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => setPlayingAudioId(null);
      audio.play().then(() => {
        setPlayingAudioId(msgId);
      }).catch(err => {
        console.warn('Audio play error:', err);
        // Toggle UI pulse simulation anyway
        setPlayingAudioId(msgId);
        setTimeout(() => setPlayingAudioId(null), 4000);
      });
    } else {
      // simulated playback
      setPlayingAudioId(msgId);
      setTimeout(() => setPlayingAudioId(null), 5000);
    }
  };

  // Send Text Message
  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedChatType === 'channel') {
      if (!currentChannel.restrictions.allowText && !isAdmin) {
        alert('المشرف قام بتقييد إرسال الرسائل النصية في هذه القناة حالياً.');
        return;
      }
      await sendCommunityMessage({
        channelId: currentChannel.id,
        type: 'text',
        content: textInput.trim()
      });
    } else if (selectedChatType === 'direct' && currentDirectPartner) {
      await sendCommunityMessage({
        receiverId: currentDirectPartner.uid,
        type: 'text',
        content: textInput.trim()
      });
    }

    setTextInput('');
  };

  // Handle device file upload selection
  const handleDeviceFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'voice' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (selectedChatType === 'channel' && !currentChannel.restrictions.allowMedia && !isAdmin) {
      alert('المشرف قام بتقييد إرسال الوسائط والملفات في هذه القناة.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setStagedFile({
        file,
        dataUrl,
        type: fileType,
        name: file.name,
        size: formatFileSize(file.size)
      });
      setStagedCaption('');
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be picked again if needed
    e.target.value = '';
    setIsAttachMenuOpen(false);
  };

  // Confirm and Send Staged File from Device
  const handleSendStagedFile = async () => {
    if (!stagedFile) return;

    await sendCommunityMessage({
      channelId: selectedChatType === 'channel' ? currentChannel.id : undefined,
      receiverId: selectedChatType === 'direct' ? currentDirectPartner?.uid : undefined,
      type: stagedFile.type,
      content: stagedCaption.trim() || stagedFile.name,
      mediaUrl: stagedFile.dataUrl,
      fileName: stagedFile.name,
      fileSize: stagedFile.size,
      voiceDuration: stagedFile.type === 'voice' ? 12 : undefined
    });

    setStagedFile(null);
    setStagedCaption('');
  };

  // Create Poll
  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pollQuestion.trim()) return;
    const validOpts = pollOptions.filter(o => o.trim() !== '');
    if (validOpts.length < 2) return;

    const pollData: PollData = {
      question: pollQuestion.trim(),
      options: validOpts.map(o => ({ text: o.trim(), votes: 0, votedUserIds: [] })),
      totalVotes: 0
    };

    await sendCommunityMessage({
      channelId: selectedChatType === 'channel' ? currentChannel.id : undefined,
      receiverId: selectedChatType === 'direct' ? currentDirectPartner?.uid : undefined,
      type: 'poll',
      content: 'استفتاء طلابي جديد:',
      poll: pollData
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setIsPollModalOpen(false);
  };

  // Create MCQ in Chat
  const handleCreateMCQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcqQuestion.trim()) return;
    const validOpts = mcqOptions.filter(o => o.trim() !== '');
    if (validOpts.length < 2) return;

    const mcqData: MCQData = {
      question: mcqQuestion.trim(),
      options: validOpts.map(o => o.trim()),
      correctIndex: mcqCorrectIndex,
      answeredUsers: {}
    };

    await sendCommunityMessage({
      channelId: selectedChatType === 'channel' ? currentChannel.id : undefined,
      receiverId: selectedChatType === 'direct' ? currentDirectPartner?.uid : undefined,
      type: 'mcq',
      content: 'سؤال أتمتة تفاعلي داخل الملتقى:',
      mcq: mcqData
    });

    setMCQQuestion('');
    setMCQOptions(['', '', '', '']);
    setIsMCQModalOpen(false);
  };

  // Verify Exam Number
  const handleVerifyExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examInput.trim()) return;
    updateUserExamNumber(examInput.trim());
    setIsExamModalOpen(false);
  };

  // Create Channel by Supervisor
  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    let reqYear: import('../../types').AcademicYearId | undefined = undefined;
    if (newChanBadge === '2') reqYear = 'year-2';
    if (newChanBadge === '3') reqYear = 'year-3';

    await createChannel({
      name: newChanName.trim(),
      description: newChanDescription.trim() || 'قناة مناقشة طلابية تفاعلية',
      badge: newChanBadge,
      isLocked: newChanIsLocked,
      isSupervisorOnly: newChanIsSupervisorOnly || newChanBadge === 'admin',
      requiredYear: reqYear,
      restrictions: {
        allowText: true,
        allowVoice: true,
        allowMedia: true,
        allowPolls: true,
      }
    });

    setNewChanName('');
    setNewChanDescription('');
    setNewChanBadge('all');
    setNewChanIsLocked(false);
    setNewChanIsSupervisorOnly(false);
    setIsCreateChannelModalOpen(false);
  };

  // Render Year Badge Helper (2, 3, or 0)
  const renderYearBadge = (badge: '2' | '3' | '0') => {
    if (badge === '2') {
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs" title="سنة ثانية">
          2
        </span>
      );
    }
    if (badge === '3') {
      return (
        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs" title="سنة ثالثة">
          3
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-slate-600 text-slate-200 font-bold text-[11px] flex items-center justify-center shrink-0" title="أشخاص آخرون / إشراف">
        0
      </span>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0B132B] text-slate-100 select-none overflow-hidden">
      
      {/* Hidden Device File Inputs for real upload */}
      <input 
        type="file" 
        ref={imageFileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={(e) => handleDeviceFileSelect(e, 'image')}
      />
      <input 
        type="file" 
        ref={videoFileInputRef} 
        accept="video/*" 
        className="hidden" 
        onChange={(e) => handleDeviceFileSelect(e, 'video')}
      />
      <input 
        type="file" 
        ref={audioFileInputRef} 
        accept="audio/*" 
        className="hidden" 
        onChange={(e) => handleDeviceFileSelect(e, 'voice')}
      />
      <input 
        type="file" 
        ref={docFileInputRef} 
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip" 
        className="hidden" 
        onChange={(e) => handleDeviceFileSelect(e, 'file')}
      />

      {/* Main Telegram-style Full Screen Split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* ======================================================== */}
        {/* RIGHT SIDEBAR: CHANNELS & DIRECT CONVERSATIONS (RTL FIRST) */}
        {/* ======================================================== */}
        <aside className={`w-full md:w-80 lg:w-96 bg-[#0E1626] border-l border-slate-800/80 flex flex-col shrink-0 ${
          isMobileConversationOpen ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Sidebar Top: User Bar & Search */}
          <div className="p-3.5 border-b border-slate-800/80 space-y-3 bg-[#111A2E]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                    {user?.displayName ? user.displayName.charAt(0) : 'ط'}
                  </div>
                  <span className="absolute -bottom-1 -left-1">
                    {renderYearBadge(userBadge)}
                  </span>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white">
                      {user?.displayName || 'طالب جامعي'} {user?.lastName || ''}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300">
                        مشرف
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    الرقم: {user?.examNumber || user?.studentId || 'غير مسجل'}
                  </span>
                </div>
              </div>

              {/* Exam Number Setup Button */}
              <button
                onClick={() => setIsExamModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                title="تعديل الرقم الامتحاني"
              >
                رقمي الامتحاني
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="البحث بالاسم أو الرقم الامتحاني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>
          </div>

          {/* Channels & Direct Tabs / List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            
            {/* Channels Section */}
            <div className="space-y-1.5">
              <div className="px-2 pb-1 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>قنوات الدفعة والملتقى العام</span>
                {isAdmin ? (
                  <button
                    onClick={() => setIsCreateChannelModalOpen(true)}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-lg border border-emerald-500/30 cursor-pointer transition-colors"
                    title="إنشاء قناة جديدة (خاص بالمشرفين)"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إنشاء قناة</span>
                  </button>
                ) : (
                  <Users className="w-3.5 h-3.5" />
                )}
              </div>

              {channels.filter(ch => !ch.isSupervisorOnly || isAdmin).map((ch) => {
                const isSelected = selectedChatType === 'channel' && activeChannelId === ch.id;
                const isLockedForMe = ch.isLocked && !isAdmin && (
                  ch.requiredYear === 'year-2' ? userBadge !== '2' :
                  ch.requiredYear === 'year-3' ? userBadge !== '3' : false
                );

                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedChatType('channel');
                      setActiveChannelId(ch.id);
                      setIsMobileConversationOpen(true);
                    }}
                    className={`w-full p-3 rounded-2xl transition-all flex items-center justify-between gap-3 text-right cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-[#152033]/70 hover:bg-[#18263f] text-slate-200 border border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLockedForMe ? (
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                      <span className="text-[11px] font-bold opacity-80 font-mono">
                        {ch.membersCount.toLocaleString('ar-SA')} عضو
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm line-clamp-1">{ch.name}</h4>
                        <p className="text-[10px] opacity-75 line-clamp-1">{ch.description}</p>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center font-black text-xs shrink-0">
                        {ch.badge === 'all' ? '🌐' : ch.badge}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Direct Conversations Section */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="px-2 pb-1 text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>المحادثات الخاصة بالطلاب (ابحث بالرقم أو الاسم)</span>
                <MessageSquare className="w-3.5 h-3.5" />
              </div>

              {searchedClassmates.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  لا توجد نتائج مطابقة لبحثك
                </div>
              ) : (
                searchedClassmates.map((student) => {
                  const isSelected = selectedChatType === 'direct' && activeDirectUserId === student.uid;
                  const isBlocked = blockedUsers.includes(student.examNumber) || blockedUsers.includes(student.uid);

                  return (
                    <button
                      key={student.uid}
                      onClick={() => {
                        setSelectedChatType('direct');
                        setActiveDirectUserId(student.uid);
                        setIsMobileConversationOpen(true);
                      }}
                      className={`w-full p-2.5 rounded-2xl transition-all flex items-center justify-between gap-2.5 text-right cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-[#152033]/40 hover:bg-[#18263f] text-slate-200 border border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isBlocked ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                            محظور
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-75 font-mono">
                            {student.examNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <h4 className="font-bold text-xs sm:text-sm line-clamp-1">
                            {student.name} {student.lastName}
                          </h4>
                          <span className="text-[10px] opacity-75 block">
                            {student.batch}
                          </span>
                        </div>

                        <div className="relative">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {student.name.charAt(0)}
                          </div>
                          <span className="absolute -bottom-1 -left-1">
                            {renderYearBadge(student.badge)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Blocked Users Count Footer */}
            {blockedUsers.length > 0 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setShowBlockedListModal(true)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                >
                  قائمة الأرقام المحظورة ({blockedUsers.length})
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ======================================================== */}
        {/* LEFT / CENTER: ACTIVE CONVERSATION WINDOW                 */}
        {/* ======================================================== */}
        <section className={`flex-1 flex flex-col bg-[#0B132B] overflow-hidden ${
          !isMobileConversationOpen ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Active Chat Header */}
          <div className="p-3 sm:p-4 bg-[#111A2E] border-b border-slate-800/80 flex items-center justify-between">
            
            {/* Left Controls: Channel settings, Block toggle, and Mobile Back button */}
            <div className="flex items-center gap-2">
              
              {/* Mobile Back Button to Channels List */}
              <button
                onClick={() => setIsMobileConversationOpen(false)}
                className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                title="الرجوع للقنوات"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Admin Channel Settings Toggle */}
              {selectedChatType === 'channel' && isAdmin && (
                <button
                  onClick={() => setShowChannelSettings(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="صلاحيات المشرف على القناة"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">صلاحيات القناة</span>
                </button>
              )}

              {/* Block / Unblock Exam Number (Direct Chat) */}
              {selectedChatType === 'direct' && currentDirectPartner && (
                <button
                  onClick={() => toggleBlockUser(currentDirectPartner.examNumber)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    blockedUsers.includes(currentDirectPartner.examNumber)
                      ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                      : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>
                    {blockedUsers.includes(currentDirectPartner.examNumber) ? 'إلغاء حظر الرقم' : 'حظر هذا الرقم'}
                  </span>
                </button>
              )}
            </div>

            {/* Right: Active Target Title */}
            <div className="flex items-center gap-3 text-right">
              <div>
                <h3 className="font-black text-sm sm:text-base text-white flex items-center justify-end gap-1.5">
                  <span>
                    {selectedChatType === 'channel'
                      ? currentChannel.name 
                      : `${currentDirectPartner?.name} ${currentDirectPartner?.lastName}`}
                  </span>
                  {selectedChatType === 'channel' && (
                    <span className="text-emerald-400 text-xs">●</span>
                  )}
                </h3>
                <span className="text-[11px] text-slate-400 block">
                  {selectedChatType === 'channel' 
                    ? currentChannel.description 
                    : `الرقم الامتحاني: ${currentDirectPartner?.examNumber || '---'} • ${currentDirectPartner?.batch}`}
                </span>
              </div>

              <div className="w-10 h-10 rounded-2xl bg-[#162238] border border-slate-700/80 flex items-center justify-center font-black text-sm text-emerald-400">
                {selectedChatType === 'channel' ? (currentChannel.badge === 'all' ? '🌐' : currentChannel.badge) : (currentDirectPartner?.name.charAt(0) || '؟')}
              </div>
            </div>
          </div>

          {/* Supervisor Restriction Bar (If toggled or active) */}
          {showChannelSettings && selectedChatType === 'channel' && isAdmin && (
            <div className="bg-amber-950/40 border-b border-amber-800/60 p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-extrabold text-amber-300 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>تحكم المشرف بصلاحيات النشر للطلاب:</span>
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleChannelRestriction(currentChannel.id, 'allowText')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    currentChannel.restrictions.allowText ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  النص: {currentChannel.restrictions.allowText ? 'متاح ✓' : 'مقيد ✕'}
                </button>

                <button
                  onClick={() => toggleChannelRestriction(currentChannel.id, 'allowVoice')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    currentChannel.restrictions.allowVoice ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  الصوت: {currentChannel.restrictions.allowVoice ? 'متاح ✓' : 'مقيد ✕'}
                </button>

                <button
                  onClick={() => toggleChannelRestriction(currentChannel.id, 'allowMedia')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    currentChannel.restrictions.allowMedia ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  الصور/الفيديو/الملفات: {currentChannel.restrictions.allowMedia ? 'متاح ✓' : 'مقيد ✕'}
                </button>

                <button
                  onClick={() => toggleChannelRestriction(currentChannel.id, 'allowPolls')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    currentChannel.restrictions.allowPolls ? 'bg-emerald-600 text-white' : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  الاستفتاء والأتمتة: {currentChannel.restrictions.allowPolls ? 'متاح ✓' : 'مقيد ✕'}
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages Feed / Lock Gate */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            
            {/* If Student Tries to enter another batch channel without permission */}
            {selectedChatType === 'channel' && !hasChannelAccess ? (
              <div className="max-w-md mx-auto my-12 bg-[#131D2E] border border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-black text-white">
                    هذه القناة مخصصة حصراً لطلاب {currentChannel.name}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    وفقاً للوائح الملتقى، لا يمكن دخول مناقشة دفعة أخرى إلا بعد التحقق من الرقم الامتحاني أو تقديم طلب إذن للمشرفين.
                  </p>
                  <p className="text-[11px] text-amber-300 font-semibold">
                    حالتك الحالية: {userBadge === '2' ? 'سنة ثانية (دفعة 31)' : userBadge === '3' ? 'سنة ثالثة (دفعة 30)' : 'غير محدد'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      requestChannelAccess(currentChannel.id, user?.examNumber || '30421');
                      alert('تم إرسال طلب الانضمام إلى المشرفين بنجاح!');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md"
                  >
                    تقديم طلب انضمام للمشرفين
                  </button>

                  <button
                    onClick={() => {
                      setSelectedChatType('direct');
                      setActiveDirectUserId('admin-uid-99');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    مراسلة المشرف (د. محمد)
                  </button>
                </div>
              </div>
            ) : displayedMessages.length === 0 ? (
              <div className="text-center py-20 text-slate-500 space-y-3">
                <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
                <h4 className="text-sm font-bold text-slate-400">لا توجد رسائل سابقة في هذه المحادثة</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  كن أول من يبدأ النقاش، اطرح سؤال أتمتة، أو أرسل تسجيلاً صوتياً أو ارفع ملفاً للزملاء.
                </p>
              </div>
            ) : (
              displayedMessages.map((msg) => {
                const isMe = user && msg.senderId === user.uid;
                const isSenderBlocked = blockedUsers.includes(msg.senderExamNumber || '') || blockedUsers.includes(msg.senderId);

                if (isSenderBlocked) {
                  return (
                    <div key={msg.id} className="text-center py-2">
                      <span className="text-[10px] text-slate-500 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-800">
                        تم حجب رسالة من مستخدم محظور ({msg.senderExamNumber})
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} max-w-xl ${isMe ? 'mr-auto' : 'ml-auto'}`}
                  >
                    {/* Sender Info Line */}
                    <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] text-slate-400">
                      <span className="font-extrabold text-white">
                        {msg.senderName} {msg.senderLastName || ''}
                      </span>
                      {renderYearBadge(msg.senderYearBadge)}
                      {msg.senderExamNumber && msg.senderExamNumber !== 'لم يحدد' && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          (رقم: {msg.senderExamNumber})
                        </span>
                      )}
                      {msg.senderRole === 'admin' && (
                        <span className="text-[10px] font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          مشرف
                        </span>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 rounded-3xl text-sm leading-relaxed max-w-full space-y-2.5 shadow-sm ${
                        isMe
                          ? 'bg-emerald-700 text-white rounded-br-xs'
                          : 'bg-[#152033] text-slate-100 rounded-bl-xs border border-slate-800/80'
                      }`}
                    >
                      {/* TYPE 1: Standard Text */}
                      {msg.content && <p className="whitespace-pre-line text-right">{msg.content}</p>}

                      {/* TYPE 2: Real Voice Note with Waveform */}
                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-3 p-3 bg-black/30 rounded-2xl w-64 sm:w-72">
                          <button
                            onClick={() => handleTogglePlayAudio(msg.id, msg.mediaUrl)}
                            className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                            title="تشغيل / إيقاف الصوت"
                          >
                            {playingAudioId === msg.id ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                          </button>

                          <div className="flex-1 space-y-1">
                            {/* Animated waveform bars */}
                            <div className="flex items-center gap-0.5 h-6">
                              {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 60, 40, 75, 55, 85, 30].map((h, i) => (
                                <div
                                  key={i}
                                  className={`flex-1 rounded-full transition-all ${
                                    playingAudioId === msg.id ? 'bg-emerald-300 animate-pulse' : 'bg-white/40'
                                  }`}
                                  style={{ height: `${h}%` }}
                                />
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-white/80 font-mono">
                              <span>0:00</span>
                              <span>0:{msg.voiceDuration ? (msg.voiceDuration < 10 ? `0${msg.voiceDuration}` : msg.voiceDuration) : '15'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TYPE 3: Photos */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div className="rounded-2xl overflow-hidden border border-white/10 max-w-sm">
                          <img src={msg.mediaUrl} alt={msg.content || 'صورة'} className="max-h-72 w-full object-cover rounded-xl" />
                        </div>
                      )}

                      {/* TYPE 4: Videos */}
                      {msg.type === 'video' && msg.mediaUrl && (
                        <div className="rounded-2xl overflow-hidden border border-white/10 max-w-md aspect-video bg-black">
                          {msg.mediaUrl.startsWith('data:video') || msg.mediaUrl.endsWith('.mp4') ? (
                            <video src={msg.mediaUrl} controls className="w-full h-full object-cover" />
                          ) : (
                            <iframe
                              src={msg.mediaUrl}
                              title="فيديو تعليمي"
                              className="w-full h-full"
                              allowFullScreen
                            />
                          )}
                        </div>
                      )}

                      {/* TYPE 5: Files / Documents */}
                      {msg.type === 'file' && (
                        <div className="flex items-center justify-between gap-3 p-3 bg-black/30 rounded-2xl border border-white/10 text-right">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-white line-clamp-1">{msg.fileName || msg.content}</h5>
                              <span className="text-[10px] text-slate-300">{msg.fileSize || 'ملف دراسي'}</span>
                            </div>
                          </div>

                          {msg.mediaUrl && (
                            <a
                              href={msg.mediaUrl}
                              download={msg.fileName || 'document.pdf'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                              title="تنزيل الملف"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}

                      {/* TYPE 6: Interactive Poll */}
                      {msg.type === 'poll' && msg.poll && (
                        <div className="p-3 bg-black/25 rounded-2xl space-y-3 text-right">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-[10px] font-bold text-white/70">
                              {msg.poll.totalVotes} أصوات إجمالية
                            </span>
                            <span className="text-xs font-black text-white flex items-center gap-1">
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span>استفتاء</span>
                            </span>
                          </div>

                          <h5 className="font-extrabold text-xs sm:text-sm text-white">
                            {msg.poll.question}
                          </h5>

                          <div className="space-y-2">
                            {msg.poll.options.map((opt, oIdx) => {
                              const percent = msg.poll && msg.poll.totalVotes > 0 
                                ? Math.round((opt.votes / msg.poll.totalVotes) * 100) 
                                : 0;
                              const isMyVote = user && opt.votedUserIds.includes(user.uid);

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() => votePoll(msg.id, oIdx)}
                                  className={`w-full p-2.5 rounded-xl border text-right transition-all relative overflow-hidden cursor-pointer ${
                                    isMyVote 
                                      ? 'border-emerald-400 bg-emerald-900/50' 
                                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  <div
                                    className="absolute inset-y-0 right-0 bg-white/15 pointer-events-none transition-all duration-300"
                                    style={{ width: `${percent}%` }}
                                  />

                                  <div className="relative flex items-center justify-between text-xs font-bold text-white">
                                    <span>{percent}% ({opt.votes})</span>
                                    <span className="flex items-center gap-1.5">
                                      {opt.text}
                                      {isMyVote && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TYPE 7: Interactive MCQ */}
                      {msg.type === 'mcq' && msg.mcq && (
                        <div className="p-3 bg-black/25 rounded-2xl space-y-3 text-right">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-[10px] font-bold text-emerald-300">
                              سؤال أتمتة تفاعلي
                            </span>
                            <span className="text-xs font-black text-white flex items-center gap-1">
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span>MCQ</span>
                            </span>
                          </div>

                          <h5 className="font-extrabold text-xs sm:text-sm text-white">
                            {msg.mcq.question}
                          </h5>

                          <div className="space-y-1.5">
                            {msg.mcq.options.map((opt, oIdx) => {
                              const myAnswer = user && msg.mcq?.answeredUsers ? msg.mcq.answeredUsers[user.uid] : undefined;
                              const isAnswered = myAnswer !== undefined;
                              const isCorrect = oIdx === msg.mcq?.correctIndex;
                              const isMyChoice = myAnswer === oIdx;

                              let optClass = 'bg-white/5 border-white/10 text-white hover:bg-white/10';
                              if (isAnswered) {
                                if (isCorrect) optClass = 'bg-emerald-600/60 border-emerald-400 text-white font-bold';
                                else if (isMyChoice && !isCorrect) optClass = 'bg-rose-600/60 border-rose-400 text-white font-bold';
                                else optClass = 'opacity-40 bg-white/5 border-white/10 text-white';
                              }

                              return (
                                <button
                                  key={oIdx}
                                  disabled={isAnswered}
                                  onClick={() => answerMCQInChat(msg.id, oIdx)}
                                  className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between text-xs cursor-pointer ${optClass}`}
                                >
                                  <span>{isAnswered && isCorrect ? '✓ صحيح' : isAnswered && isMyChoice ? '✕ خطأ' : ''}</span>
                                  <span>{opt}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 px-1 mt-1 text-[10px] text-slate-400">
                      <span>{msg.createdAt}</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-[#111A2E] border-t border-slate-800/80">
            {isRecordingVoice ? (
              <div className="flex items-center justify-between gap-3 p-2 bg-rose-950/40 border border-rose-800/80 rounded-2xl">
                <button
                  type="button"
                  onClick={handleCancelVoiceRecording}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>

                <div className="flex items-center gap-2 text-rose-300 font-mono text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>جاري تسجيل الصوت الحي... 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                </div>

                <button
                  type="button"
                  onClick={handleStopAndSendVoice}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5 rotate-180" />
                  <span>إرسال الصوت</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 transition-all cursor-pointer shadow-md shrink-0"
                  title="إرسال"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>

                {/* Voice Record Button */}
                <button
                  type="button"
                  onClick={handleStartVoiceRecording}
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                  title="تسجيل رسالة صوتية (تحدث الآن)"
                >
                  <Mic className="w-4 h-4 text-emerald-400" />
                </button>

                {/* Attachments Dropdown Trigger (Yellow Highlighted in Request) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAttachMenuOpen(prev => !prev)}
                    className="p-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-all cursor-pointer shrink-0 border border-amber-500/40 shadow-xs"
                    title="إرفاق وسائط وملفات واستفتاءات من الجهاز"
                  >
                    <Plus className={`w-4 h-4 transition-transform ${isAttachMenuOpen ? 'rotate-45' : ''}`} />
                  </button>

                  {/* Attachment popup menu */}
                  {isAttachMenuOpen && (
                    <div className="absolute bottom-14 right-0 w-60 bg-[#162238] border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 z-30 animate-in fade-in slide-in-from-bottom-2 text-right">
                      
                      {/* Photo from Device */}
                      <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-end gap-2.5 cursor-pointer"
                      >
                        <span>رفع صورة من الجهاز</span>
                        <ImageIcon className="w-4 h-4 text-amber-400" />
                      </button>

                      {/* Video from Device */}
                      <button
                        type="button"
                        onClick={() => videoFileInputRef.current?.click()}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-end gap-2.5 cursor-pointer"
                      >
                        <span>رفع فيديو من الجهاز</span>
                        <VideoIcon className="w-4 h-4 text-rose-400" />
                      </button>

                      {/* Audio File from Device */}
                      <button
                        type="button"
                        onClick={() => audioFileInputRef.current?.click()}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-end gap-2.5 cursor-pointer"
                      >
                        <span>رفع ملف صوتي من الجهاز</span>
                        <Music className="w-4 h-4 text-emerald-400" />
                      </button>

                      {/* Document / PDF from Device */}
                      <button
                        type="button"
                        onClick={() => docFileInputRef.current?.click()}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-end gap-2.5 cursor-pointer"
                      >
                        <span>رفع مستند / ملف PDF</span>
                        <FileText className="w-4 h-4 text-purple-400" />
                      </button>

                      <div className="border-t border-slate-700 my-1" />

                      {/* Poll */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachMenuOpen(false);
                          setIsPollModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-end gap-2.5 cursor-pointer"
                      >
                        <span>إنشاء تصويت / استفتاء</span>
                        <BarChart2 className="w-4 h-4 text-sky-400" />
                      </button>

                      {/* MCQ */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsAttachMenuOpen(false);
                          setIsMCQModalOpen(true);
                        }}
                        className="w-full p-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-end gap-2.5 cursor-pointer"
                      >
                        <span>نشر سؤال أتمتة تفاعلي</span>
                        <HelpCircle className="w-4 h-4 text-teal-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Text Input */}
                <input
                  type="text"
                  placeholder="اكتب رسالة في الملتقى..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right"
                />
              </form>
            )}
          </div>
        </section>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Staged File Preview & Caption (Real Device Upload) */}
      {/* ======================================================== */}
      {stagedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button onClick={() => setStagedFile(null)} className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-base text-white">إرسال المرفق إلى المحادثة</h3>
            </div>

            {/* Preview Box */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 max-h-56 flex items-center justify-center">
              {stagedFile.type === 'image' && (
                <img src={stagedFile.dataUrl} alt="Preview" className="max-h-56 object-contain" />
              )}
              {stagedFile.type === 'video' && (
                <video src={stagedFile.dataUrl} controls className="max-h-56 w-full object-contain" />
              )}
              {stagedFile.type === 'voice' && (
                <div className="p-4 flex items-center gap-3">
                  <Music className="w-8 h-8 text-emerald-400" />
                  <audio src={stagedFile.dataUrl} controls className="w-full" />
                </div>
              )}
              {stagedFile.type === 'file' && (
                <div className="p-6 text-center space-y-1">
                  <FileText className="w-10 h-10 text-purple-400 mx-auto" />
                  <p className="font-bold text-xs text-white line-clamp-1">{stagedFile.name}</p>
                  <p className="text-[10px] text-slate-400">{stagedFile.size}</p>
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">إضافة تعليق أو وصف (اختياري):</label>
              <input
                type="text"
                placeholder="اكتب ملاحظة أو وصف..."
                value={stagedCaption}
                onChange={(e) => setStagedCaption(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSendStagedFile}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                إرسال المرفق الآن
              </button>
              <button
                onClick={() => setStagedFile(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Create Student Poll                             */}
      {/* ======================================================== */}
      {isPollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button onClick={() => setIsPollModalOpen(false)} className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <BarChart2 className="w-5 h-5 text-sky-400" />
                <span>إنشاء استطلاع رأي طلابي</span>
              </h3>
            </div>

            <form onSubmit={handleCreatePollSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">سؤال الاستفتاء:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ما رأيكم بموعد المحاضرة التعويضية للتشريح؟"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500 text-right"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">الخيارات المتاحة للتصويت:</label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`الخيار ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[idx] = e.target.value;
                        setPollOptions(copy);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-sky-500 text-right"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        className="p-2 text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة خيار تصويت آخر</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  نشر الاستفتاء في القناة
                </button>
                <button
                  type="button"
                  onClick={() => setIsPollModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Create Interactive MCQ in Chat                  */}
      {/* ======================================================== */}
      {isMCQModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button onClick={() => setIsMCQModalOpen(false)} className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <span>نشر سؤال أتمتة تفاعلي</span>
              </h3>
            </div>

            <form onSubmit={handleCreateMCQSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نص السؤال الأتمتي:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="مثال: أي من الباحات التالية مسؤولة عن الإدراك السمعي في قشرة المخ؟"
                  value={mcqQuestion}
                  onChange={(e) => setMCQQuestion(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  خيارات الإجابة (حدد الخيار الصحيح عبر الدائرة):
                </label>
                {mcqOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={mcqCorrectIndex === idx}
                      onChange={() => setMCQCorrectIndex(idx)}
                      className="accent-emerald-500 w-4 h-4 cursor-pointer"
                      title="اجعل هذا الخيار هو الإجابة الصحيحة"
                    />
                    <input
                      type="text"
                      required
                      placeholder={`الخيار ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...mcqOptions];
                        copy[idx] = e.target.value;
                        setMCQOptions(copy);
                      }}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-emerald-500 text-right"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  نشر السؤال للتحدي
                </button>
                <button
                  type="button"
                  onClick={() => setIsMCQModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Setup / Update Exam Number                      */}
      {/* ======================================================== */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button onClick={() => setIsExamModalOpen(false)} className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-base text-white">الرقم الامتحاني للطالب</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يستخدم رقمك الامتحاني للتحقق من دفعتك الأكاديمية (السنة الثانية أو الثالثة) وتسهيل التواصل والبحث بين الزملاء.
            </p>

            <form onSubmit={handleVerifyExamSubmit} className="space-y-3">
              <input
                type="text"
                required
                placeholder="مثال: 30421"
                value={examInput}
                onChange={(e) => setExamInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  حفظ وتأكيد الرقم
                </button>
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: Blocked Numbers List                            */}
      {/* ======================================================== */}
      {showBlockedListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button onClick={() => setShowBlockedListModal(false)} className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-base text-white">قائمة الأرقام المحظورة</h3>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {blockedUsers.map((num) => (
                <div key={num} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => toggleBlockUser(num)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    إلغاء الحظر
                  </button>
                  <span className="text-xs font-mono text-slate-300">الرقم: {num}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowBlockedListModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: Create New Channel (Supervisors)                 */}
      {/* ======================================================== */}
      {isCreateChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121B2F] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <button 
                type="button"
                onClick={() => setIsCreateChannelModalOpen(false)} 
                className="p-1 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>إنشاء قناة مناقشة جديدة (المشرف)</span>
              </h3>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم القناة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مناقشات العملي والسريري..."
                  value={newChanName}
                  onChange={(e) => setNewChanName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">وصف القناة والهدف منها:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="اكتب وصفاً موجزاً يظهر للطلاب عن محتوى القناة..."
                  value={newChanDescription}
                  onChange={(e) => setNewChanDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 text-right resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الدفعة المستهدفة:</label>
                  <InAppSelect<'all' | '2' | '3' | 'admin'>
                    value={newChanBadge}
                    onChange={(val) => {
                      setNewChanBadge(val);
                      if (val === 'admin') setNewChanIsSupervisorOnly(true);
                    }}
                    size="sm"
                    options={[
                      { value: 'all', label: 'عامة (جميع الطلاب)' },
                      { value: '2', label: 'السنة الثانية (دفعة 31)' },
                      { value: '3', label: 'السنة الثالثة (دفعة 30)' },
                      { value: 'admin', label: 'مشرفين فقط' },
                    ]}
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded-xl border border-slate-700 text-xs">
                    <input
                      type="checkbox"
                      checked={newChanIsLocked}
                      onChange={(e) => setNewChanIsLocked(e.target.checked)}
                      className="rounded text-emerald-500"
                    />
                    <span className="text-slate-300 font-bold">تتطلب إذن للدخول</span>
                  </label>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                <input
                  type="checkbox"
                  checked={newChanIsSupervisorOnly}
                  onChange={(e) => setNewChanIsSupervisorOnly(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span className="text-amber-300 font-bold">قناة حصرية للمشرفين (تختفي تماماً عن الطلاب)</span>
              </label>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  إنشاء وتفعيل القناة
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateChannelModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
