// Multi-floor graph
export const schoolGraph = {
  Commons_1: ["A_Pod_1", "B_Pod_1", "C_Pod_1", "Z_Pod_1", "MainEntrance"],
  A_Pod_1: ["Commons_1", "A_Stair"],
  B_Pod_1: ["Commons_1", "B_Stair"],
  C_Pod_1: ["Commons_1", "C_Stair"],
  Z_Pod_1: ["Commons_1", "Z_Stair", "Natatorium_1"],
  Natatorium_1: ["Z_Pod_1", "CommunityCenter_1"],
  CommunityCenter_1: ["Natatorium_1"],

  Commons_2: ["A_Pod_2", "B_Pod_2", "C_Pod_2", "Z_Pod_2"],
  A_Pod_2: ["Commons_2", "A_Stair"],
  B_Pod_2: ["Commons_2", "B_Stair"],
  C_Pod_2: ["Commons_2", "C_Stair"],
  Z_Pod_2: ["Commons_2", "Z_Stair", "Natatorium_2"],
  Natatorium_2: ["Z_Pod_2", "CommunityCenter_2"],
  CommunityCenter_2: ["Natatorium_2"],

  Commons_3: ["A_Pod_3", "B_Pod_3", "C_Pod_3", "Z_Pod_3"],
  A_Pod_3: ["Commons_3", "A_Stair"],
  B_Pod_3: ["Commons_3", "B_Stair"],
  C_Pod_3: ["Commons_3", "C_Stair"],
  Z_Pod_3: ["Commons_3", "Z_Stair", "Natatorium_3"],
  Natatorium_3: ["Z_Pod_3", "CommunityCenter_3"],
  CommunityCenter_3: ["Natatorium_3"],

  A_Stair: ["A_Pod_1", "A_Pod_2", "A_Pod_3"],
  B_Stair: ["B_Pod_1", "B_Pod_2", "B_Pod_3"],
  C_Stair: ["C_Pod_1", "C_Pod_2", "C_Pod_3"],
  Z_Stair: ["Z_Pod_1", "Z_Pod_2", "Z_Pod_3"],
};

// Room → Pod/Floor mapping
export const roomConnections = {
  A101: "A_Pod_1",
  A120: "A_Pod_1",
  A201: "A_Pod_2",
  A245: "A_Pod_2",
  A310: "A_Pod_3",

  B110: "B_Pod_1",
  B210: "B_Pod_2",
  B245: "B_Pod_2",
  B320: "B_Pod_3",

  C115: "C_Pod_1",
  C215: "C_Pod_2",
  C260: "C_Pod_2",
  C305: "C_Pod_3",

  Z105: "Z_Pod_1",
  Z210: "Z_Pod_2",
  Z260: "Z_Pod_2",
  Z310: "Z_Pod_3",
  Z345: "Z_Pod_3",
};
