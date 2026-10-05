import React, { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { dummyMeetingDetails, dummyUser } from "../assets/asset";
import VideoGrid from "../components/meetings/VideoGrid";
import useWebRTC from "../hooks/useWebRTC";
import ChatPanel from "../components/meetings/ChatPanel";
import { useChat } from "../hooks/useChat";
import ParticipantsList from "../components/meetings/ParticipantsList";
import ControlBar from "../components/meetings/ControlBar";
import toast from "react-hot-toast";

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const userData = dummyUser;

  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

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
  const isHost = true;

  //initialize Chat
  const { messages, sendMessage, unreadCount, isChatOpen, toggleChat } =
    useChat(meetingId, userData);

  const handleLeaveMeeting = () => {
    toast("You Left the Meeting");
    navigate("/dashboard");
  };

  const handleEndMeeting = () => {
    endMeeting();
    toast("Meeting Ended for all Participants");
    navigate("/dahsboard");
  };

  return (
    <div className="h-screen w-screen bg-slate-200 flex flex-col overflow-hidden relative font-sans">
      {/* Top bar */}
      <header className="w-full bg-white/90 backdrop-blur-md px-6 py-3 border-b border-slate-200 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            {dummyMeetingDetails.title}(
            {meetingId || dummyMeetingDetails.meetingId})
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
          meetingHostId={dummyUser.id}
        />
      </div>
      {/* bottom floating control pannel */}

      <ControlBar
        roomId={meetingId || dummyMeetingDetails.meetingId}
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
