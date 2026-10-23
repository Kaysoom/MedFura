import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  MessagesSquare, 
  Send, 
  X, 
  User, 
  ShieldCheck, 
  Sparkles,
  Smile,
  CheckCheck
} from 'lucide-react';

export const DirectChatWidget: React.FC = () => {
  const { 
    user, 
    activeChatPartner, 
    setActiveChatPartner, 
    isChatOpen, 
    setIsChatOpen, 
    directMessages, 
    sendDirectMessage 
  } = useApp();

  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages between user and activeChatPartner
  const conversationMessages = directMessages.filter(msg => {
    if (!user || !activeChatPartner) return false;
    return (
      (msg.senderId === user.uid && msg.receiverId === activeChatPartner.uid) ||
      (msg.senderId === activeChatPartner.uid && msg.receiverId === user.uid)
    );
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages, isChatOpen]);

  if (!isChatOpen || !activeChatPartner) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    await sendDirectMessage(activeChatPartner.uid, activeChatPartner.displayName, messageText);
    setMessageText('');
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-5 duration-200">
      
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-black text-sm text-white">
              {activeChatPartner.displayName.charAt(0)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-indigo-700 rounded-full" />
          </div>

          <div>
            <h4 className="font-extrabold text-sm text-white leading-tight">
              {activeChatPartner.displayName}
            </h4>
            <span className="text-[11px] text-indigo-100 flex items-center gap-1">
              <span>محادثة خاصة مباشرة</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setIsChatOpen(false);
            setActiveChatPartner(null);
          }}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="text-center py-2">
          <span className="text-[10px] font-bold text-slate-400 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            بداية المحادثة الآمنة بين الطلاب
          </span>
        </div>

        {conversationMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <MessagesSquare className="w-10 h-10 mx-auto opacity-40" />
            <p className="text-xs">
              أرسل رسالة لبدء المحادثة مع {activeChatPartner.displayName} بخصوص الكتب أو الأسئلة الأكاديمية.
            </p>
          </div>
        ) : (
          conversationMessages.map((msg) => {
            const isMe = user && msg.senderId === user.uid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[80%] p-3.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700/80 shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
                <div className="flex items-center gap-1 px-1 mt-1 text-[10px] text-slate-400">
                  <span>{msg.createdAt}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-indigo-500" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <input
          type="text"
          placeholder={`اكتب رسالة إلى ${activeChatPartner.displayName}...`}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
        />

        <button
          type="submit"
          disabled={!messageText.trim()}
          className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all cursor-pointer shadow-md"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
};
