import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoGrid from "../components/meetings/VideoGrid";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "../components/meetings/ChatPanel";
import { useChat } from "../hooks/useChat";
import ParticipantsList from "../components/meetings/ParticipantsList";
import ControlBar from "../components/meetings/ControlBar";
import toast from "react-hot-toast";
import { useAuth, useUser } from "@clerk/react";
import api from "../config/api.js";
import Loader from "../components/Loader.jsx";

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();


  const userData = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name:
        user.fullName ||
        user.firstName ||
        user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "User",
      email: user.primaryEmailAddress?.emailAddress || "",
      image: user.imageUrl || "",
    };
  }, [
    user?.id,
    user?.fullName,
    user?.firstName,
    user?.primaryEmailAddress?.emailAddress,
    user?.imageUrl,
  ]);

  const [meeting, setMeeting] = useState(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  //fetch meeting details to verify validity before enabling WebRTC camera access

  useEffect(() => {
    if (!meetingId) {
      setLoadingMeeting(false);
      return;
    }

    const fetchMeeting = async () => {
      try {
        const token = await getToken();

        const res = await api.get(`/api/meetings/${meetingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.meeting.status === "ended") {
          toast.error("This meeting has ended");
          navigate("/dashboard");
          return;
        }

        setMeeting(res.data.meeting);
      } catch (error) {
        const errorMsg =
          error.response?.data?.error || "Meeting not found or has ended";

        toast.error(errorMsg);
        navigate("/dashboard");
      } finally {
        setLoadingMeeting(false);
      }
    };

    fetchMeeting();
  }, [meetingId, getToken, navigate]);

  const handleMeetingEnded = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  //initialize WebRTC

  const {
    localStream,
    remoteUsers,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    endMeeting,
  } = useWebRTC(meetingId, userData, handleMeetingEnded);

  //initialize Chat
  const { messages, sendMessage, unreadCount, isChatOpen, toggleChat } =
    useChat(meetingId, userData);

  const hostId = meeting?.host?.id || meeting?.host;
  const isHost = Boolean(
    userData?.id && hostId && hostId.toString() === userData.id.toString(),
  );

  const handleLeaveMeeting = () => {
    toast("You Left the Meeting");
    navigate("/dashboard");
  };

  const handleEndMeeting = () => {
    endMeeting();
    toast("Meeting Ended for all Participants");
    navigate("/dashboard");
  };
  if (loadingMeeting) {
    return <Loader text="Joining meeting room.." />;
  }

  return (
    <div className="h-screen w-screen bg-slate-200 flex flex-col overflow-hidden relative font-sans">
      {/* Top bar */}
      <header className="w-full bg-white/90 backdrop-blur-md px-6 py-3 border-b border-slate-200 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            {meeting?.title || "Meeting"}(
            {meetingId})
          </h2>
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </header>
      {/* Main content area (video grid and side pannels) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* video grid center */}
        <VideoGrid
          localStream={localStream}
          localUser={userData}
          remoteUsers={remoteUsers}
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
        />
        {/* In-meeting chat drawer */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={toggleChat}
          messages={messages}
          onSendMessage={sendMessage}
          currentUser={userData}
        />
        {/* participants drawer */}
        <ParticipantsList
          isOpen={isParticipantsOpen}
          onClose={() => setIsParticipantsOpen(false)}
          localUser={userData}
          localAudio={audioEnabled}
          localVideo={videoEnabled}
          remoteUsers={remoteUsers}
          meetingHostId={hostId}
        />
      </div>
      {/* bottom floating control pannel */}

      <ControlBar
        roomId={meetingId}
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleChat={toggleChat}
        onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        unreadCount={unreadCount}
        participantCount={1 + remoteUsers.length}
        isHost={isHost}
        onLeave={handleLeaveMeeting}
        onEndMeeting={handleEndMeeting}
      />
    </div>
  );
};

export default MeetingRoom;
