import { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../config/socket";
import toast from "react-hot-toast";

const turnUrl = import.meta.env.VITE_TURN_URL;

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // TURN is required for peers behind restrictive/symmetric NATs.
    ...(turnUrl
      ? [
          {
            urls: turnUrl,
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
};

export const useWebRTC = (
  roomId,
  user,
  onMeetingEnded,
  getToken,
  enabled = true,
) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]); // Array of { socketId, userId, userName, stream, audioEnabled, videoEnabled }
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null);

  // Initialize local media stream
  const initLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      toast.error("Could not access camera/microphone");
      console.error("Media devices access error:", error);
      // Fallback: try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        setVideoEnabled(false);
        return audioStream;
      } catch (err) {
        console.error("Audio-only fallback error:", err);
        setAudioEnabled(false);
        setVideoEnabled(false);
        return null;
      }
    }
  }, []);

  // Create RTCPeerConnection for a target socket
  const createPeerConnection = useCallback((targetSocketId, targetUser) => {
    if (peersRef.current.has(targetSocketId)) {
      return peersRef.current.get(targetSocketId);
    }

    const peer = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    }

    // Handle ICE candidates
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming remote stream tracks
    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteUsers((prev) => {
        const existingIndex = prev.findIndex(
          (u) => u.socketId === targetSocketId,
        );
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            stream: remoteStream,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              socketId: targetSocketId,
              userId: targetUser?.userId,
              userName: targetUser?.userName || "Participant",
              stream: remoteStream,
              audioEnabled: targetUser?.audioEnabled ?? true,
              videoEnabled: targetUser?.videoEnabled ?? true,
            },
          ];
        }
      });
    };

    peersRef.current.set(targetSocketId, peer);
    return peer;
  }, []);

  // Main WebRTC & Socket signaling setup effect
  useEffect(() => {
    if (!roomId || !user || !enabled) return;

    let isMounted = true;
    let hasJoinedBefore = false;
    const peers = peersRef.current;

    const closeAllPeers = () => {
      peers.forEach((peer) => peer.close());
      peers.clear();
      setRemoteUsers([]);
    };

    const joinRoom = () => {
      const stream = localStreamRef.current;
      const hasLiveAudio = Boolean(
        stream?.getAudioTracks().some((track) => track.enabled),
      );
      const hasLiveVideo = Boolean(
        stream?.getVideoTracks().some((track) => track.enabled),
      );

      socket.emit("join-room", {
        roomId,
        user: { id: user.id, name: user.name },
        audioEnabled: hasLiveAudio,
        videoEnabled: hasLiveVideo,
      });
    };

    const registerSocketListeners = () => {
      // 1. Receive all existing users in room
      socket.on("all-users", (existingUsers = []) => {
        existingUsers.forEach((existingUser) => {
          const peer = createPeerConnection(
            existingUser.socketId,
            existingUser,
          );

          // Create offer to existing user
          peer
            .createOffer()
            .then((offer) => peer.setLocalDescription(offer))
            .then(() => {
              socket.emit("offer", {
                targetSocketId: existingUser.socketId,
                sdp: peer.localDescription,
              });
            })
            .catch((err) => console.error("Error creating offer:", err));
        });
      });

      // 2. Someone new joined -> add to state
      socket.on("user-joined", (newUser) => {
        toast(`${newUser.userName} joined the meeting`, { icon: "👋" });
        createPeerConnection(newUser.socketId, newUser);
      });

      // 3. Receive offer from caller
      socket.on("offer", async ({ callerSocketId, sdp, callerUser }) => {
        const peer = createPeerConnection(callerSocketId, callerUser);
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);

          socket.emit("answer", {
            targetSocketId: callerSocketId,
            sdp: peer.localDescription,
          });
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      });

      // 4. Receive answer from responder
      socket.on("answer", async ({ responderSocketId, sdp }) => {
        const peer = peersRef.current.get(responderSocketId);
        if (peer) {
          try {
            await peer.setRemoteDescription(
              new RTCSessionDescription(sdp),
            );
          } catch (err) {
            console.error(
              "Error setting remote description from answer:",
              err,
            );
          }
        }
      });

      // 5. Receive ICE candidate
      socket.on("ice-candidate", async ({ senderSocketId, candidate }) => {
        const peer = peersRef.current.get(senderSocketId);
        if (peer && candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        }
      });

      // 6. Handle peer audio toggle
      socket.on("user-toggled-audio", ({ socketId, audioEnabled }) => {
        setRemoteUsers((prev) =>
          prev.map((u) =>
            u.socketId === socketId ? { ...u, audioEnabled } : u,
          ),
        );
      });

      // 7. Handle peer video toggle
      socket.on("user-toggled-video", ({ socketId, videoEnabled }) => {
        setRemoteUsers((prev) =>
          prev.map((u) =>
            u.socketId === socketId ? { ...u, videoEnabled } : u,
          ),
        );
      });

      // 8. Handle peer left
      socket.on("user-left", ({ socketId, user: leftUser }) => {
        if (leftUser) {
          toast(`${leftUser.userName} left the meeting`);
        }
        const peer = peersRef.current.get(socketId);
        if (peer) {
          peer.close();
          peersRef.current.delete(socketId);
        }
        setRemoteUsers((prev) =>
          prev.filter((u) => u.socketId !== socketId),
        );
      });

      // 9. Handle meeting ended by host
      socket.on("meeting-ended", ({ message }) => {
        toast.error(message || "This meeting has ended");
        if (onMeetingEnded) {
          onMeetingEnded(message);
        }
      });
    };

    const startSession = async () => {
      const stream = await initLocalStream();

      if (!isMounted) {
        // The effect was cleaned up (e.g. React StrictMode remount) while the
        // browser was still granting media access, so drop those tracks.
        stream?.getTracks().forEach((track) => track.stop());
        if (localStreamRef.current === stream) {
          localStreamRef.current = null;
        }
        return;
      }

      // Socket.IO re-evaluates this function on every (re)connection attempt,
      // so reconnects always use a fresh Clerk token.
      socket.auth = async (cb) => {
        try {
          const token = await getToken();
          cb({ token });
        } catch (err) {
          console.error("Failed to get Clerk token for socket:", err);
          cb({});
        }
      };

      registerSocketListeners();

      const handleConnect = () => {
        if (hasJoinedBefore) {
          // The socket got a new server-side id, so old peers are dead.
          closeAllPeers();
          toast("Reconnected to the meeting", { icon: "🔄" });
        }
        hasJoinedBefore = true;
        joinRoom();
      };

      socket.on("connect", handleConnect);
      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        toast.error("Could not connect to the meeting server");
      });

      if (socket.connected) {
        handleConnect();
      } else {
        socket.connect();
      }
    };

    startSession();

    // Cleanup on leave/unmount
    return () => {
      isMounted = false;

      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      // Close all peer connections
      peers.forEach((peer) => peer.close());
      peers.clear();

      // Off socket listeners
      socket.off("connect");
      socket.off("connect_error");
      socket.off("all-users");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-toggled-audio");
      socket.off("user-toggled-video");
      socket.off("user-left");
      socket.off("meeting-ended");

      socket.auth = null;
      socket.disconnect();
    };
  }, [
    roomId,
    user,
    enabled,
    createPeerConnection,
    initLocalStream,
    onMeetingEnded,
    getToken,
  ]);

  // Toggle local mic
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        const newState = !audioEnabled;
        audioTrack.enabled = newState;
        setAudioEnabled(newState);
        socket.emit("toggle-audio", { roomId, audioEnabled: newState });
      }
    }
  };

  // Toggle local camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const newState = !videoEnabled;
        videoTrack.enabled = newState;
        setVideoEnabled(newState);
        socket.emit("toggle-video", { roomId, videoEnabled: newState });
      }
    }
  };

  // End meeting for everyone (Host action)
  const endMeeting = useCallback(() => {
    if (roomId) {
      socket.emit("end-meeting", { roomId });
    }
  }, [roomId]);

  return {
    localStream,
    remoteUsers,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    endMeeting,
  };
};
