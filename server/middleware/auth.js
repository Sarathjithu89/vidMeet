import { clerkClient, getAuth } from "@clerk/express";
import { sql } from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId || req.auth?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Not authorized, authentication required" });
    }

    req.user = { id: userId };
    const userActivePlan = auth.has({ plan: "premium" }) ? "premium" : "free";

    const users = await sql`SELECT name, plan FROM users WHERE id=${userId}`;

    if (users.length === 0) {
      // Webhook hasn't fired yet — fetch directly from Clerk API and upsert now
      // so all FK constraints (meetings.host_id, etc.) are satisfied immediately.
      const clerkUser = await clerkClient.users.getUser(userId);
      const name =
        `${clerkUser.firstName || "User"} ${clerkUser.lastName || ""}`.trim();
      const email =
        clerkUser.emailAddresses?.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress ||
        "";
      const image = clerkUser.imageUrl || "";

      await sql`
        INSERT INTO users (id, name, email, image, plan)
        VALUES (${userId}, ${name}, ${email}, ${image}, ${userActivePlan})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
          image = EXCLUDED.image,
          plan = ${userActivePlan},
          updated_at = NOW()`;
    } else if (users[0].plan !== userActivePlan) {
      await sql`UPDATE users SET plan=${userActivePlan} WHERE id=${userId}`;
    }

    next();
  } catch (err) {
    console.error("[protect middleware error]", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
