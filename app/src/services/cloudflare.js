require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const API_URL = process.env.CLOUDFLARE_API_URL;
async function getIncidents() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    if (data.incidents.length > 0) {
      const incidents = [...data.incidents].map((incident) => ({
        id: incident.id,
        name: incident.name,
        status: incident.status,
        impact: incident.impact,
        createdAt: incident.created_at,
        resolvedAt: incident.resolved_at,
        incidentUpdates: incident.incident_updates.map((update) => ({
          id: update.id,
          status: update.status,
          body: update.body,
          createdAt: update.created_at,
        })),
      }));
      return incidents;
    }
  } catch (error) {
    console.error("Error fetching incidents:", error);
    throw error;
  }
}

module.exports = { getIncidents };
