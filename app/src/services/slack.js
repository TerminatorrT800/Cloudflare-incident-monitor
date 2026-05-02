require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const WEBHOOK_URL = process.env.SLACK_WEBHOOK;

async function sendSlackMessage(incident) {
  let payload = {};
  if (incident.update) {
    payload = {
      text:
        `🚨 Update\n\n` +
        `Title: ${incident.name}\n` +
        `Status: ${incident.status}\n` +
        `Impact: ${incident.impact}\n` +
        `Message: ${incident.update}\n` +
        `Created at: ${incident.createdAt}\n`,
    };
  } else {
    payload = {
      text:
        `🚨 Cloudflare Incident\n\n` +
        `Title: ${incident.name}\n` +
        `Status: ${incident.status}\n` +
        `Impact: ${incident.impact}\n` +
        `Created at: ${incident.createdAt}\n`,
    };
  }
  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

module.exports = {
  sendSlackMessage,
};
