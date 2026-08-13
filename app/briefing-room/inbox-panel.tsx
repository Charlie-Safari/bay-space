"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BayDirectConversation,
  BayDirectMessage,
  BayDirectMessageMember,
} from "../../lib/bay-space-types";

type InboxPanelProps = {
  member: {
    member: string;
    name: string;
  };
};

type InboxConversationDetail = {
  hasBlockedMe: boolean;
  isBlockedByMe: boolean;
  member: BayDirectMessageMember;
  messages: BayDirectMessage[];
};

type PublicMemberOption = {
  member: string;
  name: string;
  refName: string;
  title: string;
};

function formatInboxTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InboxPanel({ member }: InboxPanelProps) {
  const [conversations, setConversations] = useState<BayDirectConversation[]>(
    [],
  );
  const [members, setMembers] = useState<PublicMemberOption[]>([]);
  const [selectedMember, setSelectedMember] =
    useState<BayDirectMessageMember | null>(null);
  const [messages, setMessages] = useState<BayDirectMessage[]>([]);
  const [memberQuery, setMemberQuery] = useState("");
  const [composer, setComposer] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [hasBlockedMe, setHasBlockedMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const syncConversations = useCallback(async () => {
    const response = await fetch("/api/inbox", { cache: "no-store" });
    const data = (await response.json()) as {
      conversations?: BayDirectConversation[];
      message?: string;
    };

    if (!response.ok) {
      setStatusMessage(data.message ?? "inbox unavailable");
      return;
    }

    setConversations(data.conversations ?? []);
  }, []);

  const syncMembers = useCallback(async () => {
    const response = await fetch("/api/members", { cache: "no-store" });
    const data = (await response.json()) as {
      members?: PublicMemberOption[];
    };

    setMembers(data.members ?? []);
  }, []);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      syncConversations();
      syncMembers();
    }, 0);

    window.addEventListener("bay-space-auth", syncConversations);

    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("bay-space-auth", syncConversations);
    };
  }, [syncConversations, syncMembers]);

  const memberSearchResults = useMemo(() => {
    const normalizedQuery = memberQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return members
      .filter((candidate) =>
        [
          candidate.member,
          candidate.name,
          candidate.refName,
          candidate.title,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [memberQuery, members]);

  async function openConversation(memberId: string) {
    setIsLoading(true);
    setStatusMessage("");

    const response = await fetch(
      `/api/inbox?member=${encodeURIComponent(memberId)}`,
      { cache: "no-store" },
    );
    const data = (await response.json()) as {
      conversation?: InboxConversationDetail;
      message?: string;
    };

    setIsLoading(false);

    if (!response.ok || !data.conversation) {
      setStatusMessage(data.message ?? "conversation unavailable");
      return;
    }

    setSelectedMember(data.conversation.member);
    setMessages(data.conversation.messages);
    setIsBlockedByMe(data.conversation.isBlockedByMe);
    setHasBlockedMe(data.conversation.hasBlockedMe);
    setMemberQuery("");
    syncConversations();
  }

  async function sendMessage() {
    if (!selectedMember || !composer.trim() || isSending) {
      return;
    }

    setIsSending(true);
    setStatusMessage("");

    const response = await fetch("/api/inbox", {
      body: JSON.stringify({
        body: composer,
        recipientMember: selectedMember.member,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const data = (await response.json()) as {
      hasBlockedMe?: boolean;
      isBlockedByMe?: boolean;
      message?: string;
    };

    setIsSending(false);

    if (!response.ok) {
      setStatusMessage(data.message ?? "message not sent");
      setIsBlockedByMe(Boolean(data.isBlockedByMe));
      setHasBlockedMe(Boolean(data.hasBlockedMe));
      return;
    }

    setComposer("");
    await openConversation(selectedMember.member);
  }

  async function toggleBlock() {
    if (!selectedMember || selectedMember.member === member.member) {
      return;
    }

    const response = await fetch("/api/inbox/block", {
      body: JSON.stringify({
        blocked: !isBlockedByMe,
        member: selectedMember.member,
      }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    const data = (await response.json()) as {
      hasBlockedMe?: boolean;
      isBlockedByMe?: boolean;
      message?: string;
    };

    if (!response.ok) {
      setStatusMessage(data.message ?? "block update failed");
      return;
    }

    setIsBlockedByMe(Boolean(data.isBlockedByMe));
    setHasBlockedMe(Boolean(data.hasBlockedMe));
    setStatusMessage(data.isBlockedByMe ? "user blocked" : "user unblocked");
    syncConversations();
  }

  const canSendMessage =
    Boolean(selectedMember && composer.trim()) &&
    !isBlockedByMe &&
    !hasBlockedMe &&
    !isSending;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d7ffd0]">
            inbox
          </p>
          <p className="mt-2 max-w-xl border-l-2 border-[#39ff14] pl-3 text-xs font-black uppercase leading-5 tracking-[0.16em] text-[#7f9f78]">
            Text only. Messages auto-delete after 7 days.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            syncConversations();
            if (selectedMember?.member) {
              openConversation(selectedMember.member);
            }
          }}
          className="border border-[#1d7f12] px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
        >
          refresh
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <section className="border-2 border-[#1d7f12] bg-black p-4">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
              new message
            </span>
            <input
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="name / username / number"
              className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-sm font-black text-[#39ff14] outline-none placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14]"
            />
          </label>

          {memberSearchResults.length ? (
            <div className="mt-3 grid gap-2">
              {memberSearchResults.map((candidate) => (
                <button
                  key={candidate.member}
                  type="button"
                  onClick={() => openConversation(candidate.member)}
                  className="border border-[#1d7f12] bg-[#001100] px-3 py-2 text-left text-xs font-black uppercase tracking-[0.14em] text-[#39ff14] transition hover:border-[#39ff14] hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0]"
                >
                  <span className="block">{candidate.name}</span>
                  <span className="mt-1 block text-[#7f9f78]">
                    {candidate.refName || candidate.member}
                  </span>
                </button>
              ))}
            </div>
          ) : memberQuery.trim() ? (
            <p className="mt-3 border-l-2 border-[#39ff14] pl-3 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
              no members found
            </p>
          ) : null}

          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-[#7f9f78]">
            conversations
          </p>
          <div className="mt-3 grid gap-2">
            {conversations.length ? (
              conversations.map((conversation) => (
                <button
                  key={conversation.member.member}
                  type="button"
                  onClick={() => openConversation(conversation.member.member)}
                  className={`border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] ${
                    selectedMember?.member === conversation.member.member
                      ? "border-[#39ff14] bg-[#39ff14] text-black"
                      : "border-[#1d7f12] bg-[#001100] text-[#39ff14] hover:border-[#39ff14]"
                  }`}
                >
                  <span className="block text-xs font-black uppercase tracking-[0.16em]">
                    {conversation.member.name}
                    {conversation.unreadCount
                      ? ` / ${conversation.unreadCount} new`
                      : ""}
                  </span>
                  <span className="mt-2 block truncate text-xs font-bold uppercase tracking-[0.1em] opacity-80">
                    {conversation.latestMessage.body}
                  </span>
                </button>
              ))
            ) : (
              <p className="border-l-2 border-[#39ff14] pl-3 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                no conversations
              </p>
            )}
          </div>
        </section>

        <section className="min-h-[34rem] border-2 border-[#39ff14] bg-black p-4 shadow-[0_0_18px_rgba(57,255,20,0.16)]">
          {selectedMember ? (
            <div className="flex h-full min-h-[32rem] flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1d7f12] pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7f9f78]">
                    chat with
                  </p>
                  <p className="mt-2 text-xl font-black uppercase tracking-[0.14em] text-[#39ff14]">
                    {selectedMember.name}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78]">
                    {selectedMember.refName || selectedMember.member}
                  </p>
                </div>
                {selectedMember.member !== member.member ? (
                  <button
                    type="button"
                    onClick={toggleBlock}
                    className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition focus:outline-none focus:ring-2 ${
                      isBlockedByMe
                        ? "border-[#39ff14] bg-[#39ff14] text-black focus:ring-[#d7ffd0]"
                        : "border-[#ff3b3b] text-[#ff6b6b] hover:bg-[#ff3b3b] hover:text-black focus:ring-[#ff9b9b]"
                    }`}
                  >
                    {isBlockedByMe ? "unblock user" : "block user"}
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid flex-1 content-end gap-3 overflow-y-auto pr-1">
                {messages.length ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[82%] border px-3 py-3 ${
                        message.isMine
                          ? "ml-auto border-[#39ff14] bg-[#001100] text-right text-[#d7ffd0]"
                          : "mr-auto border-[#1d7f12] bg-black text-left text-[#d7ffd0]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm font-bold leading-6">
                        {message.body}
                      </p>
                      <p className="mt-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#7f9f78]">
                        {formatInboxTimestamp(message.createdAt)}
                      </p>
                    </div>
                  ))
                ) : isLoading ? (
                  <p className="border-l-2 border-[#39ff14] pl-3 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                    loading messages
                  </p>
                ) : (
                  <p className="border-l-2 border-[#39ff14] pl-3 text-xs font-black uppercase tracking-[0.14em] text-[#d7ffd0]">
                    no messages yet
                  </p>
                )}
              </div>

              {isBlockedByMe || hasBlockedMe ? (
                <p className="mt-4 border-l-2 border-[#ff3b3b] pl-3 text-xs font-black uppercase tracking-[0.14em] text-[#ff9b9b]">
                  {isBlockedByMe
                    ? "you blocked this user"
                    : "messaging blocked"}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 border-t border-[#1d7f12] pt-4">
                <textarea
                  value={composer}
                  onChange={(event) =>
                    setComposer(event.target.value.slice(0, 1000))
                  }
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="type message"
                  disabled={isBlockedByMe || hasBlockedMe}
                  className="min-h-24 resize-y border border-[#1d7f12] bg-[#001100] px-3 py-3 text-sm font-bold leading-6 text-[#39ff14] outline-none placeholder:uppercase placeholder:tracking-[0.16em] placeholder:text-[#7f9f78] focus:ring-2 focus:ring-[#39ff14] disabled:border-[#1d7f12] disabled:text-[#1d7f12]"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#7f9f78]">
                    {composer.length}/1000
                  </span>
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!canSendMessage}
                    className="border-2 border-[#39ff14] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black focus:outline-none focus:ring-2 focus:ring-[#d7ffd0] disabled:border-[#1d7f12] disabled:text-[#1d7f12] disabled:hover:bg-black"
                  >
                    send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-[32rem] place-items-center border border-dashed border-[#1d7f12] px-4 py-8 text-center">
              <p className="max-w-sm text-sm font-black uppercase leading-7 tracking-[0.18em] text-[#d7ffd0]">
                select a conversation or search a member to start a text-only
                message
              </p>
            </div>
          )}
        </section>
      </div>

      {statusMessage ? (
        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#d7ffd0]">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
