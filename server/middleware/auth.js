import { clerkClient, getAuth } from "@clerk/express";
import { sql } from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId || req.auth?.userId;

    if (!userId) {
      return res.status(401).json({
        error: "Not authorized, authentication required",
      });
    }

    req.user = { id: userId };

    const userActivePlan = auth.has({ plan: "premium" }) ? "premium" : "free";

    let users = await sql`
      SELECT name, plan
      FROM users
      WHERE id = ${userId}
    `;

    if (users.length === 0) {
      const clerkUser = await clerkClient.users.getUser(userId);

      const primaryEmail = clerkUser.emailAddresses?.find(
        (e) => e.id === clerkUser.primaryEmailAddressId,
      );

      const email =
        primaryEmail?.emailAddress ||
        clerkUser.emailAddresses?.[0]?.emailAddress;

      if (!email) {
        return res.status(400).json({
          error: "Your account does not have an email address.",
        });
      }

      const name = `${clerkUser.firstName || "User"} ${
        clerkUser.lastName || ""
      }`.trim();

      const image = clerkUser.imageUrl || "";

      let insertError = null;

      try {
        await sql`
          INSERT INTO users (id, name, email, image, plan)
          VALUES (
            ${userId},
            ${name},
            ${email},
            ${image},
            ${userActivePlan}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (err) {
        if (err.code !== "23505") {
          throw err;
        }

        insertError = err;
      }

      // Re-query after insertion to handle concurrent requests.
      users = await sql`
        SELECT name, plan
        FROM users
        WHERE id = ${userId}
      `;

      if (users.length === 0) {
        const emailOwner = await sql`
          SELECT id
          FROM users
          WHERE email = ${email}
          LIMIT 1
        `;

        if (emailOwner.length > 0) {
          console.error("[protect] Email belongs to another database user");

          return res.status(409).json({
            error: "Account identity conflict. Please contact support.",
          });
        }

        if (insertError) {
          throw insertError;
        }

        throw new Error("User creation did not produce a database record.");
      }
    }

    if (users[0].plan !== userActivePlan) {
      await sql`
        UPDATE users
        SET plan = ${userActivePlan}
        WHERE id = ${userId}
      `;
    }

    return next();
  } catch (err) {
    console.error("[protect middleware error]", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
