const mongoose = require("mongoose");

// Session schema
const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    drawingActions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        type: {
          type: String,
          enum: ["draw", "erase", "colorChange"],
          required: true,
        },

        data: {
          type: Object,
          required: true,
        },

        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Store the current state of the drawing as a snapshot
    drawingState: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Method to add a new drawing action to the session
sessionSchema.methods.addDrawingAction = async function (
  userId,
  actionType,
  actionData
) {
  const action = {
    userId,
    type: actionType,
    data: actionData,
    timestamp: new Date(),
  };

  this.drawingActions.push(action);
  this.drawingState = actionData;

  await this.save();
};

// Method to get a session's current state (e.g., for session restoration)
sessionSchema.methods.getSessionState = function () {
  return {
    sessionId: this.sessionId,
    users: this.users,
    drawingActions: this.drawingActions,
    drawingState: this.drawingState,
  };
};

module.exports = mongoose.model("Session", sessionSchema);
