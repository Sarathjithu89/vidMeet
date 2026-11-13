import { verifyToken } from "@clerk/express";
import { sql } from "./config/db.js";

//socket.io Room State:roomId ->Map<SocketId,participantObject
const rooms = new Map();

export function setupSocketIO(io) {
  // Authenticate every socket connection with the Clerk session token.
  // Without this, any client could claim to be the host by sending a fake user object.
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!payload?.sub) {
        return next(new Error("Unauthorized"));
      }

      socket.data.userId = payload.sub;
      return next();
    } catch (err) {
      console.error("Socket authentication failed:", err.message);
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Trusted identity resolved from the verified Clerk token.
    const authUserId = socket.data.userId;

    let currentRoomId = null;
    let currentUser = null;
    let hasJoined = false;

    // Returns the room only when this socket is an active member of it.
    const getRoom = (roomId) => {
      if (!roomId || currentRoomId !== roomId) return null;
      const room = rooms.get(roomId);
      if (!room || !room.has(socket.id)) return null;
      return room;
    };

    //user joins a meetingroom
    socket.on(
      "join-room",
      async ({ roomId, user, audioEnabled = true, videoEnabled = true } = {}) => {
        if (hasJoined) return;
        if (!authUserId || !roomId) {
          socket.emit("meeting-ended", { message: "Authentication required" });
          return;
        }
        hasJoined = true;
        try {
          //verify meeting status form DB
          const meetings = await sql`
                SELECT * FROM meetings WHERE meeting_id=${roomId}`;
          if (meetings.length === 0) {
            socket.emit("meeting-ended", { message: "Meeting not found" });
            return;
          }
          const meeting = meetings[0];
          if (meeting.status === "ended") {
            socket.emit("meeting-ended", {
              message: "This meeting has already ended.",
            });
            return;
          }
          currentRoomId = roomId;

          // Host identity comes from the verified token, never from the client payload.
          const isHost = meeting.host_id?.toString() === authUserId;

          // Only pre-existing users can be referenced by FK columns.
          const existingAccounts = await sql`
            SELECT name FROM users WHERE id=${authUserId}`;
          const dbUserId =
            existingAccounts.length > 0 ? authUserId : null;

          currentUser = {
            socketId: socket.id,
            userId: authUserId,
            userName:
              existingAccounts[0]?.name ||
              user?.name ||
              "Anonymous",
            isHost,
            audioEnabled,
            videoEnabled,
            dbUserId,
          };
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }
          const roomParticipants = rooms.get(roomId);

          //fetch host plan to enforce participants limits
          const hosts =
            await sql`SELECT plan FROM users WHERE id=${meeting.host_id}`;
          const hostPlan = hosts[0]?.plan || "free";
          const maxParticipants = hostPlan === "premium" ? 100 : 10;
          if (roomParticipants.size >= maxParticipants) {
            socket.emit("meeting-ended", {
              message: `Meeting capacity limit reached (max ${maxParticipants} participants for ${hostPlan.toUpperCase()} plan).Host must upgrade to Premium to get the 100 participants!`,
            });
            return;
          }

          socket.join(roomId);

          //get Existing participants in the room
          const existingUsers = Array.from(roomParticipants.values());

          //add new participants to socket state
          roomParticipants.set(socket.id, currentUser);

          // Only log a new participant row when there is no open session for them.
          // This keeps a fresh joined_at/left_at pair when someone rejoins a meeting.
          const openParticipants = await sql`
          SELECT id FROM meeting_participants
          WHERE meeting_id=${meeting.id}
          AND ((${dbUserId}::text IS NOT NULL AND user_id=${dbUserId}) OR name =${currentUser.userName})
          AND left_at IS NULL
          LIMIT 1`;

          if (openParticipants.length === 0) {
            await sql`
            INSERT INTO meeting_participants (meeting_id,user_id,name,joined_at)
            VALUES(${meeting.id},${dbUserId},${currentUser.userName},NOW())`;
          }

          //send the list of existing users to the newcommer
          socket.emit("all-users", existingUsers);

          //notify everyone else in the room
          socket.to(roomId).emit("user-joined", currentUser);
        } catch (err) {
          console.error("Error joining room in socket:", err);
          socket.emit("meeting-ended", { message: "Failed to join room" });
        }
      },
    );

    //WebRTC Signaling :Offer
    //Send the information needed to start the connection
    socket.on("offer", ({ targetSocketId, sdp } = {}) => {
      const room = getRoom(currentRoomId);
      if (!room || !sdp || !room.has(targetSocketId)) return;

      io.to(targetSocketId).emit("offer", {
        callerSocketId: socket.id,
        sdp,
        callerUser: currentUser,
      });
    });

    //WebRTC Signaling Answer
    //Accept the offer request and process the connection
    socket.on("answer", ({ targetSocketId, sdp } = {}) => {
      const room = getRoom(currentRoomId);
      if (!room || !sdp || !room.has(targetSocketId)) return;

      io.to(targetSocketId).emit("answer", {
        responderSocketId: socket.id,
        sdp,
      });
    });

    //WebRTC Signaling: ICE Candidate
    //passes the connection details from one user to the other so WebRTC can figure out to connect them directly
    socket.on("ice-candidate", ({ targetSocketId, candidate } = {}) => {
      const room = getRoom(currentRoomId);
      if (!room || !candidate || !room.has(targetSocketId)) return;

      io.to(targetSocketId).emit("ice-candidate", {
        senderSocketId: socket.id,
        candidate,
      });
    });

    //Audio toggle evert
    socket.on("toggle-audio", ({ roomId, audioEnabled } = {}) => {
      const room = getRoom(roomId);
      if (!room) return;

      const participant = room.get(socket.id);
      if (participant) participant.audioEnabled = Boolean(audioEnabled);

      socket.to(roomId).emit("user-toggled-audio", {
        socketId: socket.id,
        audioEnabled: Boolean(audioEnabled),
      });
    });

    //Video toggle event
    socket.on("toggle-video", ({ roomId, videoEnabled } = {}) => {
      const room = getRoom(roomId);
      if (!room) return;

      const participant = room.get(socket.id);
      if (participant) participant.videoEnabled = Boolean(videoEnabled);

      socket.to(roomId).emit("user-toggled-video", {
        socketId: socket.id,
        videoEnabled: Boolean(videoEnabled),
      });
    });

    //chat message event --> persist to DB & brodcast
    socket.on("send-message", async ({ roomId, message } = {}) => {
      try {
        const room = getRoom(roomId);
        if (!room || !currentUser) return;

        if (
          !message?.text ||
          typeof message.text !== "string" ||
          message.text.trim().length === 0
        ) {
          return;
        }

        const trimmedText = message.text.trim();
        if (trimmedText.length > 2000) {
          socket.emit("message-error", {
            error: "Message is too long (maximum 2000 characters).",
          });
          return;
        }

        const meetings = await sql`
        SELECT id,status FROM meetings WHERE meeting_id=${roomId}`;
        if (meetings.length > 0 && meetings[0].status !== "ended") {
          const meetingId = meetings[0].id;

          // Use the verified dbUserId resolved at join-room time (null if user wasn't in users table yet)
          // to avoid FK constraint violation on meeting_messages_sender_id_fkey
          const senderId = currentUser.dbUserId ?? null;

          await sql`
          INSERT INTO meeting_messages(meeting_id,sender_id,sender_name,text,timestamp)
          VALUES(${meetingId},${senderId},${currentUser.userName},${trimmedText},NOW())`;

          // Sender name/id are always server-side values so messages cannot be spoofed.
          io.in(roomId).emit("receive-message", {
            ...message,
            id: message.id || `${Date.now()}`,
            text: trimmedText,
            senderId: currentUser.userId,
            senderName: currentUser.userName,
            senderSocketId: socket.id,
          });
        }
      } catch (err) {
        console.error("Error saving chat message to DB:", err);
      }
    });

    //Host ends meeting for all via end meeting button
    socket.on("end-meeting", async ({ roomId } = {}) => {
      try {
        const room = getRoom(roomId);
        if (!room || !currentUser) return;

        const meetings = await sql`
        SELECT host_id FROM meetings WHERE meeting_id=${roomId}`;
        if (meetings.length === 0) return;

        const isActualHost =
          currentUser.userId &&
          meetings[0].host_id?.toString() === currentUser.userId.toString();

        if (!isActualHost) {
          socket.emit("meeting-ended", {
            message: "Unauthorized: Only the host can end the meeting.",
          });
          return;
        }

        await sql`
        UPDATE meetings
        SET status='ended',ended_at=NOW()
        WHERE meeting_id=${roomId}`;

        io.to(roomId).emit("meeting-ended", {
          message: "The meeting has been ended by the Host.",
        });
        room.clear();
        rooms.delete(roomId);
      } catch (err) {
        console.error("Error ending meeting:", err);
      }
    });

    //Handle Disconnect(Reloading window, network drop or closing tab)
    socket.on("disconnect", async () => {
      if (currentRoomId && currentUser) {
        try {
          const meetings = await sql`SELECT id FROM meetings WHERE meeting_id=${currentRoomId}`;
          if (meetings.length > 0) {
            const meetingDbId = meetings[0].id;
            const userId = currentUser.dbUserId || null;
            await sql`
              UPDATE meeting_participants
              SET left_at = NOW()
              WHERE meeting_id = ${meetingDbId}
              AND ((${userId}::text IS NOT NULL AND user_id = ${userId}) OR name = ${currentUser.userName})
              AND left_at IS NULL`;
          }
        } catch (dbErr) {
          console.error("Error updating left_at timestamp on disconnect:", dbErr);
        }
      }

      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomParticipants = rooms.get(currentRoomId);
        roomParticipants.delete(socket.id);
        if (roomParticipants.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          //Notify remaining peers that the user disconnected
          socket
            .to(currentRoomId)
            .emit("user-left", { socketId: socket.id, user: currentUser });
        }
      }
    });
  });
}
