import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Kubernetes Dashboard Session" },

    // Stores AI/UI actions like FILTER, SORT, GROUP_BY
    actions: { type: Array, default: [] },

    // Stores selected container name if user opens logs
    selectedPod: { type: String, default: null },
  },
  { timestamps: true },
);

export const SessionModel = mongoose.model("Session", sessionSchema);
