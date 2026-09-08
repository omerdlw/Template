"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/modules/auth";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/client";
import { globalEvents } from "@/shared";

export function SocialRealtimeSync() {
  const auth = useAuth();
  const userId = auth.user?.id || null;
  const accessToken = auth.session?.access_token || null;
  const channelRef = useRef(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !userId) {
      if (channelRef.current) {
        const supabase = createBrowserSupabaseClient();
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const supabase = createBrowserSupabaseClient();
    if (accessToken) {
      void supabase.realtime.setAuth(accessToken);
    }

    const channelName = `social:user:${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          globalEvents.emit("social:notification-change", payload);
          const eventType = payload.new?.event_type || payload.old?.event_type;
          if (eventType === "FOLLOW_REQUEST" || eventType === "FOLLOW_ACCEPTED") {
            globalEvents.emit("social:inbox-change");
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "account_follows",
        },
        (payload) => {
          const record =
            payload.new && Object.keys(payload.new).length > 0
              ? payload.new
              : payload.old;
          const followerId = record?.follower_id;
          const followingId = record?.following_id;
          const status = payload.eventType === "DELETE" ? null : record?.status;

          if (followingId === userId) {
            globalEvents.emit("social:inbox-change");
            globalEvents.emit("social:follow-change", {
              followerId,
              followingId,
              status,
            });
          }

          if (followerId === userId) {
            globalEvents.emit("social:follow-change", {
              followerId,
              followingId,
              status,
            });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        const client = createBrowserSupabaseClient();
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [accessToken, auth.isAuthenticated, userId]);

  return null;
}
