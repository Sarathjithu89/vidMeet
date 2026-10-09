import { verifyWebhook } from "@clerk/express/webhooks";
import { sql } from "../config/db.js";

const getPrimaryEmail = (data) =>
  data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
    ?.email_address ||
  data.email_addresses?.[0]?.email_address ||
  "";

export const handleClerkWebhook = async (req, res) => {
  try {
    const evt = await verifyWebhook(req);
    const { type: eventType, data } = evt;

    switch (eventType) {
      case "user.created": {
        const userId = data.id;
        const primaryEmail = getPrimaryEmail(data);
        const name =
          `${data.first_name || "User"} ${data.last_name || ""}`.trim();
        const image = data.image_url || "";
        const plan = "free";

        await sql`
          INSERT INTO users (id, name, email, image, plan)
          VALUES (${userId}, ${name}, ${primaryEmail}, ${image}, ${plan})
          ON CONFLICT (id) DO UPDATE SET
            id = EXCLUDED.id,
            name = EXCLUDED.name,
            image = EXCLUDED.image,
            plan = EXCLUDED.plan,
            updated_at = NOW()`;
        break;
      }

      case "user.updated": {
        const userId = data.id;
        const primaryEmail = getPrimaryEmail(data);
        const name =
          `${data.first_name || "User"} ${data.last_name || ""}`.trim();
        const image = data.image_url || "";

        await sql`
          INSERT INTO users (id, name, email, image, plan)
          VALUES (${userId}, ${name}, ${primaryEmail}, ${image}, 'free')
          ON CONFLICT (id) DO UPDATE SET
            id = EXCLUDED.id,
            name = EXCLUDED.name,
            image = EXCLUDED.image,
            updated_at = NOW()`;
        break;
      }

      case "user.deleted": {
        if (data.id) {
          await sql`DELETE FROM users WHERE id = ${data.id}`;
        }
        break;
      }

      default:
        console.log(`Unhandled Clerk webhook event type: ${eventType}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return res.status(400).json({
      success: false,
      error: "Webhook verification or processing failed",
    });
  }
};
