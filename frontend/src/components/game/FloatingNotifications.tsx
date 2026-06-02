'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationItem {
  id: string;
  username: string;
  clicks: number;
}

interface FloatingNotificationsProps {
  notifications: NotificationItem[];
}

export default function FloatingNotifications({ notifications }: FloatingNotificationsProps) {
  return (
    <div className="fixed bottom-4 left-4 md:bottom-8 md:left-8 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md border border-slate-700/50 rounded-full px-4 py-2 shadow-lg"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner">
              {notif.username.charAt(0)}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-slate-200 font-semibold text-sm">
                {notif.username}
              </span>
              <span className="text-yellow-400 font-black text-sm drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
                +{notif.clicks}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
